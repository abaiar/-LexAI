import json
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from config import settings


PROOFREAD_PROMPT = """你是一位专业的中文文档校对专家，擅长识别和修正各类文档中的语言错误。请对以下文档文本进行全面的校对检查，识别所有语法错误、拼写错误、标点符号使用不当、语句不通顺等问题。

文档文本：
{text}

请从以下维度进行校对：
1. 语法错误：主谓不一致、语序不当、成分残缺或多余等
2. 拼写错误：错别字、同音字混用、形近字误用等
3. 标点符号：标点使用不当、缺失标点、中英文标点混用等
4. 语句通顺：语义不清、逻辑混乱、表达冗余等
5. 用词规范：用词不当、搭配不当、口语化表达等

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


async def proofread_text(text: str) -> dict:
    llm = _get_llm()
    prompt = ChatPromptTemplate.from_template(PROOFREAD_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({
            "text": text[:10000],
        })
        parsed = _parse_json_result(result)

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

        return {
            "errors": errors,
            "summary": summary,
        }
    except json.JSONDecodeError:
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
                "recommendation": f"校对失败: {str(e)}",
            },
        }
