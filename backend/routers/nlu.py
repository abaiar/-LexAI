import json
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Optional

from tools.nlu_tools import extract_fields, clarify_missing

router = APIRouter(prefix="/api/nlu", tags=["自然语言理解"])


class NLUExtractRequest(BaseModel):
    user_input: str
    template_id: str


class NLUClarifyRequest(BaseModel):
    extracted_fields: str
    template_id: str


@router.post("/extract")
async def extract_fields_endpoint(req: NLUExtractRequest):
    result = await extract_fields.ainvoke({
        "user_input": req.user_input,
        "template_id": req.template_id,
    })
    try:
        parsed = json.loads(result)
        return {"fields": parsed, "template_id": req.template_id}
    except json.JSONDecodeError:
        return {"fields": {}, "template_id": req.template_id, "raw": result}


@router.post("/clarify")
async def clarify_missing_endpoint(req: NLUClarifyRequest):
    result = await clarify_missing.ainvoke({
        "extracted_fields": req.extracted_fields,
        "template_id": req.template_id,
    })
    try:
        parsed = json.loads(result)
        return parsed
    except json.JSONDecodeError:
        return {"missing_fields": [], "questions": [], "raw": result}
