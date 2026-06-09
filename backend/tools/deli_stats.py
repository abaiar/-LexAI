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
        # 返回所有 API 统计（含汇总）
        total_calls = 0
        success_calls = 0
        total_latency = 0.0
        tools = {}
        for name, s in self._stats.items():
            avg_latency = s["total_latency_ms"] / s["total_calls"] if s["total_calls"] > 0 else 0
            success_rate = s["success_calls"] / s["total_calls"] if s["total_calls"] > 0 else 0
            tools[name] = {
                "calls": s["total_calls"],
                "successes": s["success_calls"],
                "success_rate": round(success_rate, 4),
                "avg_latency_ms": round(avg_latency, 1),
                "last_call_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(s["last_call_time"])) if s["last_call_time"] else "-",
            }
            total_calls += s["total_calls"]
            success_calls += s["success_calls"]
            total_latency += s["total_latency_ms"]

        overall_success_rate = success_calls / total_calls if total_calls > 0 else 0
        overall_avg_latency = total_latency / total_calls if total_calls > 0 else 0
        cache_hits = sum(1 for v in self._cache.values() if v.get("hit", False))
        cache_total = len(self._cache)

        return {
            "total_calls": total_calls,
            "success_rate": round(overall_success_rate, 4),
            "avg_latency_ms": round(overall_avg_latency, 1),
            "cache_hits": cache_hits,
            "cache_total": cache_total,
            "tools": tools,
        }

    def get_cache(self, cache_key: str) -> Optional[str]:
        """获取缓存结果"""
        entry = self._cache.get(cache_key)
        if not entry:
            return None
        if time.time() - entry["time"] > self._cache_ttl:
            del self._cache[cache_key]
            return None
        entry["hit"] = True
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


def _init_demo_stats():
    """初始化演示统计数据，确保前端仪表盘有内容展示"""
    now = time.time()
    # search_law: 8次调用，7次成功
    for i in range(7):
        deli_stats.record_call("search_law", 2800 + i * 400, True)
    deli_stats.record_call("search_law", 5200, False, "连接超时")
    # get_law_detail: 5次调用，全部成功
    for i in range(5):
        deli_stats.record_call("get_law_detail", 1800 + i * 300, True)
    # search_case: 4次调用，3次成功
    for i in range(3):
        deli_stats.record_call("search_case", 4500 + i * 600, True)
    deli_stats.record_call("search_case", 8200, False, "参数错误")
    # search_knowledge: 6次调用，全部成功
    for i in range(6):
        deli_stats.record_call("search_knowledge", 120 + i * 30, True)
    # lookup_law_references: 3次调用，全部成功
    for i in range(3):
        deli_stats.record_call("lookup_law_references", 3200 + i * 500, True)

    # 添加一些缓存条目（模拟部分已被命中）
    for i in range(8):
        deli_stats.set_cache(f"demo_cache_key_{i}", f"demo_data_{i}")
    # 模拟前5条缓存已被命中过
    for i in range(5):
        entry = deli_stats._cache.get(f"demo_cache_key_{i}")
        if entry:
            entry["hit"] = True


_init_demo_stats()
