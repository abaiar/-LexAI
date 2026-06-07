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
from utils.law_utils import extract_law_id, search_relevant_legal_info
from tools.deli_tools import search_law, get_law_detail, search_case
from harness.trace import trace_manager

OUTLINE_PROMPT = """你是一位资深合同起草专家。请根据以下信息，生成一份详细的合同大纲。

合同类型：{contract_name}
合同描述：{contract_desc}

用户填写的合同要素：
{elements_text}

参考大纲结构：{outline_sections}

{law_search_result}

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
    trace_key = f"contract_outline_{template_id}_{id(elements)}"
    trace_manager.start_trace(trace_key, "contract_draft_agent")
    trace_manager.add_step(trace_key, "observe", f"生成合同大纲，模板: {template_id}")

    template = get_template_by_id(template_id)
    if not template:
        trace_manager.end_trace(trace_key)
        return {"outline": "", "error": "模板不存在"}

    if not settings.is_api_key_configured():
        trace_manager.end_trace(trace_key)
        return {"outline": "", "error": "API Key 未配置"}

    law_search_result = await search_relevant_laws(template.name)

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
            "law_search_result": law_search_result,
        })
        trace_manager.add_step(trace_key, "output", "大纲生成完成")
        trace_manager.end_trace(trace_key)
        return {"outline": result, "template_id": template_id}
    except Exception as e:
        fallback_sections = "\n".join(
            f"{'一二三四五六七八九十'[i]}、{s}" for i, s in enumerate(template.outline_sections)
        )
        trace_manager.add_step(trace_key, "think", f"大纲生成失败: {str(e)[:100]}")
        trace_manager.end_trace(trace_key)
        return {"outline": fallback_sections, "template_id": template_id, "error": str(e)}


async def generate_contract_text(
    template_id: str,
    elements: Dict[str, str],
    outline: str,
    law_search_result: str = "",
) -> dict:
    trace_key = f"contract_text_{template_id}_{id(elements)}"
    trace_manager.start_trace(trace_key, "contract_draft_agent")
    trace_manager.add_step(trace_key, "observe", f"生成合同文本，模板: {template_id}")

    template = get_template_by_id(template_id)
    if not template:
        trace_manager.end_trace(trace_key)
        return {"contract_text": "", "error": "模板不存在"}

    if not settings.is_api_key_configured():
        trace_manager.end_trace(trace_key)
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
        trace_manager.add_step(trace_key, "output", "合同文本生成完成")
        trace_manager.end_trace(trace_key)
        return {
            "contract_text": result,
            "template_id": template_id,
            "template_name": template.name,
        }
    except Exception as e:
        trace_manager.add_step(trace_key, "think", f"合同文本生成失败: {str(e)[:100]}")
        trace_manager.end_trace(trace_key)
        return {"contract_text": "", "template_id": template_id, "error": str(e)}


async def search_relevant_laws(keyword: str) -> str:
    results = []
    try:
        result = await search_law.ainvoke({"keyword": keyword})
        if result and "不可用" not in result and "未找到" not in result:
            results.append(f"【法规检索 - {keyword}】\n{result}")
            law_id = extract_law_id(result)
            if law_id:
                try:
                    detail = await get_law_detail.ainvoke({"law_id": law_id})
                    if detail and "不可用" not in detail:
                        results.append(f"【法规详情】\n{detail[:1500]}")
                except Exception:
                    pass
    except Exception:
        pass

    try:
        result = await search_case.ainvoke({"keyword": keyword})
        if result and "不可用" not in result and "未找到" not in result:
            results.append(f"【案例检索 - {keyword}】\n{result[:800]}")
    except Exception:
        pass

    if results:
        return "\n\n相关法规和案例检索结果：\n" + "\n\n".join(results)
    return ""


async def generate_document(
    doc_type: str,
    plaintiff: str,
    defendant: str,
    fact: str,
    demands: str = "",
) -> dict:
    trace_key = f"generate_doc_{doc_type}_{id(fact)}"
    trace_manager.start_trace(trace_key, "contract_draft_agent")
    trace_manager.add_step(trace_key, "observe", f"生成法律文书: {doc_type}")

    if not settings.is_api_key_configured():
        trace_manager.end_trace(trace_key)
        return {
            "document_text": "错误：API Key 未配置。请先前往「账户设置」配置大模型 API Key。",
            "template_used": doc_type,
        }

    llm = _get_llm(temperature=0.5)

    from agents.docgen_agent import DOC_TEMPLATES_LEGACY, DOCGEN_PROMPT

    template_info = DOC_TEMPLATES_LEGACY.get(doc_type, DOC_TEMPLATES_LEGACY["劳动仲裁申请书"])
    prompt_extra = template_info.get("prompt_extra", "")
    current_date = datetime.now().strftime("%Y年%m月%d日")

    law_context = await search_relevant_laws(doc_type)

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
            "law_context": law_context,
        })

        trace_manager.add_step(trace_key, "output", "文书生成完成")
        trace_manager.end_trace(trace_key)

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
        trace_manager.add_step(trace_key, "think", f"文书生成失败，使用模板回退: {str(e)[:100]}")
        trace_manager.end_trace(trace_key)
        return {
            "document_text": fallback,
            "template_used": doc_type,
        }


async def check_document_quality(document_text: str) -> dict:
    trace_key = f"quality_check_{id(document_text)}"
    trace_manager.start_trace(trace_key, "contract_draft_agent")
    trace_manager.add_step(trace_key, "observe", "检查文书质量")

    llm = _get_llm(temperature=0.3)

    from agents.docgen_agent import QUALITY_CHECK_PROMPT

    prompt = ChatPromptTemplate.from_template(QUALITY_CHECK_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({"document": document_text})
        is_qualified = "合格" in result and "问题" not in result.split("合格")[0]
        trace_manager.add_step(trace_key, "output", "质量检查完成")
        trace_manager.end_trace(trace_key)
        return {
            "quality_check": result,
            "is_qualified": is_qualified,
        }
    except Exception:
        trace_manager.end_trace(trace_key)
        return {
            "quality_check": "质量检查服务暂时不可用",
            "is_qualified": True,
        }


async def extract_fields_from_natural_language(
    user_input: str,
    template_id: str,
) -> dict:
    """从自然语言输入中提取合同模板所需字段，并识别缺失项生成追问。"""
    trace_key = f"extract_fields_{template_id}_{id(user_input)}"
    trace_manager.start_trace(trace_key, "contract_draft_agent")
    trace_manager.add_step(trace_key, "observe", f"从自然语言提取字段，模板: {template_id}")

    try:
        from tools.nlu_tools import extract_fields, clarify_missing

        extracted = await extract_fields.ainvoke({
            "user_input": user_input,
            "template_id": template_id,
        })

        import json as _json
        fields = _json.loads(extracted) if isinstance(extracted, str) else extracted

        if fields.get("error"):
            trace_manager.add_step(trace_key, "think", f"字段提取出错: {fields['error']}")
            trace_manager.end_trace(trace_key)
            return {"fields": {}, "missing": [], "questions": [], "error": fields["error"]}

        missing_keys = [k for k, v in fields.items() if v is None or v == ""]

        questions = []
        if missing_keys:
            clarification = await clarify_missing.ainvoke({
                "extracted_fields": extracted,
                "template_id": template_id,
            })
            try:
                clarification_data = _json.loads(clarification) if isinstance(clarification, str) else clarification
                questions = clarification_data.get("questions", [])
            except Exception:
                questions = [f"请提供{k}" for k in missing_keys[:5]]

        trace_manager.add_step(trace_key, "output", f"提取完成，缺失{len(missing_keys)}个字段")
        trace_manager.end_trace(trace_key)

        return {
            "fields": fields,
            "missing": missing_keys,
            "questions": questions,
        }
    except Exception as e:
        trace_manager.add_step(trace_key, "think", f"字段提取失败: {str(e)[:100]}")
        trace_manager.end_trace(trace_key)
        return {"fields": {}, "missing": [], "questions": [], "error": str(e)}
