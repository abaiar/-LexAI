from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from agents.contract_agent import review_contract
from models.response_models import ContractReviewResponse, ErrorResponse
from tools.law_parser import clean_contract_text

router = APIRouter(prefix="/api/contract", tags=["合同审查"])


@router.post("/review", response_model=ContractReviewResponse, responses={400: {"model": ErrorResponse}})
async def contract_review(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
):
    contract_text = ""

    if file:
        content = await file.read()
        filename = file.filename or ""

        if filename.lower().endswith(".pdf"):
            try:
                import io
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(content))
                pages = []
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        pages.append(page_text)
                contract_text = "\n".join(pages)
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail={"code": 400, "message": "PDF解析失败", "detail": str(e)},
                )
        elif filename.lower().endswith((".txt", ".docx")):
            try:
                contract_text = content.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    contract_text = content.decode("gbk")
                except Exception:
                    raise HTTPException(
                        status_code=400,
                        detail={"code": 400, "message": "文件编码无法识别", "detail": "请上传UTF-8或GBK编码的文本文件"},
                    )
        else:
            raise HTTPException(
                status_code=400,
                detail={"code": 400, "message": "不支持的文件格式", "detail": "请上传PDF或TXT格式文件"},
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
