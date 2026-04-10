import uuid
import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from agents.doc_interpret_agent import interpret_document
from models.response_models import (
    DocInterpretResponse,
    InterpretHistoryListResponse,
    InterpretHistoryItem,
    InterpretHistoryDetailResponse,
    ErrorResponse,
)
from tools.ocr_extractor import validate_file, extract_text_from_file
from tools.law_parser import clean_contract_text

router = APIRouter(prefix="/api/doc-interpret", tags=["法律文书智能解读"])

_interpret_history_db: dict[str, dict] = []


@router.post(
    "/interpret",
    response_model=DocInterpretResponse,
    responses={400: {"model": ErrorResponse}},
)
async def interpret_document_api(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
):
    doc_text = ""

    if file:
        content = await file.read()
        filename = file.filename or "unknown"

        error = validate_file(filename, content)
        if error:
            raise HTTPException(
                status_code=400,
                detail={"code": 400, "message": "文件验证失败", "detail": error},
            )

        try:
            doc_text = await extract_text_from_file(filename, content)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail={"code": 400, "message": "文件内容提取失败", "detail": str(e)},
            )
    elif text:
        doc_text = text
    else:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "参数缺失", "detail": "请提供file或text参数"},
        )

    doc_text = clean_contract_text(doc_text)

    if len(doc_text) < 10:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "文书内容过短", "detail": "提取到的文本不足，请检查文件内容"},
        )

    result = await interpret_document(doc_text)

    record_id = str(uuid.uuid4())
    _interpret_history_db.append({
        "id": record_id,
        "filename": filename if file else "直接输入文本",
        "text_preview": doc_text[:500],
        "document_type": result.get("document_type", "法律文书"),
        "parties": result.get("parties", []),
        "key_clauses": result.get("key_clauses", []),
        "rights_obligations": result.get("rights_obligations", []),
        "risk_warnings": result.get("risk_warnings", []),
        "key_deadlines": result.get("key_deadlines", []),
        "legal_terms": result.get("legal_terms", []),
        "action_suggestions": result.get("action_suggestions", []),
        "overall_assessment": result.get("overall_assessment", ""),
        "difficulty_level": result.get("difficulty_level", "moderate"),
        "interpretation_score": result.get("interpretation_score", 70),
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    })

    return DocInterpretResponse(**result)


@router.get("/history", response_model=InterpretHistoryListResponse)
async def get_interpret_history():
    records = []
    for record in _interpret_history_db:
        records.append(
            InterpretHistoryItem(
                id=record["id"],
                filename=record["filename"],
                document_type=record.get("document_type", "法律文书"),
                summary=record.get("summary", ""),
                interpretation_score=record.get("interpretation_score", 70),
                difficulty_level=record.get("difficulty_level", "moderate"),
                created_at=record["created_at"],
            )
        )

    records.sort(key=lambda x: x.created_at, reverse=True)
    return InterpretHistoryListResponse(records=records, total=len(records))


@router.get(
    "/history/{record_id}",
    response_model=InterpretHistoryDetailResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_interpret_detail(record_id: str):
    record = None
    for r in _interpret_history_db:
        if r["id"] == record_id:
            record = r
            break

    if not record:
        raise HTTPException(
            status_code=404,
            detail={"code": 404, "message": "记录不存在", "detail": "未找到该解读记录"},
        )

    return InterpretHistoryDetailResponse(**record)


@router.delete(
    "/history/{record_id}",
    responses={404: {"model": ErrorResponse}},
)
async def delete_interpret_record(record_id: str):
    for i, r in enumerate(_interpret_history_db):
        if r["id"] == record_id:
            _interpret_history_db.pop(i)
            return {"message": "删除成功"}

    raise HTTPException(
        status_code=404,
        detail={"code": 404, "message": "记录不存在", "detail": "未找到该解读记录"},
    )
