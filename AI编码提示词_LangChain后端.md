# 🧑‍💻 AI Coding 提示词：小理智法 AI —— LangChain + FastAPI 后端

> 将以下内容完整复制粘贴到 Codebuddy（或任何 AI 编码工具），一次性生成完整后端项目。

---

## 🎯 任务目标

你是一位资深 Python 后端工程师，请帮我用 **LangChain + FastAPI** 生成一套完整的后端服务，用于对接我已完成的 Vue3 前端项目"小理智法 AI"。

---

## 📂 项目结构要求

请生成如下目录结构：

```
backend/
├── main.py                  # FastAPI 入口，注册所有路由
├── config.py                # 全局配置（环境变量、API Keys）
├── requirements.txt         # 依赖列表
├── .env.example             # 环境变量示例文件
│
├── routers/
│   ├── auth.py              # 登录/注册路由
│   ├── chat.py              # 多轮法律咨询路由（SSE 流式）
│   ├── contract.py          # 合同审查路由
│   ├── docgen.py            # 法律文书生成路由
│   └── cases.py             # 案件档案 CRUD 路由
│
├── agents/
│   ├── chat_agent.py        # 多轮咨询 LangChain Agent（核心）
│   ├── contract_agent.py    # 合同审查 Agent
│   └── docgen_agent.py      # 文书生成 Agent
│
├── tools/
│   ├── deli_case_tool.py    # 得理案例检索 Tool
│   ├── deli_law_tool.py     # 得理法规检索 Tool
│   └── law_parser.py        # 法律文本解析工具函数
│
├── memory/
│   └── session_memory.py    # 会话记忆管理（基于 session_id）
│
└── models/
    ├── request_models.py    # Pydantic 请求体定义
    └── response_models.py   # Pydantic 响应体定义
```

---

## 🔌 前端接口清单（严格对照此表实现）

### 1. 认证模块 `POST /api/auth/login`
- 请求体：`{ "email": str, "password": str }`
- 响应：`{ "access_token": str, "token_type": "bearer", "user": { "name": str, "email": str, "plan": str } }`
- 实现：暂用内存字典模拟用户数据库，预置账号 `admin@example.com / 123456`

### 2. 认证模块 `POST /api/auth/register`
- 请求体：`{ "name": str, "email": str, "password": str }`
- 响应：`{ "message": "注册成功", "user": {...} }`

### 3. 多轮法律咨询 `POST /api/chat/send`（⚡ SSE 流式响应）
- 请求体：
  ```json
  {
    "message": "string（用户输入）",
    "session_id": "string（会话ID，前端生成UUID）",
    "history": [ {"role": "user/assistant", "content": "..."} ]
  }
  ```
- 响应类型：`text/event-stream`（SSE 流）
- 每个 SSE 事件格式：
  ```
  data: {"type": "agent_step", "content": "[Agent 工作流启动]\n1. 意图识别..."}
  data: {"type": "token", "content": "针对您的问题..."}
  data: {"type": "done", "content": ""}
  ```

### 4. 合同审查 `POST /api/contract/review`
- 请求体：`multipart/form-data`，包含 `file`（PDF/DOCX）或 `text`（合同纯文本）
- 响应：
  ```json
  {
    "risk_items": [
      {
        "level": "high/medium/low",
        "clause": "原条款文本",
        "reason": "风险原因",
        "suggestion": "修改建议"
      }
    ],
    "missing_clauses": ["保密条款", "违约金条款"],
    "summary": "审查总结",
    "score": 72
  }
  ```

### 5. 法律文书生成 `POST /api/docgen/generate`
- 请求体：
  ```json
  {
    "doc_type": "劳动仲裁申请书 | 起诉状 | 律师函 | 离婚协议书",
    "plaintiff": "申请人姓名",
    "defendant": "被申请人名称",
    "fact": "案情描述",
    "demands": "诉求说明（可选）"
  }
  ```
- 响应：`{ "document_text": "完整文书内容", "template_used": "模板名称" }`

### 6. 案件档案 CRUD
- `GET /api/cases` → 返回案件列表（带分页）
- `POST /api/cases` → 创建新案件档案
- `GET /api/cases/{case_id}` → 获取单个案件详情（含历史对话、文书列表）
- `PUT /api/cases/{case_id}` → 更新案件信息
- `DELETE /api/cases/{case_id}` → 删除案件

### 7. 账户配置 `PUT /api/account/config`
- 请求体：`{ "llm_api_key": str, "model_name": str }`
- 响应：`{ "message": "配置已保存" }`

---

## 🤖 LangChain Agent 实现要求

### chat_agent.py（最核心）

使用 **LangChain AgentExecutor** 实现多步推理，包含以下工具：

**Tool 1：意图识别**（内嵌到 Prompt，不单独作 Tool）
在 System Prompt 中指定：先判断用户意图（案例检索 / 法规检索 / 通用法律咨询），再决定调用哪个工具。

**Tool 2：得理案例检索 Tool**
```python
# 调用得理 API
POST https://openapi.delilegal.com/api/qa/v3/search/queryListCase
Headers: appid=YOUR_DELI_APPID, secret=YOUR_DELI_SECRET
Body: {
  "pageNo": 1,
  "pageSize": 5,
  "sortField": "correlation",
  "sortOrder": "desc",
  "condition": {
    "keywordArr": ["用户问题关键词"]  # 注意：必须是数组类型 [str]
  }
}
```

