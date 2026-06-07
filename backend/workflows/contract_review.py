import json
from typing import Dict, List, TypedDict, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from config import settings
from utils.law_utils import parse_json_result, search_relevant_legal_info
from tools.deli_tools import search_law, get_law_detail, search_case
from harness.trace import trace_manager


class ReviewState(TypedDict, total=False):
    contract_text: str
    contract_type: str
    complexity: str
    review_dimensions: List[str]
    completeness_result: Optional[dict]
    compliance_result: Optional[dict]
    risk_result: Optional[dict]
    final_report: Optional[dict]


def _get_llm(temperature: float = 0.3) -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.get_active_model(),
        openai_api_key=settings.get_active_api_key(),
        openai_api_base=settings.get_active_base_url(),
        temperature=temperature,
    )


PLANNER_PROMPT = """你是一位合同审查规划专家。请分析以下合同，判断其类型和复杂度，并决定需要进行哪些维度的专项审查。

合同文本：
{contract_text}

请输出JSON格式：
{{
    "contract_type": "合同类型（如：租赁合同、劳动合同、买卖合同等）",
    "complexity": "simple/moderate/complex",
    "review_dimensions": ["completeness", "compliance", "risk"]
}}

复杂度判断标准：
- simple: 简短合同（<1000字），条款少于5条 → 只需 completeness + risk
- moderate: 中等合同（1000-3000字），有标准条款 → completeness + compliance + risk
- complex: 复杂合同（>3000字），涉及多方/多领域 → completeness + compliance + risk（全部维度）

只输出JSON，不要其他内容。"""


COMPLETENESS_PROMPT = """你是一位合同条款完整性审查专家。请检查以下合同是否缺失必要条款。

合同类型：{contract_type}
合同文本：
{contract_text}

{law_context}

请检查以下必要条款是否存在：
1. 当事人信息条款
2. 标的条款
3. 价款/报酬条款
4. 履行期限和方式条款
5. 违约责任条款
6. 争议解决条款
7. 保密条款（如适用）
8. 不可抗力条款
9. 合同解除条款
10. 知识产权条款（如适用）

请输出JSON格式：
{{
    "dimension": "completeness",
    "missing_clauses": [
        {{
            "clause_name": "缺失条款名称",
            "importance": "high/medium/low",
            "suggestion": "建议补充的内容"
        }}
    ],
    "existing_clauses": ["已存在的条款名称"],
    "completeness_score": 75
}}"""


COMPLIANCE_PROMPT = """你是一位法律合规审查专家。请检查以下合同条款是否符合相关法律法规。

合同类型：{contract_type}
合同文本：
{contract_text}

{law_context}

请逐条检查合同条款的法律合规性，引用具体法律条文。

请输出JSON格式：
{{
    "dimension": "compliance",
    "compliance_issues": [
        {{
            "clause": "相关条款原文",
            "law_reference": "违反的法律条文",
            "issue": "合规问题描述",
            "severity": "high/medium/low",
            "suggestion": "修改建议"
        }}
    ],
    "compliance_score": 80
}}"""


RISK_PROMPT = """你是一位合同风险识别专家。请识别以下合同中对各方不利的风险条款。

合同类型：{contract_type}
合同文本：
{contract_text}

{law_context}

请识别以下类型的风险：
1. 霸王条款（权利义务严重不对等）
2. 模糊表述（可能导致歧义）
3. 漏洞条款（可能被恶意利用）
4. 不合理限制条款

请输出JSON格式：
{{
    "dimension": "risk",
    "risk_items": [
        {{
            "level": "high/medium/low",
            "clause": "原条款文本",
            "risk_type": "霸王条款/模糊表述/漏洞条款/不合理限制",
            "reason": "风险原因",
            "suggestion": "修改建议"
        }}
    ],
    "risk_score": 65
}}"""


REVIEWER_PROMPT = """你是一位资深合同审查汇总专家。请汇总以下多个维度的专项审查结果，生成最终的合同审查报告。

合同类型：{contract_type}
合同复杂度：{complexity}

完整性审查结果：
{completeness_result}

合规审查结果：
{compliance_result}

风险识别结果：
{risk_result}

请汇总以上结果，去重、按风险等级排序，生成最终报告。

请输出JSON格式：
{{
    "risk_items": [
        {{
            "level": "high/medium/low",
            "clause": "原条款文本",
            "reason": "风险原因",
            "suggestion": "修改建议",
            "dimension": "completeness/compliance/risk"
        }}
    ],
    "missing_clauses": ["缺失的条款名称"],
    "summary": "审查总结",
    "score": 72,
    "dimension_scores": {{
        "completeness": 75,
        "compliance": 80,
        "risk": 65
    }}
}}"""


