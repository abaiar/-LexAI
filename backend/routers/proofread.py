import uuid
import time
from fastapi import APIRouter, UploadFile, File, HTTPException, Body

from agents.proofread_agent import proofread_text
from models.response_models import (
    ProofreadResponse,
    ProofreadHistoryListResponse,
    ProofreadHistoryItem,
    ProofreadHistoryDetailResponse,
    ErrorResponse,
)
from tools.ocr_extractor import validate_file, extract_text_from_file
from tools.law_parser import clean_contract_text

router = APIRouter(prefix="/api/proofread", tags=["AI智能校对"])

_proofread_history_db: dict[str, dict] = []


@router.post(
    "/check",
    response_model=ProofreadResponse,
    responses={400: {"model": ErrorResponse}},
)
async def proofread_document(file: UploadFile = File(...)):
    content = await file.read()
    filename = file.filename or "unknown"

    error = validate_file(filename, content)
    if error:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "文件验证失败", "detail": error},
        )

    try:
        text = await extract_text_from_file(filename, content)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "文件内容提取失败", "detail": str(e)},
        )

    text = clean_contract_text(text)

    if len(text) < 10:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "文档内容过短", "detail": "提取到的文本不足，请检查文件内容"},
        )

    result = await proofread_text(text)

    record_id = str(uuid.uuid4())
    _proofread_history_db.append({
        "id": record_id,
        "filename": filename,
        "text_preview": text[:500],
        "errors": result.get("errors", []),
        "summary": result.get("summary", {}),
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    })

    return ProofreadResponse(**result)


@router.post(
    "/check-text",
    response_model=ProofreadResponse,
    responses={400: {"model": ErrorResponse}},
)
async def proofread_text_direct(text: str = Body(..., embed=True)):
    if not text or len(text.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "文本内容过短", "detail": "请输入至少10个字符的文本"},
        )

    if len(text) > 50000:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "文本内容过长", "detail": "文本不能超过50000个字符"},
        )

    result = await proofread_text(text)

    record_id = str(uuid.uuid4())
    _proofread_history_db.append({
        "id": record_id,
        "filename": "直接输入文本",
        "text_preview": text[:500],
        "errors": result.get("errors", []),
        "summary": result.get("summary", {}),
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    })

    return ProofreadResponse(**result)


@router.get("/history", response_model=ProofreadHistoryListResponse)
async def get_proofread_history():
    records = []
    for record in _proofread_history_db:
        summary = record.get("summary", {})
        records.append(
            ProofreadHistoryItem(
                id=record["id"],
                filename=record["filename"],
                total_errors=summary.get("total_errors", 0),
                overall_quality=summary.get("overall_quality", "good"),
                created_at=record["created_at"],
            )
        )

    records.sort(key=lambda x: x.created_at, reverse=True)
    return ProofreadHistoryListResponse(records=records, total=len(records))


@router.get(
    "/history/{record_id}",
    response_model=ProofreadHistoryDetailResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_proofread_detail(record_id: str):
    record = None
    for r in _proofread_history_db:
        if r["id"] == record_id:
            record = r
            break

    if not record:
        raise HTTPException(
            status_code=404,
            detail={"code": 404, "message": "记录不存在", "detail": "未找到该校对记录"},
        )

    return ProofreadHistoryDetailResponse(**record)


@router.delete(
    "/history/{record_id}",
    responses={404: {"model": ErrorResponse}},
)
async def delete_proofread_record(record_id: str):
    for i, r in enumerate(_proofread_history_db):
        if r["id"] == record_id:
            _proofread_history_db.pop(i)
            return {"message": "删除成功"}

    raise HTTPException(
        status_code=404,
        detail={"code": 404, "message": "记录不存在", "detail": "未找到该校对记录"},
    )