**Tool 3：得理法规检索 Tool**
```python
POST https://openapi.delilegal.com/api/qa/v3/search/queryListLaw
Headers: appid=YOUR_DELI_APPID, secret=YOUR_DELI_SECRET
Body: {
  "pageNo": 1,
  "pageSize": 5,
  "sortField": "correlation",
  "sortOrder": "desc",
  "condition": {
    "keywords": ["用户问题"],
    "fieldName": "semantic"
  }
}
```

**Tool 4：法规详情获取 Tool**
```python
GET https://openapi.delilegal.com/api/qa/v3/search/lawInfo?lawId={id}&merge=true
Headers: appid=YOUR_DELI_APPID, secret=YOUR_DELI_SECRET
```

**System Prompt（中文）：**
```
你是"小理智法 AI"，一个基于中国法律的专业法律咨询助手。你的工作流程：
1. 分析用户问题，判断是否需要检索案例或法规
2. 如需案例支撑，调用案例检索工具并引用真实案例（禁止编造）
3. 如需法条依据，调用法规检索工具获取相关法律条文
4. 综合以上信息，给出结构清晰的法律分析报告
格式要求：总分总结构，包含【适用法规】【相似类案】【法律建议】三个部分。
严禁：编造案例编号、引用不存在的法条、提供非中国法律的回答。
```

**记忆管理：**
- 使用 `ConversationBufferWindowMemory(k=10)` 维持最近10轮对话
- 按 `session_id` 存储到内存字典中（`Dict[str, Memory]`）

**流式输出：**
- 使用 `AsyncIteratorCallbackHandler` 实现 token 级别的 SSE 流式输出
- Agent 的每一步 action 也作为 SSE 事件推送（type=agent_step）

### contract_agent.py

使用 `LLMChain` 实现，Prompt 要求：
1. 逐条扫描合同文本
2. 识别风险条款（霸王条款、权利不对等、模糊表述）
3. 检测缺失的必要条款（保密、违约金、争议解决、不可抗力）
4. 为每个风险条款给出具体修改建议
5. 输出 JSON 格式结果（严格按响应模型格式）

### docgen_agent.py

使用 `LLMChain` + 文书模板库实现：
- 内置至少 4 种文书模板（劳动仲裁申请书、民事起诉状、律师函、离婚协议书）
- 根据 `doc_type` 选择对应模板
- 用 LLM 填充案情细节、自动扩写事实经过
- 确保文书格式符合中国司法实务规范

---

## 🛠️ 技术规范

### 依赖版本（requirements.txt）
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
langchain==0.2.6
langchain-openai==0.1.13     # 用于兼容Qwen等 OpenAI 协议模型
langchain-community==0.2.6
pydantic==2.7.4
python-multipart==0.0.9      # 支持文件上传
python-jose[cryptography]==3.3.0  # JWT Token
passlib[bcrypt]==1.7.4
httpx==0.27.0                # 调用得理 API
python-dotenv==1.0.1
aiofiles==23.2.1
```

### .env.example
```
# LLM 配置 （使用qwen-turbo模型）
DASHSCOPE_API_KEY=your-dashscope-api-key-here
LLM_MODEL_NAME=qwen-turbo



# 得理开放平台（无需修改）
DELI_APPID=your-deli-appid-here
DELI_SECRET=your-deli-secret-here

# JWT
SECRET_KEY=your-jwt-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# 服务配置
BACKEND_PORT=8000
```

### CORS 配置（main.py）
```python
# 允许前端跨域访问
origins = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5500"]
```

### 错误处理规范
- 所有接口统一异常响应格式：`{ "code": int, "message": str, "detail": str }`
- 得理 API 调用失败时降级为纯 LLM 回答，不让用户感知
- 流式接口出错时推送：`data: {"type": "error", "content": "错误信息"}`

---

## 🧪 启动与测试

请在项目根目录生成 `README.md`，包含：
1. 安装依赖命令：`pip install -r requirements.txt`
2. 配置 .env 文件说明
3. 启动命令：`uvicorn main:app --reload --port 8000`
4. Swagger 文档地址：`http://localhost:8000/docs`
5. 每个接口的 curl 测试示例

---

## ⚠️ 重要注意事项

1. **得理 API keywordArr 参数必须是数组类型** `["关键词"]`，不能是字符串，需在代码中强制转换
2. **流式响应** 使用 FastAPI 的 `StreamingResponse` + `text/event-stream` Content-Type
3. **会话隔离**：不同 session_id 的对话记忆完全隔离，使用全局字典管理
4. **文件上传**：合同审查支持 PDF 和 TXT，使用 `python-multipart` 处理，PDF 解析使用 `pypdf` 或纯文本读取
5. **所有 Agent 的 LLM 调用** 统一从 `config.py` 读取配置，支持运行时通过 `/api/account/config` 接口热更新 API Key

现在请开始生成完整代码，每个文件都要完整可运行，不要省略任何函数体。
