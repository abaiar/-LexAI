import json
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from config import settings
from harness.registry import registry


@tool
async def extract_fields(user_input: str, template_id: str) -> str:
    """从用户自然语言输入中提取合同/文书模板所需字段。当用户用自然语言描述合同需求时使用此工具。输入参数为用户输入文本和模板ID，用逗号分隔。"""
    actual_input = user_input.strip()
    actual_template_id = template_id.strip()

    try:
        from agents.contract_templates import get_template_by_id
        template = get_template_by_id(actual_template_id)
        if not template:
            try:
                from agents.docgen_templates import get_doc_template_by_id
                template = get_doc_template_by_id(actual_template_id)
            except Exception:
                pass

        if not template:
            return json.dumps({"error": f"模板 {actual_template_id} 不存在", "fields": {}}, ensure_ascii=False)

        field_descriptions = {}
        for field in template.fields:
            field_descriptions[field.key] = getattr(field, "label", field.key)

        llm = ChatOpenAI(
            model=settings.get_active_model(),
            openai_api_key=settings.get_active_api_key(),
            openai_api_base=settings.get_active_base_url(),
            temperature=0.1,
        )

        prompt = ChatPromptTemplate.from_template(
            "从以下用户描述中提取合同/文书所需信息。\n\n"
            "需要提取的字段：\n{field_descriptions}\n\n"
            "用户描述：\n{user_input}\n\n"
            "输出JSON，键为字段key，值为提取到的内容。未提及的字段值为null。只输出JSON，不要其他内容。"
        )
        chain = prompt | llm | StrOutputParser()

        result = await chain.ainvoke({
            "field_descriptions": json.dumps(field_descriptions, ensure_ascii=False),
            "user_input": actual_input,
        })

        cleaned = result.strip()
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

        json.loads(cleaned)
        return cleaned

    except Exception as e:
        return json.dumps({"error": str(e), "fields": {}}, ensure_ascii=False)


@tool
async def clarify_missing(extracted_fields: str, template_id: str) -> str:
    """识别缺失的关键字段并生成智能追问问题。当提取的字段中存在缺失项时使用此工具。输入参数为已提取的JSON字段和模板ID，用逗号分隔。"""
    actual_fields = extracted_fields.strip()
    actual_template_id = template_id.strip()

    try:
        fields = json.loads(actual_fields)
    except Exception:
        return "请提供更多关于您需求的信息。"

    missing_keys = [k for k, v in fields.items() if v is None or v == ""]

    if not missing_keys:
        return json.dumps({"missing_fields": [], "questions": []}, ensure_ascii=False)

    try:
        from agents.contract_templates import get_template_by_id
        template = get_template_by_id(actual_template_id)
        if not template:
            try:
                from agents.docgen_templates import get_doc_template_by_id
                template = get_doc_template_by_id(actual_template_id)
            except Exception:
                pass

        if not template:
            questions = [f"请提供{k}" for k in missing_keys[:5]]
            return json.dumps({"missing_fields": missing_keys, "questions": questions}, ensure_ascii=False)

        field_labels = {}
        for field in template.fields:
            field_labels[field.key] = getattr(field, "label", field.key)

        questions = []
        for key in missing_keys[:5]:
            label = field_labels.get(key, key)
            questions.append(f"请提供{label}的相关信息")

        return json.dumps({"missing_fields": missing_keys, "questions": questions}, ensure_ascii=False)

    except Exception as e:
        questions = [f"请提供{k}" for k in missing_keys[:5]]
        return json.dumps({"missing_fields": missing_keys, "questions": questions}, ensure_ascii=False)


# Register NLU tools
registry.register(extract_fields, allowed_agents=["contract_draft_agent", "docgen_agent"])
registry.register(clarify_missing, allowed_agents=["contract_draft_agent", "docgen_agent"])
