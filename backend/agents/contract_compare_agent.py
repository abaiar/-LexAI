import json
import difflib
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from config import settings


CONTRACT_COMPARE_PROMPT = """你是一位资深合同审查专家，擅长对比分析合同版本差异。请对以下两份合同文本进行详细的语义级别差异分析。

原始合同文本：
{original_text}

新合同/修订版文本：
{revised_text}

请从以下维度进行对比分析：
1. 逐条对比两份合同的条款，识别所有差异
2. 对每个差异进行分类：新增条款、删除条款、修改条款
3. 分析每个修改条款的具体变更内容（旧内容 → 新内容）
4. 评估每个变更的法律影响和风险等级
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


async def compare_contracts(original_text: str, revised_text: str) -> dict:
    llm = _get_llm()
    prompt = ChatPromptTemplate.from_template(CONTRACT_COMPARE_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({
            "original_text": original_text[:8000],
            "revised_text": revised_text[:8000],
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
