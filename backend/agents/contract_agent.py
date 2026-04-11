import json
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from config import settings
from tools.deli_law_tool import search_law, get_law_detail
from tools.deli_case_tool import search_case
from tools.law_parser import parse_law_references


CONTRACT_REVIEW_PROMPT = """你是一位资深合同审查专家。请对以下合同文本进行全面审查，识别风险条款和缺失条款。

审查要求：
1. 逐条扫描合同文本，识别以下风险：
   - 霸王条款（权利义务严重不对等）
   - 模糊表述（可能导致歧义的条款）
   - 违法条款（违反法律法规的条款）
   - 漏洞条款（可能被恶意利用的条款）
2. 检测是否缺失以下必要条款：
   - 保密条款
   - 违约金条款
   - 争议解决条款
   - 不可抗力条款
   - 知识产权条款
   - 合同解除条款
3. 为每个风险条款给出具体修改建议，引用相关法律条文作为依据
4. 给出总体评分（0-100分）

{law_context}

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


def _get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.get_active_model(),
        openai_api_key=settings.get_active_api_key(),
        openai_api_base=settings.get_active_base_url(),
        temperature=0.3,
    )


def _parse_json_result(raw: str) -> dict:
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    start_idx = cleaned.find("{")
    end_idx = cleaned.rfind("}")
    if start_idx != -1 and end_idx != -1:
        cleaned = cleaned[start_idx:end_idx + 1]

    return json.loads(cleaned)


async def _search_relevant_legal_info(contract_text: str) -> str:
    law_refs = parse_law_references(contract_text)
    context_parts = []

    search_keywords = law_refs[:3] if law_refs else ["合同法", "民法典合同编"]

    try:
        law_results = []
        for keyword in search_keywords:
            result = await search_law.ainvoke({"keyword": keyword})
            if result and "不可用" not in result and "未找到" not in result:
                law_results.append(f"【法规检索 - {keyword}】\n{result}")
                law_id = _extract_law_id(result)
                if law_id:
                    try:
                        detail = await get_law_detail.ainvoke({"law_id": law_id})
                        if detail and "不可用" not in detail:
                            law_results.append(f"【法规详情】\n{detail[:1500]}")
                    except Exception:
                        pass

        if law_results:
            context_parts.append("\n\n".join(law_results))
    except Exception:
        pass

    try:
        case_keywords = law_refs[:2] if law_refs else ["合同纠纷"]
        for keyword in case_keywords:
            result = await search_case.ainvoke({"keyword": keyword})
            if result and "不可用" not in result and "未找到" not in result:
                context_parts.append(f"【案例检索 - {keyword}】\n{result[:800]}")
                break
    except Exception:
        pass

    if context_parts:
        return "以下是通过得理API检索到的相关法规和案例，请在审查时参考：\n\n" + "\n\n".join(context_parts)
    return ""


def _extract_law_id(search_result: str) -> str:
    import re
    match = re.search(r'lawId:\s*(\S+)', search_result)
    if match:
        return match.group(1).strip()
    return ""


async def review_contract(contract_text: str) -> dict:
    law_context = await _search_relevant_legal_info(contract_text)

    llm = _get_llm()
    prompt = ChatPromptTemplate.from_template(CONTRACT_REVIEW_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({
            "contract_text": contract_text,
            "law_context": law_context,
        })
        parsed = _parse_json_result(result)

        return {
            "risk_items": parsed.get("risk_items", []),
            "missing_clauses": parsed.get("missing_clauses", []),
            "summary": parsed.get("summary", "审查完成"),
            "score": parsed.get("score", 70),
        }
    except json.JSONDecodeError as e:
        return {
            "risk_items": [
                {
                    "level": "medium",
                    "clause": "解析异常",
                    "reason": "AI返回格式异常，请重新审查",
                    "suggestion": "请重新提交合同进行审查",
                }
            ],
            "missing_clauses": [],
            "summary": "审查结果解析失败，请重试",
            "score": 50,
        }
    except Exception as e:
        return {
            "risk_items": [],
            "missing_clauses": [],
            "summary": f"审查失败: {str(e)}",
            "score": 0,
        }
