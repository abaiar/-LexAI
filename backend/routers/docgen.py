from fastapi import APIRouter, HTTPException

from models.request_models import DocGenRequest
from models.response_models import DocGenResponse, DocQualityCheckResponse, ErrorResponse
from agents.docgen_agent import generate_document, check_document_quality

router = APIRouter(prefix="/api/docgen", tags=["法律文书生成"])


@router.post("/generate", response_model=DocGenResponse, responses={400: {"model": ErrorResponse}})
async def docgen_generate(req: DocGenRequest):
    supported_types = ["劳动仲裁申请书", "民事起诉状", "律师函", "离婚协议书"]
    if req.doc_type not in supported_types:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "不支持的文书类型", "detail": f"支持的类型: {', '.join(supported_types)}"},
        )

    if not req.plaintiff or not req.defendant or not req.fact:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "参数缺失", "detail": "申请人、被申请人和案情描述为必填项"},
        )

    result = await generate_document(
        doc_type=req.doc_type,
        plaintiff=req.plaintiff,
        defendant=req.defendant,
        fact=req.fact,
        demands=req.demands or "",
    )
    return DocGenResponse(**result)


@router.post("/quality-check", response_model=DocQualityCheckResponse)
async def docgen_quality_check(document_text: str = ""):
    if not document_text:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "参数缺失", "detail": "请提供文书内容"},
        )
    result = await check_document_quality(document_text)
    return DocQualityCheckResponse(**result)
