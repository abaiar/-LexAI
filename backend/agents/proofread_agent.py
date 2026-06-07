import json
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser

from config import settings
from utils.law_utils import parse_json_result, search_relevant_legal_info
from tools.deli_tools import search_law, get_law_detail, search_case
from harness.trace import trace_manager


PROOFREAD_PROMPT = """你是一位专业的中文文档校对专家，擅长识别和修正各类文档中的语言错误。请对以下文档文本进行全面的校对检查，识别所有语法错误、拼写错误、标点符号使用不当、语句不通顺等问题。

文档文本：
{text}

你可以使用以下工具来检索相关法规和案例：
- search_law: 搜索相关法律法规
- get_law_detail: 获取法规全文
- search_case: 搜索相似案例

请根据文档内容自主决定是否需要调用工具检索法规，主要用于校对法律术语的准确性。

请从以下维度进行校对：
1. 语法错误：主谓不一致、语序不当、成分残缺或多余等
2. 拼写错误：错别字、同音字混用、形近字误用等
3. 标点符号：标点使用不当、缺失标点、中英文标点混用等
4. 语句通顺：语义不清、逻辑混乱、表达冗余等
5. 用词规范：用词不当、搭配不当、口语化表达等
6. 法律术语：法律专业术语使用是否准确规范

对每个错误，请提供：
- 错误的原始文本
- 错误类型分类
- 修正建议
- 修正后的文本

请严格按照以下JSON格式输出，不要输出其他内容：
{{
    "errors": [
        {{
            "id": 1,
            "original_text": "原文中的错误片段",
            "error_type": "grammar|spelling|punctuation|fluency|wording",
            "error_description": "错误描述",
            "suggestion": "修正建议",
            "corrected_text": "修正后的文本",
            "severity": "high|medium|low",
            "position_hint": "错误位置提示（如：第X段/第X行附近）"
        }}
    ],
    "summary": {{
        "total_errors": 0,
        "grammar_count": 0,
        "spelling_count": 0,
        "punctuation_count": 0,
        "fluency_count": 0,
        "wording_count": 0,
        "high_severity_count": 0,
        "medium_severity_count": 0,
        "low_severity_count": 0,
        "overall_quality": "excellent|good|fair|poor",
        "corrected_text": "全文修正后的完整文本",
        "recommendation": "整体修改建议"
    }}
}}"""


def _get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.get_active_model(),
        openai_api_key=settings.get_active_api_key(),
        openai_api_base=settings.get_active_base_url(),
        temperature=0.1,
    )


async def proofread_text(text: str) -> dict:
    trace = trace_manager.start_trace(f"proofread_{id(text)}", "proofread_agent")
    trace_manager.add_step(f"proofread_{id(text)}", "observe", f"校对文本，长度{len(text)}")

    llm = _get_llm()
    tools = [search_law, get_law_detail, search_case]

    prompt = ChatPromptTemplate.from_messages([
        ("system", PROOFREAD_PROMPT),
        ("human", "{input}"),
        MessagesPlaceholder("agent_scratchpad"),
    ])

    try:
        agent = create_tool_calling_agent(llm, tools, prompt)
        executor = AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=True,
            max_iterations=4,
            handle_parsing_errors=True,
        )

        result = await executor.ainvoke({
            "input": f"请校对以下文档：\n\n{text[:10000]}",
            "text": text[:10000],
        })

        output = result.get("output", "")
        parsed = parse_json_result(output)

        errors = parsed.get("errors", [])
        summary = parsed.get("summary", {})

        if not summary:
            grammar_count = sum(1 for e in errors if e.get("error_type") == "grammar")
            spelling_count = sum(1 for e in errors if e.get("error_type") == "spelling")
            punctuation_count = sum(1 for e in errors if e.get("error_type") == "punctuation")
            fluency_count = sum(1 for e in errors if e.get("error_type") == "fluency")
            wording_count = sum(1 for e in errors if e.get("error_type") == "wording")
            high_count = sum(1 for e in errors if e.get("severity") == "high")
            medium_count = sum(1 for e in errors if e.get("severity") == "medium")
            low_count = sum(1 for e in errors if e.get("severity") == "low")

            overall = "poor" if high_count > 3 else "fair" if high_count > 0 or medium_count > 3 else "good" if medium_count > 0 or low_count > 3 else "excellent"

            summary = {
                "total_errors": len(errors),
                "grammar_count": grammar_count,
                "spelling_count": spelling_count,
                "punctuation_count": punctuation_count,
                "fluency_count": fluency_count,
                "wording_count": wording_count,
                "high_severity_count": high_count,
                "medium_severity_count": medium_count,
                "low_severity_count": low_count,
                "overall_quality": overall,
                "corrected_text": text,
                "recommendation": "请仔细审查所有标注的错误",
            }

        trace_manager.add_step(f"proofread_{id(text)}", "output", "校对完成")
        trace_manager.end_trace(f"proofread_{id(text)}")

        return {
            "errors": errors,
            "summary": summary,
        }
    except json.JSONDecodeError:
        trace_manager.end_trace(f"proofread_{id(text)}")
        return {
            "errors": [],
            "summary": {
                "total_errors": 0,
                "grammar_count": 0,
                "spelling_count": 0,
                "punctuation_count": 0,
                "fluency_count": 0,
                "wording_count": 0,
                "high_severity_count": 0,
                "medium_severity_count": 0,
                "low_severity_count": 0,
                "overall_quality": "good",
                "corrected_text": text,
                "recommendation": "校对结果解析失败，请重试",
            },
        }
    except Exception as e:
        trace_manager.add_step(f"proofread_{id(text)}", "think", f"Agent模式失败，降级为Chain: {str(e)[:100]}")
        try:
            law_context = await search_relevant_legal_info(
                text,
                default_law_keywords=["民法典"],
                default_case_keyword="合同纠纷",
                context_label="校对",
            )
            chain_prompt = ChatPromptTemplate.from_template(PROOFREAD_PROMPT)
            chain = chain_prompt | llm | StrOutputParser()
            result = await chain.ainvoke({
                "text": text[:10000],
                "law_context": law_context,
            })
            parsed = parse_json_result(result)
            errors = parsed.get("errors", [])
            summary = parsed.get("summary", {})
            trace_manager.end_trace(f"proofread_{id(text)}")
            return {
                "errors": errors,
                "summary": summary,
            }
        except Exception as chain_err:
            trace_manager.end_trace(f"proofread_{id(text)}")
            return {
                "errors": [],
                "summary": {
                    "total_errors": 0,
                    "grammar_count": 0,
                    "spelling_count": 0,
                    "punctuation_count": 0,
                    "fluency_count": 0,
                    "wording_count": 0,
                    "high_severity_count": 0,
                    "medium_severity_count": 0,
                    "low_severity_count": 0,
                    "overall_quality": "good",
                    "corrected_text": text,
                    "recommendation": f"校对失败: {str(chain_err)}",
                },
            }
