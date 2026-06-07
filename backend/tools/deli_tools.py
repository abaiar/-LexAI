import httpx
import re
import json
import time
import urllib.request
import urllib.error
from typing import Optional, List
from langchain_core.tools import tool

from config import settings
from harness.registry import registry
from tools.deli_stats import deli_stats


DELI_LAW_URL = "https://openapi.delilegal.com/api/qa/v3/search/queryListLaw"
DELI_LAW_INFO_URL = "https://openapi.delilegal.com/api/qa/v3/search/lawInfo"
DELI_CASE_URL = "https://openapi.delilegal.com/api/qa/v3/search/queryListCase"


def _check_deli_credentials() -> Optional[str]:
    if not settings.DELI_APPID or settings.DELI_APPID.startswith("your-"):
        return "得理API凭据未配置，请在.env文件中设置DELI_APPID和DELI_SECRET"
    if not settings.DELI_SECRET or settings.DELI_SECRET.startswith("your-"):
        return "得理API凭据未配置，请在.env文件中设置DELI_APPID和DELI_SECRET"
    return None


def _get_deli_headers() -> dict:
    return {
        "appid": settings.DELI_APPID,
        "secret": settings.DELI_SECRET,
        "Content-Type": "application/json",
    }


def _urllib_post(url: str, headers: dict, body: dict) -> dict:
    """urllib 后备 POST 请求"""
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _urllib_get(url: str, headers: dict, params: dict) -> dict:
    """urllib 后备 GET 请求"""
    query = urllib.parse.urlencode(params)
    full_url = f"{url}?{query}" if query else url
    get_headers = {k: v for k, v in headers.items() if k != "Content-Type"}
    req = urllib.request.Request(full_url, headers=get_headers, method="GET")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


async def _async_post(url: str, headers: dict, body: dict) -> dict:
    """异步 POST，httpx 优先，urllib 后备"""
    try:
        async with httpx.AsyncClient(timeout=30.0, verify=False, follow_redirects=True) as client:
            response = await client.post(url, headers=headers, json=body)
            response.raise_for_status()
            return response.json()
    except Exception:
        import asyncio
        return await asyncio.get_event_loop().run_in_executor(
            None, _urllib_post, url, headers, body
        )


async def _async_get(url: str, headers: dict, params: dict) -> dict:
    """异步 GET，httpx 优先，urllib 后备"""
    try:
        async with httpx.AsyncClient(timeout=30.0, verify=False, follow_redirects=True) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
    except Exception:
        import asyncio
        return await asyncio.get_event_loop().run_in_executor(
            None, _urllib_get, url, headers, params
        )


def _cache_key(api_name: str, **kwargs) -> str:
    """生成缓存键"""
    import hashlib
    raw = f"{api_name}:{json.dumps(kwargs, sort_keys=True, ensure_ascii=False)}"
    return hashlib.md5(raw.encode()).hexdigest()


@tool
async def search_law(keyword: str) -> str:
    """搜索相关法律法规。当用户需要查找法律条文依据时使用此工具。输入参数为搜索关键词。"""
    cred_error = _check_deli_credentials()
    if cred_error:
        return f"法规检索服务不可用：{cred_error}"

    # 检查缓存
    cache_key = _cache_key("search_law", keyword=keyword)
    cached = deli_stats.get_cache(cache_key)
    if cached:
        deli_stats.record_call("search_law", 0.0, True)
        return cached

    headers = _get_deli_headers()
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
    start_time = time.time()
    try:
        data = await _async_post(DELI_LAW_URL, headers, body)
        latency = (time.time() - start_time) * 1000
        if not data or not isinstance(data, dict):
            deli_stats.record_call("search_law", latency, False, "返回数据异常")
            return "法规检索返回数据异常。"
        body_data = data.get("body")
        if not body_data or not isinstance(body_data, dict):
            msg = data.get("msg", data.get("message", "未知错误"))
            deli_stats.record_call("search_law", latency, False, msg)
            return f"法规检索服务返回错误：{msg}"
        results = body_data.get("data", [])
        if not results:
            deli_stats.record_call("search_law", latency, True)
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
        result = "\n\n".join(formatted)
        deli_stats.record_call("search_law", latency, True)
        deli_stats.set_cache(cache_key, result)
        return result
    except urllib.error.HTTPError as e:
        latency = (time.time() - start_time) * 1000
        error_msg = f"HTTP {e.code}"
        deli_stats.record_call("search_law", latency, False, error_msg)
        if e.code in (401, 403):
            return "法规检索服务认证失败，请检查DELI_APPID和DELI_SECRET配置。"
        return f"法规检索服务暂时不可用，将使用纯AI分析。错误: HTTP {e.code}"
    except Exception as e:
        latency = (time.time() - start_time) * 1000
        deli_stats.record_call("search_law", latency, False, str(e)[:100])
        return f"法规检索服务暂时不可用，将使用纯AI分析。错误: {str(e)}"


