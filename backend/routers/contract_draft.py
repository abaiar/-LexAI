from fastapi import APIRouter, HTTPException
from typing import Optional

from models.request_models import (
    ContractOutlineRequest,
    ContractGenerateRequest,
    UserTemplateCreateRequest,
    UserTemplateUpdateRequest,
)
from models.response_models import (
    CategoryListResponse,
    ContractTemplateResponse,
    ContractOutlineResponse,
    ContractGenerateResponse,
    UserTemplateResponse,
    UserTemplateListResponse,
    ErrorResponse,
)
from agents.contract_templates import (
    get_all_categories,
    get_template_by_id,
    get_templates_by_subcategory,
    search_templates,
    template_to_dict,
    CONTRACT_TEMPLATES,
)
from agents.contract_draft_agent import (
    generate_contract_outline,
    generate_contract_text,
    search_relevant_laws,
)
from database import execute_query

router = APIRouter(prefix="/api/contract-draft", tags=["合同智能起草"])

_user_templates_db = {}


@router.get("/categories", response_model=CategoryListResponse)
async def get_categories():
    categories = get_all_categories()
    return CategoryListResponse(categories=categories)


@router.get("/templates/{template_id}", response_model=ContractTemplateResponse)
async def get_template_detail(template_id: str):
    template = get_template_by_id(template_id)
    if template:
        return ContractTemplateResponse(**template_to_dict(template))
    if template_id in _user_templates_db:
        t = _user_templates_db[template_id]
        return ContractTemplateResponse(
            id=t["id"],
            name=t["name"],
            description=t.get("description", ""),
            category_id=t.get("category_id", ""),
            subcategory_id=t.get("subcategory_id", ""),
            fields=t.get("fields", []),
            outline_sections=t.get("outline_sections", []),
            prompt_template=t.get("prompt_template", ""),
            law_references=t.get("law_references", []),
        )
    raise HTTPException(status_code=404, detail={"code": 404, "message": "模板不存在"})


@router.get("/templates", response_model=CategoryListResponse)
async def get_templates_by_category(category_id: Optional[str] = None, subcategory_id: Optional[str] = None):
    if subcategory_id:
        templates = get_templates_by_subcategory(subcategory_id)
        result = []
        for t in templates:
            result.append(template_to_dict(t))
        from agents.contract_templates import CONTRACT_CATEGORIES, CONTRACT_TEMPLATES
        for cat in CONTRACT_CATEGORIES:
            for sub in cat.subcategories:
                if sub.id == subcategory_id:
                    templates_summary = []
                    for tid in sub.template_ids:
                        tt = CONTRACT_TEMPLATES.get(tid)
                        if tt:
                            templates_summary.append({
                                "id": tt.id,
                                "name": tt.name,
                                "description": tt.description,
                                "field_count": len(tt.fields),
                            })
                    return CategoryListResponse(categories=[{
                        "id": cat.id,
                        "name": cat.name,
                        "description": cat.description,
                        "icon": cat.icon,
                        "color": cat.color,
                        "subcategories": [{
                            "id": sub.id,
                            "name": sub.name,
                            "description": sub.description,
                            "icon": sub.icon,
                            "template_ids": sub.template_ids,
                            "template_count": len(sub.template_ids),
                            "templates": templates_summary,
                        }],
                        "template_count": len(sub.template_ids),
                    }])
    categories = get_all_categories()
    if category_id:
        categories = [c for c in categories if c["id"] == category_id]
    return CategoryListResponse(categories=categories)


@router.get("/search", response_model=UserTemplateListResponse)
async def search_contract_templates(keyword: str = "", category_id: str = ""):
    results = []
    if keyword:
        templates = search_templates(keyword)
    else:
        templates = list(CONTRACT_TEMPLATES.values())

    if category_id:
        templates = [t for t in templates if t.category_id == category_id]

    for t in templates:
        d = template_to_dict(t)
        results.append({
            "id": d["id"],
            "name": d["name"],
            "description": d["description"],
            "category_id": d["category_id"],
            "subcategory_id": d["subcategory_id"],
            "fields": d["fields"],
            "outline_sections": d["outline_sections"],
            "prompt_template": d["prompt_template"],
            "law_references": d["law_references"],
            "field_count": len(d["fields"]),
            "is_system": True,
            "created_at": "",
            "updated_at": "",
        })

    user_templates = await _get_user_templates(keyword, category_id)
    results.extend(user_templates)

    return UserTemplateListResponse(templates=results, total=len(results))


