import json
import difflib
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser

from config import settings
from utils.law_utils import parse_json_result, search_relevant_legal_info
from tools.deli_tools import search_law, get_law_detail, search_case
from harness.trace import trace_manager


CONTRACT_COMPARE_PROMPT = """你是一位资深合同审查专家，擅长对比分析合同版本差异。请对以下两份合同文本进行详细的语义级别差异分析。

原始合同文本：
{original_text}

新合同/修订版文本：
{revised_text}

你可以使用以下工具来检索相关法规和案例：
- search_law: 搜索相关法律法规
- get_law_detail: 获取法规全文
- search_case: 搜索相似案例

请根据合同内容自主决定是否需要调用工具检索法规。

请从以下维度进行对比分析：
1. 逐条对比两份合同的条款，识别所有差异
2. 对每个差异进行分类：新增条款、删除条款、修改条款
3. 分析每个修改条款的具体变更内容（旧内容 → 新内容）
4. 评估每个变更的法律影响和风险等级，引用相关法规作为依据
5. 给出整体变更摘要

请严格按照以下JSON格式输出，不要输出其他内容：
{{
    "diff_items": [
        {{
            "type": "added|deleted|modified",
            "clause_title": "条款标题或位置描述",
            "original_content": "原始合同中的内容",
            "revised_content": "新合同中的内容",
            "change_description": "变更描述",
            "risk_level": "high|medium|low",
            "legal_impact": "法律影响分析"
        }}
    ],
    "summary": {{
        "total_changes": 0,
        "added_count": 0,
        "deleted_count": 0,
        "modified_count": 0,
        "overall_risk": "high|medium|low",
        "key_changes": ["关键变更1", "关键变更2"],
        "recommendation": "整体建议"
    }}
}}"""


def _get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.get_active_model(),
        openai_api_key=settings.get_active_api_key(),
        openai_api_base=settings.get_active_base_url(),
        temperature=0.2,
    )


async def compare_contracts(original_text: str, revised_text: str) -> dict:
    trace = trace_manager.start_trace(f"contract_compare_{id(original_text)}", "contract_compare_agent")
    trace_manager.add_step(f"contract_compare_{id(original_text)}", "observe", "对比两份合同")

    llm = _get_llm()
    tools = [search_law, get_law_detail, search_case]

    prompt = ChatPromptTemplate.from_messages([
        ("system", CONTRACT_COMPARE_PROMPT),
        ("human", "{input}"),
        MessagesPlaceholder("agent_scratchpad"),
    ])

    try:
        agent = create_tool_calling_agent(llm, tools, prompt)
        executor = AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=True,
            max_iterations=6,
            handle_parsing_errors=True,
        )

        result = await executor.ainvoke({
            "input": f"请对比以下两份合同：\n\n原始合同：\n{original_text[:8000]}\n\n修订版合同：\n{revised_text[:8000]}",
            "original_text": original_text[:8000],
            "revised_text": revised_text[:8000],
        })

        output = result.get("output", "")
        parsed = parse_json_result(output)

        diff_items = parsed.get("diff_items", [])
        summary = parsed.get("summary", {})

        if not summary:
            added = sum(1 for d in diff_items if d.get("type") == "added")
            deleted = sum(1 for d in diff_items if d.get("type") == "deleted")
            modified = sum(1 for d in diff_items if d.get("type") == "modified")
            summary = {
                "total_changes": len(diff_items),
                "added_count": added,
                "deleted_count": deleted,
                "modified_count": modified,
                "overall_risk": "medium",
                "key_changes": [],
                "recommendation": "请仔细审查所有变更内容",
            }

        trace_manager.end_trace(f"contract_compare_{id(original_text)}")
        return {"diff_items": diff_items, "summary": summary}

    except Exception as e:
        trace_manager.add_step(f"contract_compare_{id(original_text)}", "think", f"Agent模式失败，降级为Chain: {str(e)[:100]}")
        try:
            law_context = await search_relevant_legal_info(
                original_text + revised_text,
                default_case_keyword="合同变更纠纷",
                context_label="对比分析",
            )
            chain_prompt = ChatPromptTemplate.from_template(CONTRACT_COMPARE_PROMPT)
            chain = chain_prompt | llm | StrOutputParser()
            result = await chain.ainvoke({
                "original_text": original_text[:8000],
                "revised_text": revised_text[:8000],
                "law_context": law_context,
            })
            parsed = parse_json_result(result)
            trace_manager.end_trace(f"contract_compare_{id(original_text)}")
            return {
                "diff_items": parsed.get("diff_items", []),
                "summary": parsed.get("summary", {}),
            }
        except Exception as chain_err:
            trace_manager.end_trace(f"contract_compare_{id(original_text)}")
            return {
                "diff_items": [],
                "summary": {
                    "total_changes": 0, "added_count": 0, "deleted_count": 0,
                    "modified_count": 0, "overall_risk": "low",
                    "key_changes": [], "recommendation": f"对比失败: {str(chain_err)}",
                },
            }
