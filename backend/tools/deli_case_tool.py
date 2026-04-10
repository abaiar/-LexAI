import httpx
from langchain_core.tools import tool
from config import settings


DELI_CASE_URL = "https://openapi.delilegal.com/api/qa/v3/search/queryListCase"


@tool
async def search_case(keyword: str) -> str:
    """搜索相似案例。当用户需要查找相关法律案例时使用此工具。输入参数为搜索关键词。"""
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
            results = data.get("body", {}).get("data", [])
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
    except Exception as e:
        return f"案例检索服务暂时不可用，将使用纯AI分析。错误: {str(e)}"
