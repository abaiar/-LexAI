import httpx
import json

base = "http://localhost:8000"

print("=== SSE Chat Test ===")
with httpx.stream("POST", f"{base}/api/chat/send", json={
    "message": "公司拖欠工资三个月怎么办",
    "session_id": "test-session-001",
    "history": []
}, timeout=60) as r:
    print(f"Status: {r.status_code}")
    print(f"Content-Type: {r.headers.get('content-type', '')}")
    print()
    for line in r.iter_lines():
        if line.startswith("data: "):
            data_str = line[6:]
            try:
                data = json.loads(data_str)
                msg_type = data.get("type", "")
                content = data.get("content", "")
                if msg_type == "agent_step":
                    print(f"[AGENT] {content}")
                elif msg_type == "token":
                    print(content, end="", flush=True)
                elif msg_type == "error":
                    print(f"\n[ERROR] {content}")
                elif msg_type == "done":
                    print("\n[DONE]")
            except json.JSONDecodeError:
                print(f"[RAW] {data_str}")

print("\nSSE test completed!")
