import httpx
from typing import Optional
from langchain_core.tools import tool
from config import settings


DELI_CASE_URL = "https://openapi.delilegal.com/api/qa/v3/search/queryListCase"


def _check_deli_credentials() -> Optional[str]:
    if not settings.DELI_APPID or settings.DELI_APPID.startswith("your-"):
        return "得理API凭据未配置，请在.env文件中设置DELI_APPID和DELI_SECRET"
    if not settings.DELI_SECRET or settings.DELI_SECRET.startswith("your-"):
        return "得理API凭据未配置，请在.env文件中设置DELI_APPID和DELI_SECRET"
    return None


@tool
async def search_case(keyword: str) -> str:
    """搜索相似案例。当用户需要查找相关法律案例时使用此工具。输入参数为搜索关键词。"""
    cred_error = _check_deli_credentials()
    if cred_error:
        return f"案例检索服务不可用：{cred_error}"

    headers = {
        "appid": settings.DELI_APPID,
        "secret": settings.DELI_SECRET,
        "Content-Type": "application/json",
    }
    keywords = [keyword] if isinstance(keyword, str) else keyword
    body = {
        "pageNo": 1,
        "pageSize": 5,
        "sortField": "correlation",
        "sortOrder": "desc",
        "condition": {
            "keywordArr": keywords
        }
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(DELI_CASE_URL, headers=headers, json=body)
            response.raise_for_status()
            data = response.json()
            if not data or not isinstance(data, dict):
                return "案例检索返回数据异常。"
            body_data = data.get("body")
            if not body_data or not isinstance(body_data, dict):
                msg = data.get("msg", data.get("message", "未知错误"))
                return f"案例检索服务返回错误：{msg}"
            results = body_data.get("data", [])
            if not results:
                return "未找到相关案例。"
            formatted = []
            for i, case in enumerate(results[:5], 1):
                title = case.get("title", "未知案例")
                court = case.get("court", "未知法院")
                date = case.get("judgementDate", "未知日期")
                case_number = case.get("caseNumber", "")
                cause = case.get("cause", "")
                content = case.get("content", "")
                summary = content[:500] if content else "无摘要"
                formatted.append(f"{i}. {title}\n   案号: {case_number} | 法院: {court} | 日期: {date}\n   案由: {cause}\n   摘要: {summary}")
            return "\n\n".join(formatted)
    except httpx.HTTPStatusError as e:
        if e.response.status_code in (401, 403):
            return "案例检索服务认证失败，请检查DELI_APPID和DELI_SECRET配置。"
        return f"案例检索服务暂时不可用，将使用纯AI分析。错误: HTTP {e.response.status_code}"
    except Exception as e:
        return f"案例检索服务暂时不可用，将使用纯AI分析。错误: {str(e)}"
