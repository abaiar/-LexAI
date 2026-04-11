from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from datetime import datetime
from typing import Dict

from config import settings
from agents.docgen_templates import DocTemplate, get_doc_template_by_id
from tools.deli_law_tool import search_law, get_law_detail
from tools.deli_case_tool import search_case


DOC_TEMPLATES_LEGACY = {
    "劳动仲裁申请书": {
        "template": """劳动争议仲裁申请书

申请人：{plaintiff}
被申请人：{defendant}

仲裁请求：
{demands}

事实与理由：
{fact_expanded}

此致
{city}劳动人事争议仲裁委员会

申请人：{plaintiff}
日期：{date}""",
        "prompt_extra": "请生成劳动仲裁申请书，注意引用《劳动法》《劳动合同法》《劳动争议调解仲裁法》相关条文。仲裁请求应当明确具体，事实与理由应当详实完整。"
    },
    "民事起诉状": {
        "template": """民事起诉状

原告：{plaintiff}
被告：{defendant}

诉讼请求：
{demands}

事实与理由：
{fact_expanded}

证据清单：
（由AI根据案情自动列举建议）

此致
{city}人民法院

起诉人：{plaintiff}
日期：{date}""",
        "prompt_extra": "请生成民事起诉状，注意引用《民事诉讼法》相关条文。诉讼请求应当明确具体，事实与理由应当条理清晰。"
    },
    "律师函": {
        "template": """律师函

致：{defendant}

发函人：{plaintiff}委托律师

关于：{demands}

{fact_expanded}

基于上述事实，本律师受{plaintiff}委托，特函告如下：
请贵方在收到本函之日起15日内，妥善处理上述事宜。逾期未处理，委托人将依法采取进一步法律措施，届时产生的一切法律后果由贵方承担。

此致

律师：XXX
律师事务所：XXX
日期：{date}""",
        "prompt_extra": "请生成律师函，语气应当严肃正式，明确法律后果。引用相关法律条文增强说服力。"
    },
    "离婚协议书": {
        "template": """离婚协议书

男方：{plaintiff}
女方：{defendant}

双方因感情确已破裂，自愿协议离婚，并就以下事项达成一致：

一、自愿离婚
双方自愿解除婚姻关系。

二、子女抚养
{fact_expanded}

三、财产分割
（由AI根据案情补充）

四、债务处理
（由AI根据案情补充）

五、其他约定
（由AI根据案情补充）

本协议一式三份，双方各执一份，婚姻登记机关存档一份，自双方签字并办理离婚登记之日起生效。

男方签字：              女方签字：
日期：{date}            日期：{date}""",
        "prompt_extra": "请生成离婚协议书，注意涉及子女抚养、财产分割、债务处理等核心条款。引用《民法典》婚姻家庭编相关条文。"
    }
}


DOCGEN_PROMPT = """你是一位专业的法律文书起草专家。请根据以下信息生成一份完整的法律文书。

文书类型：{doc_type}
{prompt_extra}

申请人/原告：{plaintiff}
被申请人/被告：{defendant}
案情描述：{fact}
诉求说明：{demands}

{law_context}

要求：
1. 严格按照中国司法实务规范格式撰写
2. 根据简述的案情，自动扩写事实与理由部分，使其详实完整、逻辑清晰
3. 引用相关法律条文作为依据，法条引用必须准确
4. 确保文书逻辑清晰、用词准确、格式规范
5. 直接输出完整的文书内容，不要添加额外说明
6. 文书中的日期使用当前日期：{date}
7. 如果缺少关键信息，在相应位置用"XXX"标注并提示用户补充"""

QUALITY_CHECK_PROMPT = """你是一位法律文书质量审核专家。请检查以下法律文书是否存在问题：

检查项目：
1. 格式是否规范（标题、称谓、落款等）
2. 逻辑是否连贯（事实与理由是否支持诉求）
3. 法条引用是否准确
4. 是否存在矛盾或遗漏
5. 用词是否专业准确

文书内容：
{document}

请简要列出发现的问题（如果没有问题，回复"文书质量合格"）："""


def _get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.get_active_model(),
        openai_api_key=settings.get_active_api_key(),
        openai_api_base=settings.get_active_base_url(),
        temperature=0.5,
    )


async def _search_relevant_laws_for_doc(doc_type: str, fact: str) -> str:
    keyword_map = {
        "劳动仲裁申请书": "劳动争议",
        "民事起诉状": "民事诉讼",
        "律师函": "律师函法律依据",
        "离婚协议书": "离婚协议 民法典",
    }
    keyword = keyword_map.get(doc_type, doc_type)
    results = []

    try:
        result = await search_law.ainvoke({"keyword": keyword})
        if result and "不可用" not in result and "未找到" not in result:
            results.append(f"【法规检索 - {keyword}】\n{result}")
            law_id = _extract_law_id(result)
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
        return "以下是通过得理API检索到的相关法规和案例，请在起草文书时参考：\n\n" + "\n\n".join(results)
    return ""


