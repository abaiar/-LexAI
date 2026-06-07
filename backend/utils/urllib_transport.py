"""自定义 httpx Transport，底层使用 urllib 发送请求。
解决 httpx 在某些环境下无法建立 HTTPS 连接的问题。"""
import json
import httpx
import urllib.request
import urllib.error
import urllib.parse


class UrllibTransport(httpx.BaseTransport):
    """使用 urllib 的同步 httpx Transport"""

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        method = request.method
        url = str(request.url)
        headers = dict(request.headers)
        body = request.content

        if method == "GET":
            req = urllib.request.Request(url, headers=headers, method="GET")
        elif method == "POST":
            req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        elif method == "PUT":
            req = urllib.request.Request(url, data=body, headers=headers, method="PUT")
        elif method == "DELETE":
            req = urllib.request.Request(url, data=body if body else None, headers=headers, method="DELETE")
        else:
            req = urllib.request.Request(url, data=body if body else None, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return httpx.Response(
                    status_code=resp.status,
                    headers=dict(resp.headers),
                    content=resp.read(),
                    request=request,
                )
        except urllib.error.HTTPError as e:
            return httpx.Response(
                status_code=e.code,
                headers=dict(e.headers) if e.headers else {},
                content=e.read() if e.fp else b"",
                request=request,
            )


class AsyncUrllibTransport(httpx.AsyncBaseTransport):
    """使用 urllib 的异步 httpx Transport（通过线程池执行）"""

    def __init__(self):
        self._sync_transport = UrllibTransport()

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._sync_transport.handle_request, request
        )


def get_http_client(async_client: bool = True):
    """获取使用 urllib transport 的 httpx 客户端"""
    if async_client:
        return httpx.AsyncClient(transport=AsyncUrllibTransport())
    else:
        return httpx.Client(transport=UrllibTransport())
