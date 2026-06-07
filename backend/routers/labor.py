import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from models.request_models import ChatRequest
from agents.legal_agent import stream_legal_chat

router = APIRouter(prefix="/api/agent/labor", tags=["劳动纠纷维权Agent"])


@router.post("/chat")
async def labor_chat(req: ChatRequest):
    async def event_generator():
        async for chunk in stream_legal_chat(
            message=req.message,
            session_id=req.session_id,
            history=[h.model_dump() for h in req.history],
            skill_id="labor_dispute",
        ):
            data = json.dumps(chunk, ensure_ascii=False)
            yield f"data: {data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
