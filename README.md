<div align="center">

# ⚖️ 小理智法 AI / LexAI

**基于大语言模型的智能法律咨询平台**

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg)](https://fastapi.tiangolo.com/)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D.svg)](https://vuejs.org/)
[![LangChain](https://img.shields.io/badge/LangChain-0.2.6-1C3C3C.svg)](https://www.langchain.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**[English](README_EN.md)** | 简体中文

</div>

---

### 📖 项目概述

小理智法 AI 是一款基于大语言模型（LLM）的智能法律咨询平台，集成了法律咨询、合同审查、文书生成、合同起草、合同对比、智能校对、法律文书解读等多项 AI 法律服务。系统采用 LangChain Agent 架构，结合得理法律数据库 API 实现案例检索与法规检索，为用户提供专业、准确、有据可查的法律分析与建议。

### ✨ 核心功能

| 功能模块 | 描述 |
|---------|------|
| 🤖 **多轮法律咨询** | 基于 LangChain Agent 的多步推理法律咨询，支持 SSE 流式输出，自动调用案例/法规检索工具 |
| 📝 **合同审查** | 上传合同文件（PDF/DOCX/TXT/图片），AI 识别风险条款、缺失条款，给出评分与修改建议 |
| 📄 **法律文书生成** | 支持劳动仲裁申请书、民事起诉状、律师函、离婚协议书等多种文书模板，AI 自动扩写 |
| 📋 **合同智能起草** | 6 大分类 45+ 合同模板，支持要素填写→大纲生成→合同生成的全流程智能起草 |
| 🔄 **合同对比** | 上传原始/修订版合同，AI 逐条对比差异，评估法律风险与影响 |
| ✏️ **AI 智能校对** | 全面的中文文档校对，识别语法、拼写、标点、用词等错误，提供修正建议 |
| 🔍 **法律文书解读** | 将复杂法律文书转化为通俗语言，解读关键条款、权利义务、风险提示 |
| 👷 **劳动纠纷维权 Agent** | 专注劳动法领域，提供工资拖欠、违法辞退、工伤认定等专业咨询 |
| 🏢 **企业合规检查 Agent** | 专注企业合规，覆盖劳动用工、数据安全、反垄断等合规领域 |
| 💍 **婚姻与财产分割 Agent** | 专注婚姻家庭法，涵盖离婚、财产分割、子女抚养等咨询 |
| 📁 **案件档案管理** | 案件 CRUD 管理，关联对话记录与文书 |
| 🔐 **用户认证与多模型配置** | JWT 认证，支持 8+ 大模型厂商 API Key 动态切换 |

### 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Vue 3)                  │
│  Vue 3 + TypeScript + Pinia + Tailwind CSS + Vite   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / SSE
┌──────────────────────▼──────────────────────────────┐
│                   Backend (FastAPI)                   │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │  Routers │ │  Agents  │ │  Tools   │ │ Models  │ │
│  │ (14 API) │ │ (9 Agent)│ │ (4 Tool) │ │(Pydantic)│ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────────┘ │
│       │            │            │                     │
│  ┌────▼────────────▼────────────▼──────────────────┐ │
│  │              LangChain + LLM                     │ │
│  │  (ChatOpenAI / AgentExecutor / Memory / Chains)  │ │
│  └──────────────────────┬──────────────────────────┘ │
│                         │                             │
│  ┌──────────────────────▼──────────────────────────┐ │
│  │           External API Integrations              │ │
│  │  ┌──────────────┐  ┌──────────────────────────┐ │ │
│  │  │  得理法律数据库  │  │  8+ LLM Providers       │ │ │
│  │  │  (案例/法规检索) │  │  (DashScope/OpenAI/     │ │ │
│  │  │              │  │   DeepSeek/Zhipu/...)    │ │ │
│  │  └──────────────┘  └──────────────────────────┘ │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │              MySQL / Memory Storage              │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

#### 后端技术栈

| 技术 | 用途 |
|------|------|
| **FastAPI** | 高性能异步 Web 框架 |
| **LangChain** | LLM 应用开发框架（Agent、Chain、Memory、Tool） |
| **langchain-openai** | OpenAI 协议兼容的 LLM 接入 |
| **Pydantic** | 数据验证与序列化 |
| **aiomysql** | 异步 MySQL 数据库驱动 |
| **python-jose** | JWT Token 认证 |
| **httpx** | 异步 HTTP 客户端 |
| **pypdf** | PDF 文件解析 |
| **uvicorn** | ASGI 服务器 |

#### 前端技术栈

| 技术 | 用途 |
|------|------|
| **Vue 3** | 渐进式前端框架（Composition API） |
| **TypeScript** | 类型安全 |
| **Pinia** | 状态管理 |
| **Tailwind CSS** | 原子化 CSS 框架 |
| **Vite** | 构建工具 |
| **Lucide Vue** | 图标库 |

#### 支持的 LLM 厂商

| 厂商 | 默认模型 |
|------|---------|
| 阿里云百炼 (DashScope) | qwen-turbo |
| OpenAI | gpt-4o-mini |
| DeepSeek | deepseek-chat |
| 智谱 AI (GLM) | glm-4-flash |
| Moonshot (Kimi) | moonshot-v1-8k |
| MiniMax | MiniMax-Text-01 |
| Anthropic (Claude) | claude-sonnet-4-20250514 |
| Google (Gemini) | gemini-2.0-flash |

### 📂 项目结构

```
LegalTech_AI/
├── backend/                          # 后端服务
│   ├── main.py                       # FastAPI 入口
│   ├── config.py                     # 全局配置（多 LLM 厂商支持）
│   ├── database.py                   # MySQL 数据库（支持内存降级）
│   ├── requirements.txt              # Python 依赖
│   ├── .env.example                  # 环境变量示例
│   ├── agents/                       # LangChain Agent 模块
│   │   ├── chat_agent.py             # 多轮法律咨询 Agent
│   │   ├── contract_agent.py         # 合同审查 Agent
│   │   ├── contract_draft_agent.py   # 合同智能起草 Agent
│   │   ├── contract_compare_agent.py # 合同对比 Agent
│   │   ├── docgen_agent.py           # 法律文书生成 Agent
│   │   ├── doc_interpret_agent.py    # 法律文书解读 Agent
│   │   ├── proofread_agent.py        # AI 智能校对 Agent
│   │   ├── labor_agent.py            # 劳动纠纷维权 Agent
│   │   ├── compliance_agent.py       # 企业合规检查 Agent
│   │   ├── marriage_agent.py         # 婚姻与财产分割 Agent
│   │   ├── contract_templates.py     # 合同模板库（6 大分类 45+ 模板）
│   │   └── docgen_templates.py       # 法律文书模板库
│   ├── routers/                      # API 路由
│   │   ├── auth.py                   # 认证（登录/注册/重置密码）
│   │   ├── chat.py                   # 多轮法律咨询
│   │   ├── contract.py               # 合同审查
│   │   ├── contract_draft.py         # 合同智能起草
│   │   ├── contract_compare.py       # 合同对比
│   │   ├── docgen.py                 # 法律文书生成 V1
│   │   ├── docgen_v2.py              # 法律文书生成 V2（模板化）
│   │   ├── doc_interpret.py          # 法律文书解读
│   │   ├── proofread.py              # AI 智能校对
│   │   ├── labor.py                  # 劳动纠纷维权
│   │   ├── compliance.py             # 企业合规检查
│   │   ├── marriage.py               # 婚姻与财产分割
│   │   ├── cases.py                  # 案件档案管理
│   │   └── account.py                # 账户与 LLM 配置
│   ├── tools/                        # LangChain Tool 模块
│   │   ├── deli_case_tool.py         # 得理案例检索 Tool
│   │   ├── deli_law_tool.py          # 得理法规检索 Tool
│   │   ├── ocr_extractor.py          # 文件解析与 OCR Tool
│   │   └── law_parser.py             # 法律文本解析工具
│   ├── memory/                       # 会话记忆管理
│   │   └── session_memory.py         # 基于 session_id 的会话记忆
│   └── models/                       # 数据模型
│       ├── request_models.py         # 请求体定义
│       └── response_models.py        # 响应体定义
├── vue-project/                      # 前端应用
│   ├── src/
│   │   ├── App.vue                   # 主应用组件
│   │   ├── main.ts                   # 入口文件
│   │   ├── router/                   # 路由配置
│   │   ├── services/api.ts           # API 服务层
│   │   └── stores/auth.ts            # 认证状态管理
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
└── .gitignore
```

### 🚀 安装指南

#### 环境要求

- Python 3.10+
- Node.js 20.19+ 或 22.12+
- MySQL 8.0+（可选，支持内存模式运行）

#### 后端安装

```bash
# 1. 进入后端目录
cd backend

# 2. 创建虚拟环境
python -m venv venv

# Windows 激活
venv\Scripts\activate
# Linux/macOS 激活
source venv/bin/activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 API Key 和数据库配置
```

#### 前端安装

```bash
# 1. 进入前端目录
cd vue-project

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

### ⚙️ 配置方法

编辑 `backend/.env` 文件进行配置：

```env
# === LLM 配置 ===
# 选择 LLM 厂商：dashscope / openai / deepseek / zhipu / moonshot / minimax / anthropic / google
LLM_PROVIDER=dashscope
LLM_MODEL_NAME=qwen-turbo

# 对应厂商的 API Key（按需填写）
DASHSCOPE_API_KEY=your-dashscope-api-key-here
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
ZHIPU_API_KEY=
MOONSHOT_API_KEY=
MINIMAX_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# === 得理法律数据库 API ===
# 注册地址：https://openapi.delilegal.com
DELI_APPID=your-deli-appid-here
DELI_SECRET=your-deli-secret-here

# === JWT 认证 ===
SECRET_KEY=your-jwt-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# === 服务配置 ===
BACKEND_PORT=8000

# === 数据库配置（可选，不配置则使用内存模式） ===
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=lax_user_db
```

> **提示**：也可以在应用内通过「账户设置」页面动态配置 LLM 厂商和 API Key，无需修改环境变量。

### 📖 使用说明

#### 启动后端服务

```bash
cd backend
uvicorn main:app --reload --port 8000
```

启动后访问：
- API 服务：`http://localhost:8000`
- Swagger 文档：`http://localhost:8000/docs`
- 健康检查：`http://localhost:8000/health`

#### 启动前端服务

```bash
cd vue-project
npm run dev
```

访问 `http://localhost:5173` 即可使用。

#### API 接口概览

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/reset-password` | 重置密码 |
| POST | `/api/chat/send` | 多轮法律咨询（SSE 流式） |
| POST | `/api/contract/review` | 合同审查 |
| POST | `/api/contract-draft/outline` | 生成合同大纲 |
| POST | `/api/contract-draft/generate` | 生成合同文本 |
| POST | `/api/contract-compare/compare` | 合同对比 |
| POST | `/api/proofread/check` | 文档校对（文件上传） |
| POST | `/api/proofread/check-text` | 文档校对（文本输入） |
| POST | `/api/doc-interpret/interpret` | 法律文书解读 |
| POST | `/api/docgen/generate` | 法律文书生成 V1 |
| POST | `/api/docgen-v2/outline` | 法律文书生成 V2（大纲） |
| POST | `/api/docgen-v2/generate` | 法律文书生成 V2（生成） |
| POST | `/api/agent/labor/chat` | 劳动纠纷维权 Agent（SSE） |
| POST | `/api/agent/compliance/chat` | 企业合规检查 Agent（SSE） |
| POST | `/api/agent/marriage/chat` | 婚姻财产分割 Agent（SSE） |
| GET | `/api/cases` | 案件列表 |
| POST | `/api/cases` | 创建案件 |
| GET | `/api/account/providers` | 获取 LLM 厂商列表 |
| PUT | `/api/account/config` | 保存 LLM 配置 |
| POST | `/api/account/config/validate` | 验证 API Key |

### 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'Add some feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 提交 Pull Request

#### 开发规范

- 后端遵循 PEP 8 代码风格
- 前端使用 ESLint + Prettier 格式化
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
- 新增 API 需同步更新 Pydantic 模型和 Swagger 文档

### 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。
