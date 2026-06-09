<div align="center">

# ⚖️ 小理智法 AI / LexAI

**下一代智能体驱动的法律咨询平台 — 多 Agent 协作 · 自主决策 · 智能记忆**

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg)](https://fastapi.tiangolo.com/)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D.svg)](https://vuejs.org/)
[![LangChain](https://img.shields.io/badge/LangChain-0.2.6-1C3C3C.svg)](https://www.langchain.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-FF6B6B.svg)](https://github.com/langchain-ai/langgraph)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**[English](README_EN.md)** | 简体中文

</div>

---

## 🏆 AI Agents Hackathon 2026 参赛项目

本项目参加 **AI Agents Hackathon 2026**（由 HackIndia 主办），聚焦 **AI Agents & Autonomous Systems** 与 **Generative AI Applications** 赛道，展示下一代智能体在法律领域的深度应用。

### 评审维度对标

| 评审标准 | 项目亮点 |
|---------|---------|
| **Innovation & Originality** | 多 Agent 协作审查、三层记忆架构、Skills 可复用体系、NLU 自然语言提取 — 4 项创新特性 |
| **Technical Implementation** | Agent Harness 统一工程化、100% 真正 Agent（零固定 Chain）、完整执行追踪、自动降级策略 |
| **Real-world Usefulness** | 覆盖法律咨询/合同审查/文书生成/校对解读全流程，自然语言输入降低使用门槛 |
| **AI Agent Capabilities** | 自主工具调用、多 Agent 并行协作、记忆召回、法规引用自动查找 — 深度显著 |
| **Product Thinking** | 双模式交互（表单/自然语言）、智能追问、协作审查报告、调用统计仪表盘 |
| **Presentation Quality** | 可演示完整 Trace 回放、评估指标报告、多 Agent 协作过程可视化 |

---

## 📖 项目概述

小理智法 AI 是一款**智能体驱动**的法律咨询平台，突破了传统 LLM 应用的"单次问答"模式，实现了多 Agent 自主决策、协作推理、持久记忆的完整智能体工程体系。系统深度集成得理法律数据库 API，支持法规检索、案例检索、法规全文获取，结合本地知识库实现联合检索与智能缓存。

### 与传统法律 AI 的核心差异

| 维度 | 传统法律 AI | 小理智法 AI |
|------|-----------|------------|
| 架构模式 | 单 LLM 调用 / 固定 Chain | **100% 自主决策 Agent** |
| 审查模式 | 单次 LLM 输出 | **多 Agent 协作**（Planner→Executor×N→Reviewer） |
| 记忆能力 | 无状态 / 纯内存 | **三层记忆**（工作/会话/长期） |
| 工具调用 | 硬编码 | **统一 Registry + 权限控制** |
| 输入方式 | 仅表单 | **表单 + 自然语言双模式** |
| 知识来源 | 仅 API | **API + 本地知识库联合检索 + 智能缓存** |
| 可扩展性 | 新增领域需复制文件 | **Skills 体系，新增目录即可** |
| 可观测性 | 无 | **完整 Trace 追踪 + 调用统计** |

---

## ✨ 核心特性

### 🤖 智能体架构（Agent Architecture）

#### Agent Harness 工程化体系
所有 Agent 统一纳入 Harness 管理，提供工具注册、执行追踪、降级策略、权限控制、上下文压缩五大核心能力：

```
┌─────────────────────────────────────────────────┐
│                  Agent Harness                    │
│  ┌──────────┐ ┌───────┐ ┌──────────┐ ┌────────┐ │
│  │ Registry  │ │ Trace │ │ Fallback │ │Permission│ │
│  │ (7 tools) │ │(全链路)│ │(Agent→Chain)│ │(按Agent) │ │
│  └──────────┘ └───────┘ └──────────┘ └────────┘ │
│  ┌──────────────────────────────────────────────┐ │
│  │          Context Compaction (自动压缩)         │ │
│  └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

- **Registry**：7 个工具统一注册（search_law / get_law_detail / search_case / extract_fields / clarify_missing / search_knowledge / lookup_law_references），按 Agent 粒度控制可用工具
- **Trace**：记录每步决策（observe→think→act），含工具调用、耗时、结果，支持回放
- **Fallback**：Agent 调用失败时自动降级为 Chain 模式，确保服务可用
- **Permission**：每个 Agent 只能访问其权限范围内的工具
- **Context Compaction**：超长对话自动压缩，保留关键信息

#### Skills 可复用体系
4 个重复 Agent 合并为 1 个通用法律 Agent + 6 个 Skills，新增领域只需添加一个目录：

```
skills/
├── legal_consultation/    # 通用法律咨询
│   ├── SKILL.md          # Skill 元数据
│   └── prompt.md         # 领域提示词
├── labor_dispute/         # 劳动纠纷维权
├── corporate_compliance/  # 企业合规检查
├── marriage_property/     # 婚姻与财产分割
├── contract_review/       # 合同审查
└── contract_draft/        # 合同起草
```

### 🧠 三层记忆架构（Memory Agent）

```
┌─────────────────────────────────────────────┐
│              Memory Agent                     │
│                                               │
│  ┌─────────────┐  工作记忆（自动压缩）         │
│  │ Working Mem  │  · 超长对话自动摘要          │
│  │ (in-memory)  │  · 保留最近 N 轮完整上下文    │
│  └──────┬──────┘                             │
│         ↓                                     │
│  ┌─────────────┐  会话记忆（持久化）           │
│  │ Session Mem  │  · Redis/MySQL 存储          │
│  │ (Redis/MySQL)│  · 跨轮对话历史              │
│  └──────┬──────┘                             │
│         ↓                                     │
│  ┌─────────────┐  长期记忆（个性化）           │
│  │ Long-term Mem│  · 用户画像/偏好             │
│  │ (MySQL)      │  · 审查历史/常用模板          │
│  └─────────────┘                             │
└─────────────────────────────────────────────┘
```

### 🔄 多 Agent 协作审查（Collaborative Review）

合同审查从单 Agent 单次调用升级为多 Agent 协作流程：

```
用户上传合同
      ↓
┌──────────┐
│ Planner   │ → 规划审查维度与任务分配
└────┬─────┘
     ↓ (并行)
┌──────────┐ ┌──────────┐ ┌──────────┐
│Executor 1│ │Executor 2│ │Executor 3│
│ 完整性审查│ │ 合规性审查│ │ 风险审查  │
└────┬─────┘ └────┬─────┘ └────┬─────┘
     ↓              ↓              ↓
┌──────────┐
│ Reviewer  │ → 汇总去重排序，生成最终报告
└──────────┘
```

每个 Executor 自主调用得理 API 检索相关法规和案例，确保审查结论有据可依。

### 💬 自然语言输入（NLU）

支持表单和自然语言双模式输入：

- **智能提取**：用户用自然语言描述需求，系统自动提取模板所需字段
- **智能追问**：识别缺失关键字段，生成针对性追问问题
- **适用场景**：合同起草、法律文书生成

### 🔍 得理 API 深度集成

| 能力 | 说明 |
|------|------|
| **法规检索** | search_law — 关键词搜索法律法规 |
| **法规全文** | get_law_detail — 按 lawId 获取法规原文 |
| **案例检索** | search_case — 关键词搜索相似案例 |
| **联合检索** | 本地知识库 + 得理 API 联合检索，本地不足时自动补充 |
| **法规引用查找** | 从文本提取《xxx法》引用，自动获取法规全文 |
| **智能缓存** | 1 小时 TTL 内存缓存 + Deli 结果缓存到本地知识库 |
| **调用统计** | 完整统计（次数/成功率/延迟/错误），支持 API 查询 |

### 📊 评估体系

- 20 条法律查询评估数据集
- 自动化评估脚本（recall / 响应时间 / 错误率）
- 评估报告自动生成

---

## 🏗️ 技术架构

```
┌──────────────────────────────────────────────────────────┐
│                      Frontend (Vue 3)                     │
│    Vue 3 + TypeScript + Pinia + Tailwind CSS + Vite       │
│    · 双模式交互（表单/自然语言）                              │
│    · SSE 流式输出                                          │
└──────────────────────────┬───────────────────────────────┘
                           │ HTTP / SSE
┌──────────────────────────▼───────────────────────────────┐
│                     Backend (FastAPI)                      │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Routers  │  │  Agents  │  │  Skills   │  │  Models  │  │
│  │ (17 API)  │  │ (100%    │  │ (6 Skills)│  │(Pydantic)│  │
│  │           │  │  Agent)  │  │           │  │          │  │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └──────────┘  │
│        │             │             │                        │
│  ┌─────▼─────────────▼─────────────▼───────────────────┐  │
│  │                  Agent Harness                        │  │
│  │  Registry │ Trace │ Fallback │ Permission │ Context  │  │
│  └─────────────────────┬───────────────────────────────┘  │
│                        │                                   │
│  ┌─────────────────────▼───────────────────────────────┐  │
│  │              LangChain + LangGraph                    │  │
│  │  (ChatOpenAI / AgentExecutor / Memory / Tools)       │  │
│  └─────────────────────┬───────────────────────────────┘  │
│                        │                                   │
│  ┌─────────────────────▼───────────────────────────────┐  │
│  │             Memory Architecture                      │  │
│  │  Working Memory → Session Memory → Long-term Memory  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           External API Integrations                  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │  │
│  │  │  得理法律数据库 │  │ 本地知识库     │  │ 8+ LLM   │ │  │
│  │  │  (法规/案例)   │  │ (ChromaDB)   │  │ Providers │ │  │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              MySQL / Redis / Memory Storage           │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

### 后端技术栈

| 技术 | 用途 |
|------|------|
| **FastAPI** | 高性能异步 Web 框架 |
| **LangChain** | LLM 应用开发框架（Agent、Memory、Tool） |
| **LangGraph** | 多 Agent 协作工作流编排 |
| **langchain-openai** | OpenAI 协议兼容的 LLM 接入 |
| **ChromaDB** | 本地向量知识库 |
| **Pydantic** | 数据验证与序列化 |
| **aiomysql** | 异步 MySQL 数据库驱动 |
| **python-jose** | JWT Token 认证 |
| **httpx + urllib** | 双后备异步 HTTP 客户端 |
| **uvicorn** | ASGI 服务器 |

### 前端技术栈

| 技术 | 用途 |
|------|------|
| **Vue 3** | 渐进式前端框架（Composition API） |
| **TypeScript** | 类型安全 |
| **Pinia** | 状态管理 |
| **Tailwind CSS** | 原子化 CSS 框架 |
| **Vite** | 构建工具 |

### 支持的 LLM 厂商

| 厂商 | 默认模型 |
|------|---------|
| 阿里云百炼 (DashScope) | qwen-turbo |
| 腾讯混元 (Hunyuan) | hunyuan-lite |
| OpenAI | gpt-4o-mini |
| DeepSeek | deepseek-chat |
| 智谱 AI (GLM) | glm-4-flash |
| Moonshot (Kimi) | moonshot-v1-8k |
| MiniMax | MiniMax-Text-01 |
| Anthropic (Claude) | claude-sonnet-4-20250514 |
| Google (Gemini) | gemini-2.0-flash |

---

## 📂 项目结构

```
LexAI/
├── backend/                              # 后端服务
│   ├── main.py                           # FastAPI 入口 (v3.0.0)
│   ├── config.py                         # 全局配置 + httpx monkey-patch
│   ├── database.py                       # MySQL 数据库（支持内存降级）
│   ├── requirements.txt                  # Python 依赖
│   ├── .env.example                      # 环境变量模板
│   │
│   ├── agents/                           # Agent 模块
│   │   ├── base_agent.py                 # ★ 基础 Agent 类（Harness 集成）
│   │   ├── legal_agent.py                # ★ 统一法律 Agent（Skills 路由）
│   │   ├── contract_agent.py             # 合同审查 Agent（Agent 模式 + Trace + Fallback）
│   │   ├── contract_draft_agent.py       # 合同起草 Agent（NLU + Trace）
│   │   ├── contract_compare_agent.py     # 合同对比 Agent（Agent 模式 + Trace + Fallback）
│   │   ├── doc_interpret_agent.py        # 法律文书解读 Agent
│   │   ├── proofread_agent.py            # AI 校对 Agent
│   │   ├── docgen_agent.py               # 法律文书生成 Agent
│   │   ├── chat_agent.py                 # 通用法律咨询 Agent
│   │   ├── labor_agent.py                # 劳动纠纷 Agent
│   │   ├── marriage_agent.py             # 婚姻财产 Agent
│   │   ├── compliance_agent.py           # 企业合规 Agent
│   │   ├── contract_templates.py         # 合同模板库（6 大分类 45+ 模板）
│   │   └── docgen_templates.py           # 法律文书模板库（7 大分类 30+ 模板）
│   │
│   ├── harness/                          # ★ Agent Harness 工程化体系
│   │   ├── registry.py                   # 工具注册中心（7 个工具）
│   │   ├── trace.py                      # 执行追踪（observe→think→act）
│   │   ├── fallback.py                   # 降级策略（Agent→Chain）
│   │   ├── context.py                    # 上下文压缩
│   │   └── permission.py                 # 工具权限控制
│   │
│   ├── skills/                           # ★ Skills 可复用体系
│   │   ├── skill_loader.py               # Skill 动态加载器
│   │   ├── legal_consultation/           # 通用法律咨询 Skill
│   │   ├── labor_dispute/                # 劳动纠纷维权 Skill
│   │   ├── corporate_compliance/         # 企业合规检查 Skill
│   │   ├── marriage_property/            # 婚姻与财产分割 Skill
│   │   ├── contract_review/              # 合同审查 Skill
│   │   └── contract_draft/               # 合同起草 Skill
│   │
│   ├── memory/                           # ★ 三层记忆架构
│   │   ├── working_memory.py             # 工作记忆（自动压缩）
│   │   ├── memory_agent.py               # 统一记忆管理 Agent
│   │   └── long_term_memory.py           # 长期记忆（用户画像/审查历史）
│   │
│   ├── workflows/                        # ★ 多 Agent 协作工作流
│   │   └── contract_review.py            # 合同协作审查（Planner→Executor×3→Reviewer）
│   │
│   ├── tools/                            # 工具模块
│   │   ├── deli_tools.py                 # 得理 API 工具（法规/案例检索 + 缓存 + 统计）
│   │   ├── deli_stats.py                 # ★ 调用统计与缓存管理
│   │   ├── nlu_tools.py                  # ★ NLU 自然语言提取工具
│   │   ├── knowledge_tool.py             # ★ 本地知识库 + Deli 联合检索
│   │   ├── law_lookup_tool.py            # ★ 法规引用自动查找工具
│   │   ├── law_parser.py                 # 法律文本解析工具
│   │   └── ocr_extractor.py              # 文件解析与 OCR 工具
│   │
│   ├── routers/                          # API 路由（17 个模块）
│   │   ├── auth.py                       # 认证（登录/注册/重置密码）
│   │   ├── chat.py                       # 多轮法律咨询
│   │   ├── contract.py                   # 合同审查 + ★ 协作审查
│   │   ├── contract_draft.py             # 合同智能起草
│   │   ├── contract_compare.py           # 合同对比
│   │   ├── docgen.py                     # 法律文书生成 V1
│   │   ├── docgen_v2.py                  # 法律文书生成 V2（模板化）
│   │   ├── doc_interpret.py              # 法律文书解读
│   │   ├── proofread.py                  # AI 智能校对
│   │   ├── labor.py                      # 劳动纠纷维权
│   │   ├── compliance.py                 # 企业合规检查
│   │   ├── marriage.py                   # 婚姻与财产分割
│   │   ├── cases.py                      # 案件档案 + ★ 相似案例搜索
│   │   ├── account.py                    # 账户与 LLM 配置
│   │   ├── agent.py                      # ★ 统一 Agent 路由
│   │   ├── nlu.py                        # ★ NLU 自然语言路由
│   │   └── trace_route.py                # ★ 执行追踪 + Deli 统计路由
│   │
│   ├── knowledge/                        # 本地知识库
│   │   ├── build_index.py                # 知识库构建脚本
│   │   └── data/                         # 法规数据
│   │
│   ├── evals/                            # ★ 评估体系
│   │   ├── run_eval.py                   # 自动化评估脚本
│   │   └── datasets/                     # 评估数据集
│   │
│   ├── migrations/                       # 数据库迁移
│   │   └── add_memory_tables.py          # 记忆表迁移
│   │
│   ├── utils/                            # 公共工具
│   │   ├── law_utils.py                  # 法律工具函数
│   │   └── urllib_transport.py           # ★ httpx→urllib 传输层
│   │
│   └── models/                           # 数据模型
│       ├── request_models.py             # 请求体定义
│       └── response_models.py            # 响应体定义
│
├── vue-project/                          # 前端应用
│   ├── src/
│   │   ├── App.vue                       # 主应用组件（双模式交互）
│   │   ├── main.ts                       # 入口文件
│   │   ├── router/                       # 路由配置
│   │   ├── services/api.ts               # API 服务层
│   │   └── stores/auth.ts                # 认证状态管理
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── README.md                             # 项目说明（中文）
├── README_EN.md                          # 项目说明（英文）
└── .gitignore
```

---

## 🚀 安装指南

### 环境要求

- Python 3.10+
- Node.js 20.19+ 或 22.12+
- MySQL 8.0+（可选，支持内存模式运行）

### 后端安装

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

# 5. 构建本地知识库（可选）
python knowledge/build_index.py

# 6. 运行数据库迁移（可选，MySQL 模式下）
python migrations/add_memory_tables.py
```

### 前端安装

```bash
# 1. 进入前端目录
cd vue-project

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

---

## ⚙️ 配置方法

编辑 `backend/.env` 文件进行配置：

```env
# === LLM 配置 ===
# 选择 LLM 厂商：dashscope / tencent_hunyuan / openai / deepseek / zhipu / moonshot / minimax / anthropic / google
LLM_PROVIDER=dashscope
LLM_MODEL_NAME=qwen-turbo

# 对应厂商的 API Key（按需填写）
DASHSCOPE_API_KEY=your-dashscope-api-key-here
TENCENT_HUNYUAN_API_KEY=
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
ZHIPU_API_KEY=
MOONSHOT_API_KEY=
MINIMAX_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# === 得理法律数据库 API ===
# 注册地址：https://open.delilegal.com/personal/keys
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

---

## 📖 使用说明

### 启动服务

```bash
# 启动后端
cd backend
uvicorn main:app --reload --port 8000

# 启动前端
cd vue-project
npm run dev
```

启动后访问：
- 前端应用：`http://localhost:5173`
- API 服务：`http://localhost:8000`
- Swagger 文档：`http://localhost:8000/docs`
- 健康检查：`http://localhost:8000/health`

### 功能使用

#### 💬 法律咨询
选择任意咨询入口（通用咨询 / 劳动纠纷 / 企业合规 / 婚姻财产），以自然语言描述法律问题，Agent 将自主调用法规检索、案例检索工具，提供有据可查的法律建议。

#### 📝 合同审查
上传合同文件（PDF/DOCX/TXT/图片），系统支持两种审查模式：
- **单 Agent 审查**：快速获取风险条款和修改建议
- **协作审查**：多 Agent 并行审查完整性、合规性、风险，汇总生成综合报告

#### 📋 合同起草
选择合同模板后，支持两种输入模式：
- **表单模式**：逐项填写合同要素
- **自然语言模式**：用一句话描述需求，系统自动提取字段并智能追问缺失项

#### 📄 法律文书生成
选择文书模板（民事起诉状、答辩状、仲裁申请书等），填写要素后 AI 自动扩写生成专业法律文书。

### API 接口概览

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/chat/send` | 多轮法律咨询（SSE 流式） |
| POST | `/api/contract/review` | 合同审查 |
| POST | `/api/contract/collaborative-review` | ★ 多 Agent 协作审查 |
| POST | `/api/contract-draft/outline` | 生成合同大纲 |
| POST | `/api/contract-draft/generate` | 生成合同文本 |
| POST | `/api/contract-compare/compare` | 合同对比 |
| POST | `/api/proofread/check` | 文档校对（文件上传） |
| POST | `/api/proofread/check-text` | 文档校对（文本输入） |
| POST | `/api/doc-interpret/interpret` | 法律文书解读 |
| POST | `/api/docgen-v2/outline` | 法律文书生成（大纲） |
| POST | `/api/docgen-v2/generate` | 法律文书生成（生成） |
| POST | `/api/nlu/extract` | ★ NLU 自然语言字段提取 |
| POST | `/api/nlu/clarify` | ★ NLU 缺失字段追问 |
| POST | `/api/agent/labor/chat` | 劳动纠纷 Agent（SSE） |
| POST | `/api/agent/compliance/chat` | 企业合规 Agent（SSE） |
| POST | `/api/agent/marriage/chat` | 婚姻财产 Agent（SSE） |
| POST | `/api/agent/legal/chat` | ★ 统一法律 Agent（SSE） |
| GET | `/api/trace/recent` | ★ 执行追踪记录 |
| GET | `/api/trace/deli/stats` | ★ 得理 API 调用统计 |
| POST | `/api/cases/search-cases` | ★ 案例搜索 |
| POST | `/api/cases/{id}/search-similar` | ★ 相似案例搜索 |
| GET | `/api/cases` | 案件列表 |
| GET | `/api/account/providers` | 获取 LLM 厂商列表 |

---

## 📊 关键数据

| 指标 | 数值 |
|------|------|
| 真正 Agent 占比 | **100%**（9/9） |
| 注册工具数 | **7 个**（统一 Registry） |
| Skills 数量 | **6 个**（可扩展） |
| 记忆层级 | **3 层**（工作/会话/长期） |
| 协作审查维度 | **3 维**（完整性/合规性/风险） |
| 得理 API 缓存命中延迟 | **0ms**（vs 首次 ~5500ms） |
| 合同模板数 | **45+** |
| 文书模板数 | **30+** |
| API 路由数 | **67 个** |
| 评估数据集 | **20 条** |

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'Add some feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 提交 Pull Request

### 开发规范

- 后端遵循 PEP 8 代码风格
- 前端使用 ESLint + Prettier 格式化
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
- 新增 API 需同步更新 Pydantic 模型和 Swagger 文档
- 新增领域只需在 `skills/` 目录下添加 SKILL.md + prompt.md

---

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。
