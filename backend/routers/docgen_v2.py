from fastapi import APIRouter, HTTPException
from typing import Optional

from agents.docgen_templates import (
    get_all_doc_categories,
    get_doc_template_by_id,
    search_doc_templates,
    doc_template_to_dict,
    DOC_TEMPLATES,
)
from agents.docgen_agent import (
    generate_doc_outline,
    generate_doc_text,
    check_document_quality,
)

router = APIRouter(prefix="/api/docgen-v2", tags=["法律文书生成V2"])


@router.get("/categories")
async def get_categories():
    categories = get_all_doc_categories()
    return {"categories": categories}


@router.get("/templates/{template_id}")
async def get_template_detail(template_id: str):
    template = get_doc_template_by_id(template_id)
    if template:
        return doc_template_to_dict(template)
    raise HTTPException(status_code=404, detail={"code": 404, "message": "模板不存在"})


@router.get("/search")
async def search_templates(keyword: str = "", category_id: str = ""):
    results = []
    if keyword:
        templates = search_doc_templates(keyword)
    else:
        templates = list(DOC_TEMPLATES.values())

    if category_id:
        templates = [t for t in templates if t.category_id == category_id]

    for t in templates:
        d = doc_template_to_dict(t)
        results.append({
            "id": d["id"],
            "name": d["name"],
            "description": d["description"],
            "category_id": d["category_id"],
            "fields": d["fields"],
            "outline_sections": d["outline_sections"],
            "prompt_template": d["prompt_template"],
            "law_references": d["law_references"],
            "field_count": len(d["fields"]),
            "is_system": True,
        })

    return {"templates": results, "total": len(results)}


@router.post("/outline")
async def create_doc_outline(req: dict):
    template_id = req.get("template_id", "")
    elements = req.get("elements", {})
    if not template_id:
        raise HTTPException(status_code=400, detail={"code": 400, "message": "模板ID不能为空"})

    template = get_doc_template_by_id(template_id)
    if not template:
        raise HTTPException(status_code=400, detail={"code": 400, "message": "模板不存在"})

    result = await generate_doc_outline(
        template_id=template_id,
        elements=elements,
    )
    if result.get("error") and not result.get("outline"):
        raise HTTPException(status_code=500, detail={"code": 500, "message": result["error"]})

    return {
        "outline": result["outline"],
        "template_id": template_id,
    }


@router.post("/generate")
async def create_doc(req: dict):
    template_id = req.get("template_id", "")
    elements = req.get("elements", {})
    outline = req.get("outline", "")

    if not template_id:
        raise HTTPException(status_code=400, detail={"code": 400, "message": "模板ID不能为空"})
    if not outline.strip():
        raise HTTPException(status_code=400, detail={"code": 400, "message": "大纲不能为空"})

    template = get_doc_template_by_id(template_id)
    if not template:
        raise HTTPException(status_code=400, detail={"code": 400, "message": "模板不存在"})

    result = await generate_doc_text(
        template_id=template_id,
        elements=elements,
        outline=outline,
    )
    if result.get("error") and not result.get("document_text"):
        raise HTTPException(status_code=500, detail={"code": 500, "message": result["error"]})

    return {
        "document_text": result["document_text"],
        "template_id": template_id,
        "template_name": result.get("template_name", ""),
    }


@router.post("/quality-check")
async def doc_quality_check(req: dict):
    document_text = req.get("document_text", "")
    if not document_text:
        raise HTTPException(status_code=400, detail={"code": 400, "message": "请提供文书内容"})
    result = await check_document_quality(document_text)
    return result