def _extract_law_id(search_result: str) -> str:
    import re
    match = re.search(r'lawId:\s*(\S+)', search_result)
    if match:
        return match.group(1).strip()
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

    law_context = await _search_relevant_laws_for_doc(doc_type, fact)

    llm = _get_llm()

    template_info = DOC_TEMPLATES_LEGACY.get(doc_type, DOC_TEMPLATES_LEGACY["劳动仲裁申请书"])
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
            "law_context": law_context,
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
    llm = _get_llm()
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


DOCGEN_OUTLINE_PROMPT = """你是一位资深法律文书起草专家。请根据以下信息，生成一份详细的法律文书大纲。

文书类型：{doc_name}
文书描述：{doc_desc}

用户填写的文书要素：
{elements_text}

参考大纲结构：{outline_sections}

要求：
1. 基于用户提供的信息，生成详细的文书大纲
2. 大纲应包含各主要部分的要点说明
3. 每个部分下应列出关键要素和注意事项
4. 大纲应体现文书的核心逻辑和法律关系
5. 引用相关法律依据：{law_refs}
6. 以结构化格式输出，使用"一、二、三..."编号

请直接输出文书大纲，不要添加额外说明。"""

DOCGEN_GENERATE_PROMPT = """你是一位资深法律文书起草专家。请根据以下文书大纲和要素信息，生成一份完整、专业的法律文书。

文书类型：{doc_name}
文书描述：{doc_desc}

用户填写的文书要素：
{elements_text}

文书大纲：
{outline}

相关法律依据：{law_refs}
{law_context}

要求：
1. 严格按照大纲结构，逐部分生成完整的文书内容
2. 内容应具体、明确、专业，避免模糊表述
3. 根据要素信息填充具体内容，缺失信息用"XXX"标注
4. 引用相关法律条文作为依据
5. 确保文书逻辑清晰、用词准确、格式规范
6. 严格按照中国司法实务规范格式撰写
7. 包含签署栏（当事人签名、日期等）
8. 当前日期：{date}

请直接输出完整的文书内容，不要添加额外说明。"""


def _format_doc_elements(template: DocTemplate, elements: Dict[str, str]) -> str:
    lines = []
    for field in template.fields:
        value = elements.get(field.key, "")
        if value:
            lines.append(f"- {field.label}：{value}")
        else:
            lines.append(f"- {field.label}：未填写")
    return "\n".join(lines)


async def generate_doc_outline(
    template_id: str,
    elements: Dict[str, str],
) -> dict:
    template = get_doc_template_by_id(template_id)
    if not template:
        return {"outline": "", "error": "模板不存在"}

    if not settings.is_api_key_configured():
        return {"outline": "", "error": "API Key 未配置"}

    llm = _get_llm()
    elements_text = _format_doc_elements(template, elements)
    outline_sections = "、".join(template.outline_sections)
    law_refs = "、".join(template.law_references)

    prompt = ChatPromptTemplate.from_template(DOCGEN_OUTLINE_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({
            "doc_name": template.name,
            "doc_desc": template.description,
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


async def _search_relevant_laws_for_template(template_name: str) -> str:
    results = []

    try:
        result = await search_law.ainvoke({"keyword": template_name})
        if result and "不可用" not in result and "未找到" not in result:
            results.append(f"【法规检索 - {template_name}】\n{result}")
            law_id = _extract_law_id(result)
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
        result = await search_case.ainvoke({"keyword": template_name})
        if result and "不可用" not in result and "未找到" not in result:
            results.append(f"【案例检索 - {template_name}】\n{result[:800]}")
    except Exception:
        pass

    if results:
        return "\n\n通过得理API检索到的相关法规和案例：\n\n" + "\n\n".join(results)
    return ""


async def generate_doc_text(
    template_id: str,
    elements: Dict[str, str],
    outline: str,
) -> dict:
    template = get_doc_template_by_id(template_id)
    if not template:
        return {"document_text": "", "error": "模板不存在"}

    if not settings.is_api_key_configured():
        return {"document_text": "", "error": "API Key 未配置"}

    law_context = await _search_relevant_laws_for_template(template.name)

    llm = _get_llm()
    elements_text = _format_doc_elements(template, elements)
    law_refs = "、".join(template.law_references)
    current_date = datetime.now().strftime("%Y年%m月%d日")

    prompt = ChatPromptTemplate.from_template(DOCGEN_GENERATE_PROMPT)
    chain = prompt | llm | StrOutputParser()

    try:
        result = await chain.ainvoke({
            "doc_name": template.name,
            "doc_desc": template.description,
            "elements_text": elements_text,
            "outline": outline,
            "law_refs": law_refs,
            "law_context": law_context,
            "date": current_date,
        })
        return {
            "document_text": result,
            "template_id": template_id,
            "template_name": template.name,
        }
    except Exception as e:
        return {"document_text": "", "template_id": template_id, "error": str(e)}