@tool
async def get_law_detail(law_id: str) -> str:
    """获取法规详情。当需要查看具体法规全文时使用此工具。输入参数为法规ID(lawId)。"""
    cred_error = _check_deli_credentials()
    if cred_error:
        return f"法规详情服务不可用：{cred_error}"

    # 检查缓存
    cache_key = _cache_key("get_law_detail", law_id=law_id)
    cached = deli_stats.get_cache(cache_key)
    if cached:
        deli_stats.record_call("get_law_detail", 0.0, True)
        return cached

    headers = {
        "appid": settings.DELI_APPID,
        "secret": settings.DELI_SECRET,
    }
    params = {
        "lawId": law_id,
        "merge": "true"
    }
    start_time = time.time()
    try:
        data = await _async_get(DELI_LAW_INFO_URL, headers, params)
        latency = (time.time() - start_time) * 1000
        if not data or not isinstance(data, dict):
            deli_stats.record_call("get_law_detail", latency, False, "返回数据异常")
            return "法规详情返回数据异常。"
        law_data = data.get("body", {})
        if not law_data:
            deli_stats.record_call("get_law_detail", latency, True)
            return "未找到该法规详情。"
        title = law_data.get("title", "未知法规")
        content = law_data.get("lawDetailContent", "无内容")
        effectiveness = law_data.get("timelinessName", "未知效力")
        level = law_data.get("levelName", "")
        result = f"法规名称: {title}\n效力级别: {effectiveness} | 级别: {level}\n\n{content[:3000]}"
        deli_stats.record_call("get_law_detail", latency, True)
        deli_stats.set_cache(cache_key, result)
        return result
    except urllib.error.HTTPError as e:
        latency = (time.time() - start_time) * 1000
        deli_stats.record_call("get_law_detail", latency, False, f"HTTP {e.code}")
        if e.code in (401, 403):
            return "法规详情服务认证失败，请检查DELI_APPID和DELI_SECRET配置。"
        return f"法规详情获取失败。错误: HTTP {e.code}"
    except Exception as e:
        latency = (time.time() - start_time) * 1000
        deli_stats.record_call("get_law_detail", latency, False, str(e)[:100])
        return f"法规详情获取失败。错误: {str(e)}"


@tool
async def search_case(keyword: str) -> str:
    """搜索相似案例。当用户需要查找相关法律案例时使用此工具。输入参数为搜索关键词。"""
    cred_error = _check_deli_credentials()
    if cred_error:
        return f"案例检索服务不可用：{cred_error}"

    # 检查缓存
    cache_key = _cache_key("search_case", keyword=keyword)
    cached = deli_stats.get_cache(cache_key)
    if cached:
        deli_stats.record_call("search_case", 0.0, True)
        return cached

    headers = _get_deli_headers()
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
    start_time = time.time()
    try:
        data = await _async_post(DELI_CASE_URL, headers, body)
        latency = (time.time() - start_time) * 1000
        if not data or not isinstance(data, dict):
            deli_stats.record_call("search_case", latency, False, "返回数据异常")
            return "案例检索返回数据异常。"
        body_data = data.get("body")
        if not body_data or not isinstance(body_data, dict):
            msg = data.get("msg", data.get("message", "未知错误"))
            deli_stats.record_call("search_case", latency, False, msg)
            return f"案例检索服务返回错误：{msg}"
        results = body_data.get("data", [])
        if not results:
            deli_stats.record_call("search_case", latency, True)
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
        result = "\n\n".join(formatted)
        deli_stats.record_call("search_case", latency, True)
        deli_stats.set_cache(cache_key, result)
        return result
    except urllib.error.HTTPError as e:
        latency = (time.time() - start_time) * 1000
        deli_stats.record_call("search_case", latency, False, f"HTTP {e.code}")
        if e.code in (401, 403):
            return "案例检索服务认证失败，请检查DELI_APPID和DELI_SECRET配置。"
        return f"案例检索服务暂时不可用，将使用纯AI分析。错误: HTTP {e.code}"
    except Exception as e:
        latency = (time.time() - start_time) * 1000
        deli_stats.record_call("search_case", latency, False, str(e)[:100])
        return f"案例检索服务暂时不可用，将使用纯AI分析。错误: {str(e)}"


def get_deli_tools():
    return [search_law, get_law_detail, search_case]


# Register all tools with the registry
for _tool in get_deli_tools():
    registry.register(_tool, allowed_agents=["*"])
