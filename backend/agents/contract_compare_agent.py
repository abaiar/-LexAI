import json
import difflib
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from config import settings
from tools.deli_law_tool import search_law, get_law_detail
from tools.deli_case_tool import search_case
from tools.law_parser import parse_law_references


CONTRACT_COMPARE_PROMPT = """你是一位资深合同审查专家，擅长对比分析合同版本差异。请对以下两份合同文本进行详细的语义级别差异分析。

原始合同文本：
{original_text}

新合同/修订版文本：
{revised_text}

{law_context}

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
            "original_content": "原始合同中的内容（删除和修改时填写，新增时为空字符串）",
            "revised_content": "新合同中的内容（新增和修改时填写，删除时为空字符串）",
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


def _text_diff_analysis(original: str, revised: str) -> list:
    original_lines = original.splitlines(keepends=True)
    revised_lines = revised.splitlines(keepends=True)

    diff = list(difflib.unified_diff(original_lines, revised_lines, lineterm=""))
    changes = []
    for line in diff:
        if line.startswith("+") and not line.startswith("+++"):
            changes.append({"type": "added", "content": line[1:].strip()})
        elif line.startswith("-") and not line.startswith("---"):
            changes.append({"type": "deleted", "content": line[1:].strip()})

    return changes


async def _search_relevant_legal_info(original_text: str, revised_text: str) -> str:
    law_refs = parse_law_references(original_text) + parse_law_references(revised_text)
    law_refs = list(dict.fromkeys(law_refs))
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
        case_keywords = law_refs[:2] if law_refs else ["合同变更纠纷"]
        for keyword in case_keywords:
            result = await search_case.ainvoke({"keyword": keyword})
            if result and "不可用" not in result and "未找到" not in result:
                context_parts.append(f"【案例检索 - {keyword}】\n{result[:800]}")
                break
    except Exception:
        pass

    if context_parts:
        return "以下是通过得理API检索到的相关法规和案例，请在对比分析时参考：\n\n" + "\n\n".join(context_parts)
    return ""


def _extract_law_id(search_result: str) -> str:
    import re
    match = re.search(r'lawId:\s*(\S+)', search_result)
    if match:
        return match.group(1).strip()
    return ""


async def compare_contracts(original_text: str, revised_text: str) -> dict:
    law_context = await _search_relevant_legal_info(original_text, revised_text)

    llm = _get_llm()
    prompt = ChatPromptTemplate.from_template(CONTRACT_COMPARE_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({
            "original_text": original_text[:8000],
            "revised_text": revised_text[:8000],
            "law_context": law_context,
        })
        parsed = _parse_json_result(result)

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

        return {
            "diff_items": diff_items,
            "summary": summary,
        }
    except json.JSONDecodeError:
        return {
            "diff_items": [],
            "summary": {
                "total_changes": 0,
                "added_count": 0,
                "deleted_count": 0,
                "modified_count": 0,
                "overall_risk": "low",
                "key_changes": [],
                "recommendation": "对比结果解析失败，请重试",
            },
        }
    except Exception as e:
        return {
            "diff_items": [],
            "summary": {
                "total_changes": 0,
                "added_count": 0,
                "deleted_count": 0,
                "modified_count": 0,
                "overall_risk": "low",
                "key_changes": [],
                "recommendation": f"对比失败: {str(e)}",
            },
        }
