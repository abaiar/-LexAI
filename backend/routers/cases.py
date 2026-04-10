import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from models.request_models import CaseCreateRequest, CaseUpdateRequest
from models.response_models import (
    CaseInfo,
    CaseListResponse,
    CaseDetailResponse,
    ErrorResponse,
)

router = APIRouter(prefix="/api/cases", tags=["案件档案管理"])

_cases_db = {}


def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


@router.get("", response_model=CaseListResponse)
async def list_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
):
    all_cases = list(_cases_db.values())
    all_cases.sort(key=lambda x: x["updated_at"], reverse=True)
    total = len(all_cases)
    start = (page - 1) * page_size
    end = start + page_size
    page_cases = all_cases[start:end]
    return CaseListResponse(
        cases=[CaseInfo(**c) for c in page_cases],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=CaseInfo, responses={400: {"model": ErrorResponse}})
async def create_case(req: CaseCreateRequest):
    case_id = str(uuid.uuid4())[:8]
    now = _now()
    case_data = {
        "id": case_id,
        "title": req.title,
        "case_type": req.case_type,
        "description": req.description or "",
        "plaintiff": req.plaintiff or "",
        "defendant": req.defendant or "",
        "status": "进行中",
        "created_at": now,
        "updated_at": now,
    }
    _cases_db[case_id] = case_data
    return CaseInfo(**case_data)


@router.get("/{case_id}", response_model=CaseDetailResponse, responses={404: {"model": ErrorResponse}})
async def get_case(case_id: str):
    case = _cases_db.get(case_id)
    if not case:
        raise HTTPException(
            status_code=404,
            detail={"code": 404, "message": "案件不存在", "detail": f"未找到ID为{case_id}的案件"},
        )
    return CaseDetailResponse(
        **case,
        conversations=[],
        documents=[],
    )


@router.put("/{case_id}", response_model=CaseInfo, responses={404: {"model": ErrorResponse}})
async def update_case(case_id: str, req: CaseUpdateRequest):
    case = _cases_db.get(case_id)
    if not case:
        raise HTTPException(
            status_code=404,
            detail={"code": 404, "message": "案件不存在", "detail": f"未找到ID为{case_id}的案件"},
        )
    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            case[key] = value
    case["updated_at"] = _now()
    return CaseInfo(**case)


@router.delete("/{case_id}", responses={404: {"model": ErrorResponse}})
async def delete_case(case_id: str):
    case = _cases_db.get(case_id)
    if not case:
        raise HTTPException(
            status_code=404,
            detail={"code": 404, "message": "案件不存在", "detail": f"未找到ID为{case_id}的案件"},
        )
    del _cases_db[case_id]
    return {"message": "删除成功", "case_id": case_id}
