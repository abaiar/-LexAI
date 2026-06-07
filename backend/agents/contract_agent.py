import json
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser

from config import settings
from utils.law_utils import parse_json_result, search_relevant_legal_info
from tools.deli_tools import search_law, get_law_detail, search_case
from harness.trace import trace_manager
from skills.skill_loader import get_skill


def _get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.get_active_model(),
        openai_api_key=settings.get_active_api_key(),
        openai_api_base=settings.get_active_base_url(),
        temperature=0.3,
    )


def _get_system_prompt() -> str:
    skill = get_skill("contract_review")
    if skill and skill.system_prompt:
        return skill.system_prompt
    return CONTRACT_REVIEW_PROMPT


CONTRACT_REVIEW_PROMPT = """你是一位资深合同审查专家。请对以下合同文本进行全面审查，识别风险条款和缺失条款。

审查要求：
1. 逐条扫描合同文本，识别以下风险：
   - 霸王条款（权利义务严重不对等）
   - 模糊表述（可能导致歧义的条款）
   - 违法条款（违反法律法规的条款）
   - 漏洞条款（可能被恶意利用的条款）
2. 检测是否缺失以下必要条款：
   - 保密条款、违约金条款、争议解决条款、不可抗力条款、知识产权条款、合同解除条款
3. 为每个风险条款给出具体修改建议，引用相关法律条文作为依据
4. 给出总体评分（0-100分）

你可以使用以下工具来检索相关法规和案例：
- search_law: 搜索相关法律法规
- get_law_detail: 获取法规全文
- search_case: 搜索相似案例

请根据合同内容自主决定是否需要调用工具检索法规。如果合同中已明确引用了法律，请精准检索该法律；如果合同内容简单，可能不需要检索所有工具。

请严格按照以下JSON格式输出，不要输出其他内容：
{{
    "risk_items": [
        {{
            "level": "high/medium/low",
            "clause": "原条款文本",
            "reason": "风险原因",
            "suggestion": "修改建议"
        }}
    ],
    "missing_clauses": ["缺失的条款名称"],
    "summary": "审查总结",
    "score": 72
}}

合同文本如下：
{contract_text}"""


async def review_contract(contract_text: str) -> dict:
    trace = trace_manager.start_trace(f"contract_review_{id(contract_text)}", "contract_review_agent")
    trace_manager.add_step(f"contract_review_{id(contract_text)}", "observe", f"审查合同，长度{len(contract_text)}")

    llm = _get_llm()
    tools = [search_law, get_law_detail, search_case]

    prompt = ChatPromptTemplate.from_messages([
        ("system", _get_system_prompt()),
        ("human", "{input}"),
        MessagesPlaceholder("agent_scratchpad"),
    ])

    try:
        agent = create_tool_calling_agent(llm, tools, prompt)
        executor = AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=True,
            max_iterations=8,
            handle_parsing_errors=True,
        )

        result = await executor.ainvoke({
            "input": f"请审查以下合同文本：\n\n{contract_text}",
            "contract_text": contract_text,
        })

        output = result.get("output", "")
        parsed = parse_json_result(output)

        trace_manager.add_step(f"contract_review_{id(contract_text)}", "output", "审查完成")
        trace_manager.end_trace(f"contract_review_{id(contract_text)}")

        return {
            "risk_items": parsed.get("risk_items", []),
            "missing_clauses": parsed.get("missing_clauses", []),
            "summary": parsed.get("summary", "审查完成"),
            "score": parsed.get("score", 70),
        }
    except json.JSONDecodeError:
        trace_manager.end_trace(f"contract_review_{id(contract_text)}")
        return {
            "risk_items": [{"level": "medium", "clause": "解析异常", "reason": "AI返回格式异常，请重新审查", "suggestion": "请重新提交合同进行审查"}],
            "missing_clauses": [],
            "summary": "审查结果解析失败，请重试",
            "score": 50,
        }
    except Exception as e:
        # Fallback to Chain mode if agent fails
        trace_manager.add_step(f"contract_review_{id(contract_text)}", "think", f"Agent模式失败，降级为Chain: {str(e)[:100]}")
        try:
            law_context = await search_relevant_legal_info(contract_text, context_label="审查")
            chain_prompt = ChatPromptTemplate.from_template(CONTRACT_REVIEW_PROMPT)
            chain = chain_prompt | llm | StrOutputParser()
            result = await chain.ainvoke({
                "contract_text": contract_text,
                "law_context": law_context,
            })
            parsed = parse_json_result(result)
            trace_manager.end_trace(f"contract_review_{id(contract_text)}")
            return {
                "risk_items": parsed.get("risk_items", []),
                "missing_clauses": parsed.get("missing_clauses", []),
                "summary": parsed.get("summary", "审查完成"),
                "score": parsed.get("score", 70),
            }
        except Exception as chain_err:
            trace_manager.end_trace(f"contract_review_{id(contract_text)}")
            return {
                "risk_items": [],
                "missing_clauses": [],
                "summary": f"审查失败: {str(chain_err)}",
                "score": 0,
            }
