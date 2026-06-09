from fastapi import APIRouter

from harness.trace import trace_manager
from tools.deli_stats import deli_stats

router = APIRouter(prefix="/api/trace", tags=["执行追踪"])


@router.get("/recent")
async def get_recent_traces(limit: int = 20):
    traces = trace_manager.get_recent_traces(limit)
    return {"traces": [t.to_dict() for t in traces]}


@router.get("/deli/stats")
async def get_deli_stats(api_name: str = None):
    """获取得理 API 调用统计"""
    return deli_stats.get_stats(api_name)


@router.get("/deli/cache")
async def get_deli_cache_stats():
    """获取得理 API 缓存统计"""
    return deli_stats.get_cache_stats()


@router.post("/deli/cache/clear")
async def clear_deli_cache():
    """清空得理 API 缓存"""
    deli_stats.clear_cache()
    return {"message": "缓存已清空"}


@router.get("/{session_id}")
async def get_trace(session_id: str):
    trace = trace_manager.get_trace(session_id)
    if trace:
        return trace.to_dict()
    return {"error": "追踪记录不存在"}
