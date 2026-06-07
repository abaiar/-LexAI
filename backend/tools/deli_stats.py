"""得理 API 调用统计与缓存管理"""
import time
import threading
from collections import defaultdict
from typing import Optional, Dict, Any


class DeliStats:
    """得理 API 调用统计单例"""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._init()
        return cls._instance

    def _init(self):
        self._stats = defaultdict(lambda: {
            "total_calls": 0,
            "success_calls": 0,
            "fail_calls": 0,
            "total_latency_ms": 0.0,
            "last_error": None,
            "last_call_time": None,
        })
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_ttl = 3600  # 缓存有效期1小时

    def record_call(self, api_name: str, latency_ms: float, success: bool, error: str = None):
        """记录一次 API 调用"""
        s = self._stats[api_name]
        s["total_calls"] += 1
        s["total_latency_ms"] += latency_ms
        s["last_call_time"] = time.time()
        if success:
            s["success_calls"] += 1
        else:
            s["fail_calls"] += 1
            s["last_error"] = error

    def get_stats(self, api_name: str = None) -> dict:
        """获取调用统计"""
        if api_name:
            s = self._stats.get(api_name)
            if not s:
                return {}
            avg_latency = s["total_latency_ms"] / s["total_calls"] if s["total_calls"] > 0 else 0
            success_rate = s["success_calls"] / s["total_calls"] if s["total_calls"] > 0 else 0
            return {
                "api_name": api_name,
                "total_calls": s["total_calls"],
                "success_calls": s["success_calls"],
                "fail_calls": s["fail_calls"],
                "success_rate": f"{success_rate:.1%}",
                "avg_latency_ms": f"{avg_latency:.1f}",
                "last_error": s["last_error"],
            }
        # 返回所有 API 统计
        result = {}
        for name in self._stats:
            result[name] = self.get_stats(name)
        return result

    def get_cache(self, cache_key: str) -> Optional[str]:
        """获取缓存结果"""
        entry = self._cache.get(cache_key)
        if not entry:
            return None
        if time.time() - entry["time"] > self._cache_ttl:
            del self._cache[cache_key]
            return None
        return entry["data"]

    def set_cache(self, cache_key: str, data: str):
        """设置缓存"""
        self._cache[cache_key] = {"data": data, "time": time.time()}
        # 限制缓存大小
        if len(self._cache) > 500:
            oldest_key = min(self._cache, key=lambda k: self._cache[k]["time"])
            del self._cache[oldest_key]

    def clear_cache(self):
        """清空缓存"""
        self._cache.clear()

    def get_cache_stats(self) -> dict:
        """获取缓存统计"""
        return {
            "cache_size": len(self._cache),
            "cache_ttl_seconds": self._cache_ttl,
        }


# 全局单例
deli_stats = DeliStats()
