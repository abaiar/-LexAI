from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from agents.contract_agent import review_contract
from workflows.contract_review import collaborative_review
from models.response_models import ContractReviewResponse, ErrorResponse
from tools.ocr_extractor import validate_file, extract_text_from_file
from tools.law_parser import clean_contract_text

router = APIRouter(prefix="/api/contract", tags=["合同审查"])


@router.post("/review", response_model=ContractReviewResponse, responses={400: {"model": ErrorResponse}})
async def contract_review_endpoint(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
):
    contract_text = ""

    if file:
        content = await file.read()
        filename = file.filename or ""

        error = validate_file(filename, content)
        if error:
            raise HTTPException(
                status_code=400,
                detail={"code": 400, "message": "文件验证失败", "detail": error},
            )

        try:
            contract_text = await extract_text_from_file(filename, content)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail={"code": 400, "message": "文件解析失败", "detail": str(e)},
            )
    elif text:
        contract_text = text
    else:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "参数缺失", "detail": "请提供file或text参数"},
        )

    contract_text = clean_contract_text(contract_text)

    if len(contract_text) < 10:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "合同内容过短", "detail": "提取到的合同文本不足，请检查文件内容"},
        )

    result = await review_contract(contract_text)
    return ContractReviewResponse(**result)


@router.post("/collaborative-review", responses={400: {"model": ErrorResponse}})
async def collaborative_review_endpoint(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
):
    contract_text = ""

    if file:
        content = await file.read()
        filename = file.filename or ""

        error = validate_file(filename, content)
        if error:
            raise HTTPException(
                status_code=400,
                detail={"code": 400, "message": "文件验证失败", "detail": error},
            )

        try:
            contract_text = await extract_text_from_file(filename, content)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail={"code": 400, "message": "文件解析失败", "detail": str(e)},
            )
    elif text:
        contract_text = text
    else:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "参数缺失", "detail": "请提供file或text参数"},
        )

    contract_text = clean_contract_text(contract_text)

    if len(contract_text) < 10:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "合同内容过短", "detail": "提取到的合同文本不足，请检查文件内容"},
        )

    result = await collaborative_review(contract_text)
    return result
