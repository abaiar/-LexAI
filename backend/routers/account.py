from fastapi import APIRouter, HTTPException
import httpx

from config import settings, LLM_PROVIDERS
from database import execute_query, get_pool
from models.request_models import AccountConfigRequest
from models.response_models import AccountConfigResponse

router = APIRouter(prefix="/api/account", tags=["账户配置"])

_memory_configs = {}


@router.get("/providers")
async def get_providers():
    result = []
    for key, info in LLM_PROVIDERS.items():
        env_key = info.get("api_key_env", "")
        env_value = getattr(settings, env_key, "") if hasattr(settings, env_key) else ""
        result.append({
            "id": key,
            "name": info["name"],
            "base_url": info["base_url"],
            "models": info["models"],
            "default_model": info["default_model"],
            "key_prefix": info.get("key_prefix", ""),
            "key_hint": info.get("key_hint", ""),
            "has_env_key": bool(env_value),
        })
    return {"providers": result}


@router.put("/config", response_model=AccountConfigResponse)
async def update_account_config(req: AccountConfigRequest):
    if req.provider and req.provider not in LLM_PROVIDERS:
        raise HTTPException(status_code=400, detail={"code": 400, "message": "不支持的厂商", "detail": f"支持的厂商: {', '.join(LLM_PROVIDERS.keys())}"})

    if not req.llm_api_key:
        env_key = LLM_PROVIDERS.get(req.provider, {}).get("api_key_env", "")
        env_value = getattr(settings, env_key, "") if hasattr(settings, env_key) else ""
        if not env_value:
            raise HTTPException(status_code=400, detail={"code": 400, "message": "API Key 未配置", "detail": "请先在账户设置中配置 API Key"})

    provider_info = LLM_PROVIDERS.get(req.provider, {})
    model_name = req.model_name or provider_info.get("default_model", "qwen-turbo")

    settings.update_llm_config(
        provider=req.provider,
        api_key=req.llm_api_key,
        model_name=model_name,
    )

    if req.email:
        pool = await get_pool()
        if pool:
            await execute_query(
                "UPDATE users SET api_key = %s, model_name = %s WHERE email = %s",
                (req.llm_api_key, model_name, req.email),
                fetch="none",
            )
        else:
            _memory_configs[req.email] = {
                "provider": req.provider,
                "api_key": req.llm_api_key,
                "model_name": model_name,
            }

    return AccountConfigResponse(message="配置已保存")


@router.get("/config")
async def get_account_config(email: str = ""):
    if not email:
        return {
            "provider": settings.LLM_PROVIDER,
            "llm_api_key": "",
            "model_name": settings.LLM_MODEL_NAME,
        }

    pool = await get_pool()
    if pool:
        result = await execute_query(
            "SELECT api_key, model_name FROM users WHERE email = %s",
            (email,),
            fetch="one",
        )
        if result:
            return {
                "provider": settings.LLM_PROVIDER,
                "llm_api_key": result.get("api_key", "") or "",
                "model_name": result.get("model_name", "") or settings.LLM_MODEL_NAME,
            }
    else:
        config = _memory_configs.get(email, {})
        return {
            "provider": config.get("provider", settings.LLM_PROVIDER),
            "llm_api_key": config.get("api_key", ""),
            "model_name": config.get("model_name", settings.LLM_MODEL_NAME),
        }

    return {"provider": settings.LLM_PROVIDER, "llm_api_key": "", "model_name": settings.LLM_MODEL_NAME}


@router.post("/config/validate")
async def validate_api_key(req: AccountConfigRequest):
    if not req.llm_api_key:
        return {"valid": False, "message": "请输入 API Key"}

    provider_info = LLM_PROVIDERS.get(req.provider, {})
    if not provider_info:
        return {"valid": False, "message": "不支持的厂商"}

    base_url = provider_info["base_url"]
    model_name = req.model_name or provider_info["default_model"]

    if req.provider == "anthropic":
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    base_url + "/messages",
                    headers={
                        "x-api-key": req.llm_api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model_name,
                        "messages": [{"role": "user", "content": "test"}],
                        "max_tokens": 5,
                    },
                )
                if response.status_code == 200:
                    return {"valid": True, "message": f"{provider_info['name']} API Key 验证成功"}
                else:
                    try:
                        error_detail = response.json().get("error", {}).get("message", "未知错误")
                    except Exception:
                        error_detail = f"HTTP {response.status_code}"
                    return {"valid": False, "message": f"验证失败: {error_detail}"}
        except Exception as e:
            return {"valid": False, "message": f"验证请求失败: {str(e)}"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                base_url + "/chat/completions",
                headers={
                    "Authorization": f"Bearer {req.llm_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model_name,
                    "messages": [{"role": "user", "content": "test"}],
                    "max_tokens": 5,
                },
            )
            if response.status_code == 200:
                return {"valid": True, "message": f"{provider_info['name']} API Key 验证成功"}
            else:
                try:
                    error_detail = response.json().get("error", {}).get("message", "未知错误")
                except Exception:
                    error_detail = f"HTTP {response.status_code}"
                return {"valid": False, "message": f"验证失败: {error_detail}"}
    except Exception as e:
        return {"valid": False, "message": f"验证请求失败: {str(e)}"}


@router.get("/check-apikey")
async def check_apikey():
    has_key = settings.is_api_key_configured()
    return {"configured": has_key, "provider": settings._user_provider or settings.LLM_PROVIDER}
