import json
import re
from typing import List, Optional

from tools.law_parser import parse_law_references


def extract_law_id(search_result: str) -> str:
    match = re.search(r'lawId:\s*(\S+)', search_result)
    if match:
        return match.group(1).strip()
    return ""


def parse_json_result(raw: str) -> dict:
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


async def search_relevant_legal_info(
    text: str,
    default_law_keywords: Optional[List[str]] = None,
    default_case_keyword: str = "合同纠纷",
    context_label: str = "审查",
) -> str:
    from tools.deli_tools import search_law, get_law_detail, search_case

    law_refs = parse_law_references(text)
    context_parts = []

    if default_law_keywords is None:
        default_law_keywords = ["合同法", "民法典合同编"]

    search_keywords = law_refs[:3] if law_refs else default_law_keywords

    try:
        law_results = []
        for keyword in search_keywords:
            result = await search_law.ainvoke({"keyword": keyword})
            if result and "不可用" not in result and "未找到" not in result:
                law_results.append(f"【法规检索 - {keyword}】\n{result}")
                law_id = extract_law_id(result)
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
        case_keywords = law_refs[:2] if law_refs else [default_case_keyword]
        for keyword in case_keywords:
            result = await search_case.ainvoke({"keyword": keyword})
            if result and "不可用" not in result and "未找到" not in result:
                context_parts.append(f"【案例检索 - {keyword}】\n{result[:800]}")
                break
    except Exception:
        pass

    if context_parts:
        return f"以下是通过得理API检索到的相关法规和案例，请在{context_label}时参考：\n\n" + "\n\n".join(context_parts)
    return ""
