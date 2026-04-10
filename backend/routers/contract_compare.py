import uuid
import time
from fastapi import APIRouter, UploadFile, File, HTTPException

from agents.contract_compare_agent import compare_contracts
from models.response_models import (
    ContractCompareResponse,
    CompareHistoryListResponse,
    CompareHistoryItem,
    CompareHistoryDetailResponse,
    ErrorResponse,
)
from tools.ocr_extractor import validate_file, extract_text_from_file
from tools.law_parser import clean_contract_text

router = APIRouter(prefix="/api/contract-compare", tags=["合同对比"])

_compare_history_db: dict[str, dict] = {}


@router.post(
    "/compare",
    response_model=ContractCompareResponse,
    responses={400: {"model": ErrorResponse}},
)
async def contract_compare(
    original_file: UploadFile = File(...),
    revised_file: UploadFile = File(...),
):
    original_content = await original_file.read()
    revised_content = await revised_file.read()

    original_filename = original_file.filename or "unknown"
    revised_filename = revised_file.filename or "unknown"

    original_error = validate_file(original_filename, original_content)
    if original_error:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "原始合同文件验证失败", "detail": original_error},
        )

    revised_error = validate_file(revised_filename, revised_content)
    if revised_error:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "新合同文件验证失败", "detail": revised_error},
        )

    try:
        original_text = await extract_text_from_file(original_filename, original_content)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "原始合同内容提取失败", "detail": str(e)},
        )

    try:
        revised_text = await extract_text_from_file(revised_filename, revised_content)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "新合同内容提取失败", "detail": str(e)},
        )

    original_text = clean_contract_text(original_text)
    revised_text = clean_contract_text(revised_text)

    if len(original_text) < 10:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "原始合同内容过短", "detail": "提取到的合同文本不足，请检查文件内容"},
        )

    if len(revised_text) < 10:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "新合同内容过短", "detail": "提取到的合同文本不足，请检查文件内容"},
        )

    result = await compare_contracts(original_text, revised_text)

    record_id = str(uuid.uuid4())
    _compare_history_db[record_id] = {
        "id": record_id,
        "original_filename": original_filename,
        "revised_filename": revised_filename,
        "original_text_preview": original_text[:500],
        "revised_text_preview": revised_text[:500],
        "diff_items": result.get("diff_items", []),
        "summary": result.get("summary", {}),
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    return ContractCompareResponse(**result)


@router.get("/history", response_model=CompareHistoryListResponse)
async def get_compare_history():
    records = []
    for record in _compare_history_db.values():
        summary = record.get("summary", {})
        records.append(
            CompareHistoryItem(
                id=record["id"],
                original_filename=record["original_filename"],
                revised_filename=record["revised_filename"],
                total_changes=summary.get("total_changes", 0),
                overall_risk=summary.get("overall_risk", "low"),
                created_at=record["created_at"],
            )
        )

    records.sort(key=lambda x: x.created_at, reverse=True)
    return CompareHistoryListResponse(records=records, total=len(records))


@router.get(
    "/history/{record_id}",
    response_model=CompareHistoryDetailResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_compare_detail(record_id: str):
    record = _compare_history_db.get(record_id)
    if not record:
        raise HTTPException(
            status_code=404,
            detail={"code": 404, "message": "记录不存在", "detail": "未找到该对比记录"},
        )

    return CompareHistoryDetailResponse(**record)


@router.delete(
    "/history/{record_id}",
    responses={404: {"model": ErrorResponse}},
)
async def delete_compare_record(record_id: str):
    if record_id not in _compare_history_db:
        raise HTTPException(
            status_code=404,
            detail={"code": 404, "message": "记录不存在", "detail": "未找到该对比记录"},
        )

    del _compare_history_db[record_id]
    return {"message": "删除成功"}
