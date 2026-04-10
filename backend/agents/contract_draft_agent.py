import json
from typing import Dict, List, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from datetime import datetime

from config import settings
from agents.contract_templates import (
    ContractTemplate,
    CONTRACT_TEMPLATES,
    get_template_by_id,
    template_to_dict,
)

OUTLINE_PROMPT = """你是一位资深合同起草专家。请根据以下信息，生成一份详细的合同大纲。

合同类型：{contract_name}
合同描述：{contract_desc}

用户填写的合同要素：
{elements_text}

参考大纲结构：{outline_sections}

要求：
1. 基于用户提供的信息，生成详细的合同大纲
2. 大纲应包含各主要条款的要点说明
3. 每个条款下应列出关键要素和注意事项
4. 大纲应体现合同的核心权利义务关系
5. 引用相关法律依据：{law_refs}
6. 以结构化格式输出，使用"一、二、三..."编号

请直接输出合同大纲，不要添加额外说明。"""

CONTRACT_GENERATE_PROMPT = """你是一位资深合同起草专家。请根据以下合同大纲和要素信息，生成一份完整、专业的合同文本。

合同类型：{contract_name}
合同描述：{contract_desc}

用户填写的合同要素：
{elements_text}

合同大纲：
{outline}

相关法律依据：{law_refs}
{law_search_result}

要求：
1. 严格按照大纲结构，逐条生成完整的合同条款
2. 条款内容应具体、明确、可执行，避免模糊表述
3. 根据要素信息填充具体内容，缺失信息用"XXX"标注
4. 引用相关法律条文作为依据
5. 确保合同双方权利义务对等、逻辑清晰
6. 使用专业法律用语，格式规范
7. 包含签署栏（双方签章、日期等）
8. 当前日期：{date}

请直接输出完整的合同文本，不要添加额外说明。"""

CONTRACT_REFINE_PROMPT = """你是一位资深合同审查专家。请对以下合同文本进行优化完善：

{contract_text}

优化要求：
1. 补充可能遗漏的重要条款
2. 完善用"XXX"标注的缺失信息（如无法确定则保留）
3. 优化条款表述，使其更加严谨、专业
4. 确保法条引用准确
5. 检查逻辑一致性

请直接输出优化后的完整合同文本。"""


def _get_llm(temperature: float = 0.5) -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.get_active_model(),
        openai_api_key=settings.get_active_api_key(),
        openai_api_base=settings.get_active_base_url(),
        temperature=temperature,
    )


def _format_elements(template: ContractTemplate, elements: Dict[str, str]) -> str:
    lines = []
    for field in template.fields:
        value = elements.get(field.key, "")
        if value:
            lines.append(f"- {field.label}：{value}")
        else:
            lines.append(f"- {field.label}：未填写")
    return "\n".join(lines)


async def generate_contract_outline(
    template_id: str,
    elements: Dict[str, str],
) -> dict:
    template = get_template_by_id(template_id)
    if not template:
        return {"outline": "", "error": "模板不存在"}

    if not settings.is_api_key_configured():
        return {"outline": "", "error": "API Key 未配置"}

    llm = _get_llm(temperature=0.5)
    elements_text = _format_elements(template, elements)
    outline_sections = "、".join(template.outline_sections)
    law_refs = "、".join(template.law_references)

    prompt = ChatPromptTemplate.from_template(OUTLINE_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({
            "contract_name": template.name,
            "contract_desc": template.description,
            "elements_text": elements_text,
            "outline_sections": outline_sections,
            "law_refs": law_refs,
        })
        return {"outline": result, "template_id": template_id}
    except Exception as e:
        fallback_sections = "\n".join(
            f"{'一二三四五六七八九十'[i]}、{s}" for i, s in enumerate(template.outline_sections)
        )
        return {"outline": fallback_sections, "template_id": template_id, "error": str(e)}


async def generate_contract_text(
    template_id: str,
    elements: Dict[str, str],
    outline: str,
    law_search_result: str = "",
) -> dict:
    template = get_template_by_id(template_id)
    if not template:
        return {"contract_text": "", "error": "模板不存在"}

    if not settings.is_api_key_configured():
        return {"contract_text": "", "error": "API Key 未配置"}

    llm = _get_llm(temperature=0.3)
    elements_text = _format_elements(template, elements)
    law_refs = "、".join(template.law_references)
    current_date = datetime.now().strftime("%Y年%m月%d日")

    prompt = ChatPromptTemplate.from_template(CONTRACT_GENERATE_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({
            "contract_name": template.name,
            "contract_desc": template.description,
            "elements_text": elements_text,
            "outline": outline,
            "law_refs": law_refs,
            "law_search_result": law_search_result,
            "date": current_date,
        })
        return {
            "contract_text": result,
            "template_id": template_id,
            "template_name": template.name,
        }
    except Exception as e:
        return {"contract_text": "", "template_id": template_id, "error": str(e)}


async def search_relevant_laws(keyword: str) -> str:
    try:
        from tools.deli_law_tool import search_law
        result = await search_law.ainvoke({"keyword": keyword})
        return f"\n\n相关法规检索结果：\n{result}"
    except Exception:
        return ""


async def generate_document(
    doc_type: str,
    plaintiff: str,
    defendant: str,
    fact: str,
    demands: str = "",
) -> dict:
    if not settings.is_api_key_configured():
        return {
            "document_text": "错误：API Key 未配置。请先前往「账户设置」配置大模型 API Key。",
            "template_used": doc_type,
        }

    llm = _get_llm(temperature=0.5)

    from agents.docgen_agent import DOC_TEMPLATES, DOCGEN_PROMPT

    template_info = DOC_TEMPLATES.get(doc_type, DOC_TEMPLATES["劳动仲裁申请书"])
    prompt_extra = template_info.get("prompt_extra", "")
    current_date = datetime.now().strftime("%Y年%m月%d日")

    prompt = ChatPromptTemplate.from_template(DOCGEN_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({
            "doc_type": doc_type,
            "prompt_extra": prompt_extra,
            "plaintiff": plaintiff,
            "defendant": defendant,
            "fact": fact,
            "demands": demands or "由AI根据案情自动生成",
            "date": current_date,
        })

        return {
            "document_text": result,
            "template_used": doc_type,
        }
    except Exception as e:
        fallback = template_info["template"].format(
            plaintiff=plaintiff,
            defendant=defendant,
            fact_expanded=fact,
            demands=demands or "由AI根据案情生成",
            city="XXX市",
            date=current_date,
        )
        return {
            "document_text": fallback,
            "template_used": doc_type,
        }


async def check_document_quality(document_text: str) -> dict:
    llm = _get_llm(temperature=0.3)

    from agents.docgen_agent import QUALITY_CHECK_PROMPT

    prompt = ChatPromptTemplate.from_template(QUALITY_CHECK_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({"document": document_text})
        is_qualified = "合格" in result and "问题" not in result.split("合格")[0]
        return {
            "quality_check": result,
            "is_qualified": is_qualified,
        }
    except Exception:
        return {
            "quality_check": "质量检查服务暂时不可用",
            "is_qualified": True,
        }
