import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from models.request_models import ChatRequest
from agents.chat_agent import stream_chat

router = APIRouter(prefix="/api/chat", tags=["多轮法律咨询"])


@router.post("/send")
async def chat_send(req: ChatRequest):
    async def event_generator():
        async for chunk in stream_chat(
            message=req.message,
            session_id=req.session_id,
            history=[h.model_dump() for h in req.history],
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