async def plan_review(contract_text: str) -> dict:
    llm = _get_llm(temperature=0.1)
    prompt = ChatPromptTemplate.from_template(PLANNER_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({"contract_text": contract_text[:5000]})
        return parse_json_result(result)
    except Exception:
        text_len = len(contract_text)
        if text_len < 1000:
            return {
                "contract_type": "通用合同",
                "complexity": "simple",
                "review_dimensions": ["completeness", "risk"],
            }
        elif text_len < 3000:
            return {
                "contract_type": "通用合同",
                "complexity": "moderate",
                "review_dimensions": ["completeness", "compliance", "risk"],
            }
        else:
            return {
                "contract_type": "通用合同",
                "complexity": "complex",
                "review_dimensions": ["completeness", "compliance", "risk"],
            }


async def execute_completeness_review(contract_text: str, contract_type: str, law_context: str) -> dict:
    llm = _get_llm(temperature=0.2)
    prompt = ChatPromptTemplate.from_template(COMPLETENESS_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({
            "contract_text": contract_text[:8000],
            "contract_type": contract_type,
            "law_context": law_context,
        })
        return parse_json_result(result)
    except Exception:
        return {"dimension": "completeness", "missing_clauses": [], "existing_clauses": [], "completeness_score": 70}


async def execute_compliance_review(contract_text: str, contract_type: str, law_context: str) -> dict:
    llm = _get_llm(temperature=0.2)
    prompt = ChatPromptTemplate.from_template(COMPLIANCE_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({
            "contract_text": contract_text[:8000],
            "contract_type": contract_type,
            "law_context": law_context,
        })
        return parse_json_result(result)
    except Exception:
        return {"dimension": "compliance", "compliance_issues": [], "compliance_score": 75}


async def execute_risk_review(contract_text: str, contract_type: str, law_context: str) -> dict:
    llm = _get_llm(temperature=0.2)
    prompt = ChatPromptTemplate.from_template(RISK_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({
            "contract_text": contract_text[:8000],
            "contract_type": contract_type,
            "law_context": law_context,
        })
        return parse_json_result(result)
    except Exception:
        return {"dimension": "risk", "risk_items": [], "risk_score": 70}


async def aggregate_review(
    contract_type: str,
    complexity: str,
    completeness_result: dict,
    compliance_result: dict,
    risk_result: dict,
) -> dict:
    llm = _get_llm(temperature=0.3)
    prompt = ChatPromptTemplate.from_template(REVIEWER_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({
            "contract_type": contract_type,
            "complexity": complexity,
            "completeness_result": json.dumps(completeness_result, ensure_ascii=False),
            "compliance_result": json.dumps(compliance_result, ensure_ascii=False),
            "risk_result": json.dumps(risk_result, ensure_ascii=False),
        })
        return parse_json_result(result)
    except Exception:
        all_risks = []
        for result in [completeness_result, compliance_result, risk_result]:
            if isinstance(result, dict):
                items = result.get("risk_items", result.get("compliance_issues", result.get("missing_clauses", [])))
                all_risks.extend(items if isinstance(items, list) else [])

        missing = completeness_result.get("missing_clauses", []) if isinstance(completeness_result, dict) else []
        if isinstance(missing, list) and missing and isinstance(missing[0], dict):
            missing = [m.get("clause_name", str(m)) for m in missing]

        return {
            "risk_items": all_risks,
            "missing_clauses": missing,
            "summary": "多维度审查完成",
            "score": 70,
            "dimension_scores": {
                "completeness": completeness_result.get("completeness_score", 70) if isinstance(completeness_result, dict) else 70,
                "compliance": compliance_result.get("compliance_score", 75) if isinstance(compliance_result, dict) else 75,
                "risk": risk_result.get("risk_score", 70) if isinstance(risk_result, dict) else 70,
            },
        }


async def collaborative_review(contract_text: str) -> dict:
    trace = trace_manager.start_trace(f"collab_review_{id(contract_text)}", "collaborative_review")
    trace_manager.add_step(f"collab_review_{id(contract_text)}", "observe", f"多Agent协作审查，合同长度{len(contract_text)}")

    plan = await plan_review(contract_text)
    contract_type = plan.get("contract_type", "通用合同")
    complexity = plan.get("complexity", "moderate")
    dimensions = plan.get("review_dimensions", ["completeness", "compliance", "risk"])

    trace_manager.add_step(f"collab_review_{id(contract_text)}", "think", f"规划完成: 类型={contract_type}, 复杂度={complexity}, 维度={dimensions}")

    law_context = await search_relevant_legal_info(contract_text, context_label="审查")

    completeness_result = {}
    compliance_result = {}
    risk_result = {}

    import asyncio

    async def run_completeness():
        return await execute_completeness_review(contract_text, contract_type, law_context)

    async def run_compliance():
        return await execute_compliance_review(contract_text, contract_type, law_context)

    async def run_risk():
        return await execute_risk_review(contract_text, contract_type, law_context)

    tasks = []
    if "completeness" in dimensions:
        tasks.append(("completeness", run_completeness()))
    if "compliance" in dimensions:
        tasks.append(("compliance", run_compliance()))
    if "risk" in dimensions:
        tasks.append(("risk", run_risk()))

    results = await asyncio.gather(*[t[1] for t in tasks], return_exceptions=True)

    for i, (dim, _) in enumerate(tasks):
        r = results[i]
        if isinstance(r, Exception):
            r = {}
        if dim == "completeness":
            completeness_result = r
        elif dim == "compliance":
            compliance_result = r
        elif dim == "risk":
            risk_result = r

    trace_manager.add_step(f"collab_review_{id(contract_text)}", "act", f"专项审查完成: {len(tasks)}个维度")

    final = await aggregate_review(contract_type, complexity, completeness_result, compliance_result, risk_result)

    trace_manager.add_step(f"collab_review_{id(contract_text)}", "output", "协作审查报告生成完成")
    trace_manager.end_trace(f"collab_review_{id(contract_text)}")

    return final
