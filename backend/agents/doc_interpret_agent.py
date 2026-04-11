import json
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from config import settings
from tools.deli_law_tool import search_law, get_law_detail
from tools.deli_case_tool import search_case
from tools.law_parser import parse_law_references


DOC_INTERPRET_PROMPT = """你是一位资深法律文书解读专家，擅长将复杂的法律文书转化为普通人容易理解的语言。请对以下法律文书文本进行全面的智能解读分析。

法律文书文本：
{doc_text}

{law_context}

请从以下维度进行解读：

1. **文书概要**：简要概括该法律文书的核心内容和目的
2. **关键条款解读**：逐条解读文书中的关键条款，用通俗易懂的语言解释其法律含义
3. **权利义务分析**：明确各方当事人的权利和义务
4. **风险提示**：指出文书中可能存在的风险点或不利条款
5. **重要期限**：识别文书中的关键时间节点和期限要求
6. **专业术语解释**：解释文书中的法律专业术语
7. **行动建议**：给出针对该文书的实用建议

请严格按照以下JSON格式输出，不要输出其他内容：
{{
    "summary": "文书概要（100-200字）",
    "document_type": "文书类型（如：合同、判决书、起诉状、协议书等）",
    "parties": ["当事人列表"],
    "key_clauses": [
        {{
            "clause_title": "条款标题/编号",
            "original_text": "原文关键内容（摘要）",
            "interpretation": "通俗易懂的解读",
            "legal_significance": "法律意义",
            "risk_level": "high/medium/low/none"
        }}
    ],
    "rights_obligations": [
        {{
            "party": "当事人名称",
            "rights": ["权利1", "权利2"],
            "obligations": ["义务1", "义务2"]
        }}
    ],
    "risk_warnings": [
        {{
            "risk_title": "风险标题",
            "description": "风险描述",
            "severity": "high/medium/low",
            "suggestion": "应对建议"
        }}
    ],
    "key_deadlines": [
        {{
            "deadline_desc": "期限描述",
            "date_or_period": "具体日期或期限",
            "consequence": "逾期后果"
        }}
    ],
    "legal_terms": [
        {{
            "term": "专业术语",
            "definition": "通俗解释"
        }}
    ],
    "action_suggestions": [
        "建议1",
        "建议2"
    ],
    "overall_assessment": "总体评价（100-150字）",
    "difficulty_level": "complex/moderate/simple",
    "interpretation_score": 85
}}"""


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


async def _search_relevant_legal_info(doc_text: str) -> str:
    law_refs = parse_law_references(doc_text)
    context_parts = []

    search_keywords = law_refs[:3] if law_refs else ["民法典", "合同法"]

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
        return "以下是通过得理API检索到的相关法规和案例，请在解读时参考：\n\n" + "\n\n".join(context_parts)
    return ""


def _extract_law_id(search_result: str) -> str:
    import re
    match = re.search(r'lawId:\s*(\S+)', search_result)
    if match:
        return match.group(1).strip()
    return ""


async def interpret_document(doc_text: str) -> dict:
    law_context = await _search_relevant_legal_info(doc_text)

    llm = _get_llm()
    prompt = ChatPromptTemplate.from_template(DOC_INTERPRET_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({
            "doc_text": doc_text[:15000],
            "law_context": law_context,
        })
        parsed = _parse_json_result(result)

        return {
            "summary": parsed.get("summary", ""),
            "document_type": parsed.get("document_type", "法律文书"),
            "parties": parsed.get("parties", []),
            "key_clauses": parsed.get("key_clauses", []),
            "rights_obligations": parsed.get("rights_obligations", []),
            "risk_warnings": parsed.get("risk_warnings", []),
            "key_deadlines": parsed.get("key_deadlines", []),
            "legal_terms": parsed.get("legal_terms", []),
            "action_suggestions": parsed.get("action_suggestions", []),
            "overall_assessment": parsed.get("overall_assessment", ""),
            "difficulty_level": parsed.get("difficulty_level", "moderate"),
            "interpretation_score": parsed.get("interpretation_score", 70),
        }
    except json.JSONDecodeError:
        return {
            "summary": "解读结果解析失败，请重试",
            "document_type": "法律文书",
            "parties": [],
            "key_clauses": [],
            "rights_obligations": [],
            "risk_warnings": [],
            "key_deadlines": [],
            "legal_terms": [],
            "action_suggestions": ["请重新提交文书进行解读"],
            "overall_assessment": "解读结果解析失败，AI返回格式异常",
            "difficulty_level": "moderate",
            "interpretation_score": 50,
        }
    except Exception as e:
        return {
            "summary": f"解读失败: {str(e)}",
            "document_type": "法律文书",
            "parties": [],
            "key_clauses": [],
            "rights_obligations": [],
            "risk_warnings": [],
            "key_deadlines": [],
            "legal_terms": [],
            "action_suggestions": [],
            "overall_assessment": f"解读过程出错: {str(e)}",
            "difficulty_level": "moderate",
            "interpretation_score": 0,
        }