@router.post("/outline", response_model=ContractOutlineResponse, responses={400: {"model": ErrorResponse}})
async def create_contract_outline(req: ContractOutlineRequest):
    template = get_template_by_id(req.template_id)
    if not template and req.template_id in _user_templates_db:
        ut = _user_templates_db[req.template_id]
        sections = ut.get("outline_sections", [])
        fallback_sections = "\n".join(
            f"{'一二三四五六七八九十'[i]}、{s}" for i, s in enumerate(sections) if s
        ) if sections else "一、合同主体\n二、合同标的\n三、权利义务\n四、违约责任\n五、争议解决"
        elements_text = "\n".join(
            f"- {f.get('label', '')}：{req.elements.get(f.get('key', ''), '未填写')}"
            for f in ut.get("fields", [])
        ) if ut.get("fields") else ""
        return ContractOutlineResponse(
            outline=fallback_sections,
            template_id=req.template_id,
        )
    if not template:
        raise HTTPException(status_code=400, detail={"code": 400, "message": "模板不存在"})

    result = await generate_contract_outline(
        template_id=req.template_id,
        elements=req.elements,
    )
    if result.get("error") and not result.get("outline"):
        raise HTTPException(status_code=500, detail={"code": 500, "message": result["error"]})

    return ContractOutlineResponse(
        outline=result["outline"],
        template_id=req.template_id,
    )


@router.post("/generate", response_model=ContractGenerateResponse, responses={400: {"model": ErrorResponse}})
async def create_contract(req: ContractGenerateRequest):
    template = get_template_by_id(req.template_id)
    if not template and req.template_id not in _user_templates_db:
        raise HTTPException(status_code=400, detail={"code": 400, "message": "模板不存在"})

    template_name = template.name if template else _user_templates_db[req.template_id].get("name", "")

    law_search_result = ""
    if template:
        law_search_result = await search_relevant_laws(template.name)

    result = await generate_contract_text(
        template_id=req.template_id,
        elements=req.elements,
        outline=req.outline,
        law_search_result=law_search_result,
    )
    if result.get("error") and not result.get("contract_text"):
        raise HTTPException(status_code=500, detail={"code": 500, "message": result["error"]})

    return ContractGenerateResponse(
        contract_text=result["contract_text"],
        template_id=req.template_id,
        template_name=result.get("template_name", ""),
    )


async def _get_user_templates(keyword: str = "", category_id: str = "") -> list:
    results = []
    for tid, t in _user_templates_db.items():
        if keyword and keyword.lower() not in t["name"].lower():
            continue
        if category_id and t.get("category_id") != category_id:
            continue
        results.append(t)
    return results


@router.get("/user-templates", response_model=UserTemplateListResponse)
async def list_user_templates(keyword: str = "", category_id: str = ""):
    results = await _get_user_templates(keyword, category_id)
    return UserTemplateListResponse(templates=results, total=len(results))


@router.post("/user-templates", response_model=UserTemplateResponse)
async def create_user_template(req: UserTemplateCreateRequest):
    import uuid
    from datetime import datetime
    template_id = f"user_{uuid.uuid4().hex[:8]}"
    now = datetime.now().isoformat()
    template = {
        "id": template_id,
        "name": req.name,
        "description": req.description,
        "category_id": req.category_id,
        "subcategory_id": req.subcategory_id,
        "fields": req.fields,
        "outline_sections": req.outline_sections,
        "prompt_template": req.prompt_template,
        "law_references": req.law_references,
        "is_system": False,
        "created_at": now,
        "updated_at": now,
    }
    _user_templates_db[template_id] = template
    return UserTemplateResponse(**template)


@router.put("/user-templates/{template_id}", response_model=UserTemplateResponse)
async def update_user_template(template_id: str, req: UserTemplateUpdateRequest):
    if template_id not in _user_templates_db:
        raise HTTPException(status_code=404, detail={"code": 404, "message": "模板不存在"})
    template = _user_templates_db[template_id]
    update_data = req.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        if v is not None:
            template[k] = v
    from datetime import datetime
    template["updated_at"] = datetime.now().isoformat()
    return UserTemplateResponse(**template)


@router.delete("/user-templates/{template_id}")
async def delete_user_template(template_id: str):
    if template_id not in _user_templates_db:
        raise HTTPException(status_code=404, detail={"code": 404, "message": "模板不存在"})
    del _user_templates_db[template_id]
    return {"message": "模板已删除"}
