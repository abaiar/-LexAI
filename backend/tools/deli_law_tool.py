import httpx
from langchain_core.tools import tool
from config import settings


DELI_LAW_URL = "https://openapi.delilegal.com/api/qa/v3/search/queryListLaw"
DELI_LAW_INFO_URL = "https://openapi.delilegal.com/api/qa/v3/search/lawInfo"


@tool
async def search_law(keyword: str) -> str:
    """搜索相关法律法规。当用户需要查找法律条文依据时使用此工具。输入参数为搜索关键词。"""
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
            "keywords": keywords,
            "fieldName": "semantic"
        }
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(DELI_LAW_URL, headers=headers, json=body)
            response.raise_for_status()
            data = response.json()
            results = data.get("body", {}).get("data", [])
            if not results:
                return "未找到相关法规。"
            formatted = []
            for i, law in enumerate(results[:5], 1):
                title = law.get("title", "未知法规")
                law_id = law.get("id", "")
                effectiveness = law.get("timelinessName", "未知效力")
                level = law.get("levelName", "")
                publish_date = law.get("publishDate", "")
                publisher = law.get("publisherName", "")
                formatted.append(f"{i}. {title}\n   效力: {effectiveness} | 级别: {level}\n   发布机关: {publisher} | 发布日期: {publish_date}\n   lawId: {law_id}")
            return "\n\n".join(formatted)
    except Exception as e:
        return f"法规检索服务暂时不可用，将使用纯AI分析。错误: {str(e)}"


@tool
async def get_law_detail(law_id: str) -> str:
    """获取法规详情。当需要查看具体法规全文时使用此工具。输入参数为法规ID(lawId)。"""
    headers = {
        "appid": settings.DELI_APPID,
        "secret": settings.DELI_SECRET,
    }
    params = {
        "lawId": law_id,
        "merge": "true"
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(DELI_LAW_INFO_URL, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            law_data = data.get("body", {})
            title = law_data.get("title", "未知法规")
            content = law_data.get("lawDetailContent", "无内容")
            effectiveness = law_data.get("timelinessName", "未知效力")
            level = law_data.get("levelName", "")
            return f"法规名称: {title}\n效力级别: {effectiveness} | 级别: {level}\n\n{content[:3000]}"
    except Exception as e:
        return f"法规详情获取失败。错误: {str(e)}"
