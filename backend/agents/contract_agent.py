import json
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from config import settings


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
3. 为每个风险条款给出具体修改建议
4. 给出总体评分（0-100分）

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


async def review_contract(contract_text: str) -> dict:
    llm = _get_llm()
    prompt = ChatPromptTemplate.from_template(CONTRACT_REVIEW_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({"contract_text": contract_text})
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
