import os
from dotenv import load_dotenv

load_dotenv()

# 全局修复 httpx HTTPS 连接问题：monkey-patch httpx.AsyncClient
# 使其默认使用 urllib transport，解决本机 httpx 无法建立 HTTPS 连接的问题
import httpx
from utils.urllib_transport import AsyncUrllibTransport, UrllibTransport

_original_async_client_init = httpx.AsyncClient.__init__
_original_client_init = httpx.Client.__init__


def _patched_async_client_init(self, **kwargs):
    if "transport" not in kwargs and kwargs.get("verify", True) is not False:
        kwargs["transport"] = AsyncUrllibTransport()
        kwargs["verify"] = False
    _original_async_client_init(self, **kwargs)


def _patched_client_init(self, **kwargs):
    if "transport" not in kwargs and kwargs.get("verify", True) is not False:
        kwargs["transport"] = UrllibTransport()
        kwargs["verify"] = False
    _original_client_init(self, **kwargs)


httpx.AsyncClient.__init__ = _patched_async_client_init
httpx.Client.__init__ = _patched_client_init


LLM_PROVIDERS = {
    "dashscope": {
        "name": "阿里云百炼 (DashScope)",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "models": ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-long", "qwen-max-longcontext"],
        "default_model": "qwen-turbo",
        "key_prefix": "sk-",
        "key_hint": "sk-开头的 API Key",
        "api_key_env": "DASHSCOPE_API_KEY",
    },
    "tencent_hunyuan": {
        "name": "腾讯混元 (Hunyuan)",
        "base_url": "https://api.hunyuan.cloud.tencent.com/v1",
        "models": ["hunyuan-lite", "hunyuan-standard", "hunyuan-pro", "hunyuan-turbo", "hunyuan-turbo-latest"],
        "default_model": "hunyuan-lite",
        "key_prefix": "",
        "key_hint": "腾讯云 API Key",
        "api_key_env": "TENCENT_HUNYUAN_API_KEY",
    },
    "openai": {
        "name": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
        "default_model": "gpt-4o-mini",
        "key_prefix": "sk-",
        "key_hint": "sk-开头的 API Key",
        "api_key_env": "OPENAI_API_KEY",
    },
    "deepseek": {
        "name": "DeepSeek",
        "base_url": "https://api.deepseek.com/v1",
        "models": ["deepseek-chat", "deepseek-reasoner"],
        "default_model": "deepseek-chat",
        "key_prefix": "sk-",
        "key_hint": "sk-开头的 API Key",
        "api_key_env": "DEEPSEEK_API_KEY",
    },
    "zhipu": {
        "name": "智谱 AI (GLM)",
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "models": ["glm-4-plus", "glm-4-flash", "glm-4-long", "glm-4"],
        "default_model": "glm-4-flash",
        "key_prefix": "",
        "key_hint": "智谱 API Key (xxx.xxxxx格式)",
        "api_key_env": "ZHIPU_API_KEY",
    },
    "moonshot": {
        "name": "Moonshot (Kimi)",
        "base_url": "https://api.moonshot.cn/v1",
        "models": ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
        "default_model": "moonshot-v1-8k",
        "key_prefix": "sk-",
        "key_hint": "sk-开头的 API Key",
        "api_key_env": "MOONSHOT_API_KEY",
    },
    "minimax": {
        "name": "MiniMax",
        "base_url": "https://api.minimax.chat/v1",
        "models": ["MiniMax-Text-01", "abab6.5s-chat"],
        "default_model": "MiniMax-Text-01",
        "key_prefix": "",
        "key_hint": "MiniMax API Key",
        "api_key_env": "MINIMAX_API_KEY",
    },
    "anthropic": {
        "name": "Anthropic (Claude)",
        "base_url": "https://api.anthropic.com/v1",
        "models": ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
        "default_model": "claude-sonnet-4-20250514",
        "key_prefix": "sk-ant-",
        "key_hint": "sk-ant-开头的 API Key",
        "api_key_env": "ANTHROPIC_API_KEY",
    },
    "google": {
        "name": "Google (Gemini)",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
        "models": ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro"],
        "default_model": "gemini-2.0-flash",
        "key_prefix": "AI",
        "key_hint": "AI开头的 API Key",
        "api_key_env": "GOOGLE_API_KEY",
    },
}


class Settings:
    DASHSCOPE_API_KEY: str = os.getenv("DASHSCOPE_API_KEY", "")
    TENCENT_HUNYUAN_API_KEY: str = os.getenv("TENCENT_HUNYUAN_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    ZHIPU_API_KEY: str = os.getenv("ZHIPU_API_KEY", "")
    MOONSHOT_API_KEY: str = os.getenv("MOONSHOT_API_KEY", "")
    MINIMAX_API_KEY: str = os.getenv("MINIMAX_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")

    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "dashscope")
    LLM_MODEL_NAME: str = os.getenv("LLM_MODEL_NAME", "qwen-turbo")
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", LLM_PROVIDERS["dashscope"]["base_url"])

    DELI_APPID: str = os.getenv("DELI_APPID", "")
    DELI_SECRET: str = os.getenv("DELI_SECRET", "")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-jwt-secret-key-here")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))

    ALGORITHM: str = "HS256"

    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_NAME: str = os.getenv("DB_NAME", "lax_user_db")

    _user_provider: str = ""
    _user_api_key: str = ""
    _user_model: str = ""

    def get_active_api_key(self) -> str:
        if self._user_api_key:
            return self._user_api_key
        provider = self._user_provider or self.LLM_PROVIDER
        env_key = LLM_PROVIDERS.get(provider, {}).get("api_key_env", "DASHSCOPE_API_KEY")
        return getattr(self, env_key, "") or self.DASHSCOPE_API_KEY

    def get_active_base_url(self) -> str:
        if self._user_provider:
            return LLM_PROVIDERS.get(self._user_provider, {}).get("base_url", self.LLM_BASE_URL)
        return self.LLM_BASE_URL

    def get_active_model(self) -> str:
        if self._user_model:
            return self._user_model
        return self.LLM_MODEL_NAME

    def update_llm_config(self, provider: str = "", api_key: str = "", model_name: str = ""):
        if provider:
            self._user_provider = provider
        if api_key:
            self._user_api_key = api_key
        if model_name:
            self._user_model = model_name

    def is_api_key_configured(self) -> bool:
        return bool(self.get_active_api_key())

    def get_provider_info(self, provider: str) -> dict:
        return LLM_PROVIDERS.get(provider, {})


settings = Settings()


def get_llm(**kwargs):
    """创建 LLM 客户端，自动使用 urllib transport 解决 httpx 连接问题"""
    from langchain_openai import ChatOpenAI
    from utils.urllib_transport import get_http_client

    api_key = kwargs.pop("api_key", None) or settings.get_active_api_key()
    base_url = kwargs.pop("base_url", None) or settings.get_active_base_url()
    model_name = kwargs.pop("model_name", None) or settings.get_active_model()

    return ChatOpenAI(
        model=model_name,
        api_key=api_key,
        base_url=base_url,
        http_async_client=get_http_client(async_client=True),
        http_client=get_http_client(async_client=False),
        **kwargs,
    )
