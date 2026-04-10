import httpx
import json

base = "http://localhost:8000"

print("=== 1. 登录测试 ===")
r = httpx.post(f"{base}/api/auth/login", json={"email": "your-email@example.com", "password": "your-password"})
print(f"Status: {r.status_code}")
data = r.json()
token = data.get("access_token", "")
print(f"Token: {token[:30]}...")
user = data.get("user", {})
print(f"User: {user.get('name', '')}")

print()
print("=== 2. 注册测试 ===")
r = httpx.post(f"{base}/api/auth/register", json={"name": "testuser", "email": "test@example.com", "password": "test-password"})
print(f"Status: {r.status_code}")
print(f"Message: {r.json().get('message', '')}")

print()
print("=== 3. 案件列表 ===")
r = httpx.get(f"{base}/api/cases")
print(f"Status: {r.status_code}")
print(f"Total: {r.json().get('total', 0)}")

print()
print("=== 4. 创建案件 ===")
r = httpx.post(f"{base}/api/cases", json={"title": "labor case", "case_type": "labor", "description": "wage issue", "plaintiff": "Zhang", "defendant": "Company"})
print(f"Status: {r.status_code}")
case_id = r.json().get("id", "")
print(f"Case ID: {case_id}")

print()
print("=== 5. 获取案件详情 ===")
r = httpx.get(f"{base}/api/cases/{case_id}")
print(f"Status: {r.status_code}")
print(f"Title: {r.json().get('title', '')}")

print()
print("=== 6. 更新案件 ===")
r = httpx.put(f"{base}/api/cases/{case_id}", json={"status": "closed"})
print(f"Status: {r.status_code}")
print(f"Status: {r.json().get('status', '')}")

print()
print("=== 7. 账户配置 ===")
r = httpx.put(f"{base}/api/account/config", json={"llm_api_key": "sk-test", "model_name": "qwen-turbo"})
print(f"Status: {r.status_code}")
print(f"Message: {r.json().get('message', '')}")

print()
print("=== 8. 文书生成 ===")
r = httpx.post(f"{base}/api/docgen/generate", json={"doc_type": "律师函", "plaintiff": "Li", "defendant": "YY Corp", "fact": "breach of contract", "demands": "compensation"}, timeout=60)
print(f"Status: {r.status_code}")
result = r.json()
print(f"Template: {result.get('template_used', '')}")
print(f"Text length: {len(result.get('document_text', ''))}")

print()
print("=== 9. 删除案件 ===")
r = httpx.delete(f"{base}/api/cases/{case_id}")
print(f"Status: {r.status_code}")
print(f"Message: {r.json().get('message', '')}")

print()
print("=== 10. 健康检查 ===")
r = httpx.get(f"{base}/health")
print(f"Status: {r.status_code}")
print(f"Result: {r.json()}")

print()
print("All tests completed!")
