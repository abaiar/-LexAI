<div align="center">

# ⚖️ LexAI / 小理智法 AI

**Next-Generation Agent-Driven Legal Consultation Platform — Multi-Agent Collaboration · Autonomous Decision-Making · Intelligent Memory**

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg)](https://fastapi.tiangolo.com/)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D.svg)](https://vuejs.org/)
[![LangChain](https://img.shields.io/badge/LangChain-0.2.6-1C3C3C.svg)](https://www.langchain.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-FF6B6B.svg)](https://github.com/langchain-ai/langgraph)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

English | **[简体中文](README.md)**

</div>

---

## 🏆 AI Agents Hackathon 2026 Entry

This project is submitted to **AI Agents Hackathon 2026** (organized by HackIndia), focusing on **AI Agents & Autonomous Systems** and **Generative AI Applications** tracks, showcasing next-generation intelligent agents in the legal domain.

### Judging Criteria Alignment

| Criterion | Project Highlights |
|-----------|-------------------|
| **Innovation & Originality** | Multi-Agent collaborative review, 3-layer memory architecture, reusable Skills system, NLU natural language extraction — 4 innovative features |
| **Technical Implementation** | Agent Harness engineering, 100% true Agents (zero fixed Chains), full execution tracing, automatic fallback strategy |
| **Real-world Usefulness** | Full legal workflow coverage (consultation/review/generation/proofreading), natural language input lowers barrier to entry |
| **AI Agent Capabilities** | Autonomous tool invocation, multi-agent parallel collaboration, memory recall, automatic law reference lookup — significant depth |
| **Product Thinking** | Dual-mode interaction (form/NLU), intelligent follow-up questions, collaborative review reports, API usage dashboard |
| **Presentation Quality** | Full Trace replay, evaluation metrics reports, multi-agent collaboration process visualization |

---

## 📖 Project Overview

LexAI is an **agent-driven** legal consultation platform that breaks through the traditional LLM "single Q&A" paradigm, implementing a complete intelligent agent engineering system with multi-agent autonomous decision-making, collaborative reasoning, and persistent memory. The system deeply integrates the Deli Legal Database API for law and case retrieval, combined with a local knowledge base for hybrid search and intelligent caching.

### Core Differences from Traditional Legal AI

| Dimension | Traditional Legal AI | LexAI |
|-----------|---------------------|-------|
| Architecture | Single LLM call / Fixed Chain | **100% Autonomous Agents** |
| Review Mode | Single LLM output | **Multi-Agent Collaboration** (Planner→Executor×N→Reviewer) |
| Memory | Stateless / In-memory only | **3-Layer Memory** (Working/Session/Long-term) |
| Tool Invocation | Hard-coded | **Unified Registry + Permission Control** |
| Input Method | Form only | **Form + Natural Language Dual Mode** |
| Knowledge Source | API only | **API + Local KB Hybrid Search + Smart Caching** |
| Extensibility | Copy files for new domains | **Skills System — add a directory** |
| Observability | None | **Full Trace + API Usage Statistics** |

---

## ✨ Core Features

### 🤖 Agent Architecture

#### Agent Harness Engineering System
All agents are managed under a unified Harness providing five core capabilities: tool registry, execution tracing, fallback strategy, permission control, and context compaction:

```
┌─────────────────────────────────────────────────┐
│                  Agent Harness                    │
│  ┌──────────┐ ┌───────┐ ┌──────────┐ ┌────────┐ │
│  │ Registry  │ │ Trace │ │ Fallback │ │Permission│ │
│  │ (7 tools) │ │(Full) │ │(Agent→Ch)│ │(per-Agent)│ │
│  └──────────┘ └───────┘ └──────────┘ └────────┘ │
│  ┌──────────────────────────────────────────────┐ │
│  │          Context Compaction (Auto-compress)   │ │
│  └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

- **Registry**: 7 tools unified registration (search_law / get_law_detail / search_case / extract_fields / clarify_missing / search_knowledge / lookup_law_references), per-agent tool access control
- **Trace**: Records every decision step (observe→think→act), including tool calls, latency, results; supports replay
- **Fallback**: Automatically degrades from Agent to Chain mode on failure, ensuring service availability
- **Permission**: Each agent can only access tools within its permission scope
- **Context Compaction**: Auto-compresses long conversations while preserving key information

#### Reusable Skills System
4 duplicate agents merged into 1 universal legal agent + 6 Skills. Adding a new domain requires only creating a directory:

```
skills/
├── legal_consultation/    # General legal consultation
│   ├── SKILL.md          # Skill metadata
│   └── prompt.md         # Domain prompt
├── labor_dispute/         # Labor dispute
├── corporate_compliance/  # Corporate compliance
├── marriage_property/     # Marriage & property
├── contract_review/       # Contract review
└── contract_draft/        # Contract drafting
```

### 🧠 3-Layer Memory Architecture (Memory Agent)

```
┌─────────────────────────────────────────────┐
│              Memory Agent                     │
│                                               │
│  ┌─────────────┐  Working Memory (Auto-compress)
│  │ Working Mem  │  · Auto-summarize long conversations
│  │ (in-memory)  │  · Preserve recent N turns context
│  └──────┬──────┘                             │
│         ↓                                     │
│  ┌─────────────┐  Session Memory (Persistent) │
│  │ Session Mem  │  · Redis/MySQL storage       │
│  │ (Redis/MySQL)│  · Cross-turn history        │
│  └──────┬──────┘                             │
│         ↓                                     │
│  ┌─────────────┐  Long-term Memory (Personal) │
│  │ Long-term Mem│  · User profile/preferences  │
│  │ (MySQL)      │  · Review history/templates  │
│  └─────────────┘                             │
└─────────────────────────────────────────────┘
```

### 🔄 Multi-Agent Collaborative Review

Contract review upgraded from single-agent single-call to multi-agent collaboration:

```
User uploads contract
      ↓
┌──────────┐
│ Planner   │ → Plan review dimensions & task allocation
└────┬─────┘
     ↓ (Parallel)
┌──────────┐ ┌──────────┐ ┌──────────┐
│Executor 1│ │Executor 2│ │Executor 3│
│Completeness│ │Compliance│ │Risk Review│
└────┬─────┘ └────┬─────┘ └────┬─────┘
     ↓              ↓              ↓
┌──────────┐
│ Reviewer  │ → Consolidate, deduplicate, sort → Final report
└──────────┘
```

Each Executor autonomously calls the Deli API to retrieve relevant laws and cases, ensuring review conclusions are evidence-based.

### 💬 Natural Language Input (NLU)

Supports both form and natural language input modes:

- **Smart Extraction**: Users describe needs in natural language; the system automatically extracts template-required fields
- **Intelligent Follow-up**: Identifies missing critical fields and generates targeted follow-up questions
- **Applicable Scenarios**: Contract drafting, legal document generation

### 🔍 Deep Deli API Integration

| Capability | Description |
|-----------|-------------|
| **Law Search** | search_law — keyword search for laws and regulations |
| **Law Detail** | get_law_detail — retrieve full law text by lawId |
| **Case Search** | search_case — keyword search for similar cases |
| **Hybrid Search** | Local KB + Deli API joint retrieval; auto-supplement from Deli when local results are insufficient |
| **Law Reference Lookup** | Extract 《xxx法》 references from text, auto-retrieve full law text |
| **Smart Caching** | 1-hour TTL memory cache + Deli results cached to local KB |
| **Usage Statistics** | Complete stats (calls/success rate/latency/errors), accessible via API |

### 📊 Evaluation System

- 20 legal query evaluation dataset
- Automated evaluation script (recall / response time / error rate)
- Auto-generated evaluation reports

---

## 🏗️ Technical Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Frontend (Vue 3)                     │
│    Vue 3 + TypeScript + Pinia + Tailwind CSS + Vite       │
│    · Dual-mode interaction (Form / Natural Language)      │
│    · SSE streaming output                                 │
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
│  │  │  Deli Legal   │  │  Local KB    │  │ 8+ LLM   │ │  │
│  │  │  Database     │  │  (ChromaDB)  │  │ Providers │ │  │
│  │  │  (Law/Case)   │  │              │  │           │ │  │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              MySQL / Redis / Memory Storage           │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

### Backend Stack

| Technology | Purpose |
|------------|---------|
| **FastAPI** | High-performance async web framework |
| **LangChain** | LLM application framework (Agent, Memory, Tool) |
| **LangGraph** | Multi-agent collaborative workflow orchestration |
| **langchain-openai** | OpenAI-protocol compatible LLM integration |
| **ChromaDB** | Local vector knowledge base |
| **Pydantic** | Data validation and serialization |
| **aiomysql** | Async MySQL database driver |
| **python-jose** | JWT token authentication |
| **httpx + urllib** | Dual-fallback async HTTP client |
| **uvicorn** | ASGI server |

### Frontend Stack

| Technology | Purpose |
|------------|---------|
| **Vue 3** | Progressive frontend framework (Composition API) |
| **TypeScript** | Type safety |
| **Pinia** | State management |
| **Tailwind CSS** | Utility-first CSS framework |
| **Vite** | Build tool |

### Supported LLM Providers

| Provider | Default Model |
|----------|--------------|
| Alibaba DashScope | qwen-turbo |
| Tencent Hunyuan | hunyuan-lite |
| OpenAI | gpt-4o-mini |
| DeepSeek | deepseek-chat |
| Zhipu AI (GLM) | glm-4-flash |
| Moonshot (Kimi) | moonshot-v1-8k |
| MiniMax | MiniMax-Text-01 |
| Anthropic (Claude) | claude-sonnet-4-20250514 |
| Google (Gemini) | gemini-2.0-flash |

---

## 📂 Project Structure

```
LexAI/
├── backend/                              # Backend service
│   ├── main.py                           # FastAPI entry point (v3.0.0)
│   ├── config.py                         # Global config + httpx monkey-patch
│   ├── database.py                       # MySQL database (with in-memory fallback)
│   ├── requirements.txt                  # Python dependencies
│   ├── .env.example                      # Environment variable template
│   │
│   ├── agents/                           # Agent modules
│   │   ├── base_agent.py                 # ★ Base Agent class (Harness integrated)
│   │   ├── legal_agent.py                # ★ Unified Legal Agent (Skills routing)
│   │   ├── contract_agent.py             # Contract review Agent (Agent mode + Trace + Fallback)
│   │   ├── contract_draft_agent.py       # Contract draft Agent (NLU + Trace)
│   │   ├── contract_compare_agent.py     # Contract compare Agent (Agent mode + Trace + Fallback)
│   │   ├── doc_interpret_agent.py        # Legal document interpretation Agent
│   │   ├── proofread_agent.py            # AI proofreading Agent
│   │   ├── docgen_agent.py               # Legal document generation Agent
│   │   ├── chat_agent.py                 # General legal consultation Agent
│   │   ├── labor_agent.py                # Labor dispute Agent
│   │   ├── marriage_agent.py             # Marriage & property Agent
│   │   ├── compliance_agent.py           # Corporate compliance Agent
│   │   ├── contract_templates.py         # Contract template library (6 categories, 45+ templates)
│   │   └── docgen_templates.py           # Legal document template library (7 categories, 30+ templates)
│   │
│   ├── harness/                          # ★ Agent Harness Engineering System
│   │   ├── registry.py                   # Tool registry (7 tools)
│   │   ├── trace.py                      # Execution tracing (observe→think→act)
│   │   ├── fallback.py                   # Fallback strategy (Agent→Chain)
│   │   ├── context.py                    # Context compaction
│   │   └── permission.py                 # Tool permission control
│   │
│   ├── skills/                           # ★ Reusable Skills System
│   │   ├── skill_loader.py               # Skill dynamic loader
│   │   ├── legal_consultation/           # General legal consultation Skill
│   │   ├── labor_dispute/                # Labor dispute Skill
│   │   ├── corporate_compliance/         # Corporate compliance Skill
│   │   ├── marriage_property/            # Marriage & property Skill
│   │   ├── contract_review/              # Contract review Skill
│   │   └── contract_draft/               # Contract drafting Skill
│   │
│   ├── memory/                           # ★ 3-Layer Memory Architecture
│   │   ├── working_memory.py             # Working memory (auto-compress)
│   │   ├── memory_agent.py               # Unified memory management Agent
│   │   └── long_term_memory.py           # Long-term memory (user profile/review history)
│   │
│   ├── workflows/                        # ★ Multi-Agent Collaborative Workflows
│   │   └── contract_review.py            # Collaborative contract review (Planner→Executor×3→Reviewer)
│   │
│   ├── tools/                            # Tool modules
│   │   ├── deli_tools.py                 # Deli API tools (law/case search + caching + stats)
│   │   ├── deli_stats.py                 # ★ API call statistics & cache management
│   │   ├── nlu_tools.py                  # ★ NLU natural language extraction tools
│   │   ├── knowledge_tool.py             # ★ Local KB + Deli hybrid search
│   │   ├── law_lookup_tool.py            # ★ Automatic law reference lookup tool
│   │   ├── law_parser.py                 # Legal text parsing utilities
│   │   └── ocr_extractor.py              # File parsing & OCR tool
│   │
│   ├── routers/                          # API routes (17 modules)
│   │   ├── auth.py                       # Authentication (login/register/reset)
│   │   ├── chat.py                       # Multi-turn legal consultation
│   │   ├── contract.py                   # Contract review + ★ Collaborative review
│   │   ├── contract_draft.py             # Smart contract drafting
│   │   ├── contract_compare.py           # Contract comparison
│   │   ├── docgen.py                     # Legal document generation V1
│   │   ├── docgen_v2.py                  # Legal document generation V2 (template-based)
│   │   ├── doc_interpret.py              # Legal document interpretation
│   │   ├── proofread.py                  # AI proofreading
│   │   ├── labor.py                      # Labor dispute consultation
│   │   ├── compliance.py                 # Corporate compliance check
│   │   ├── marriage.py                   # Marriage & property consultation
│   │   ├── cases.py                      # Case management + ★ Similar case search
│   │   ├── account.py                    # Account & LLM configuration
│   │   ├── agent.py                      # ★ Unified Agent route
│   │   ├── nlu.py                        # ★ NLU natural language route
│   │   └── trace_route.py                # ★ Execution trace + Deli stats route
│   │
│   ├── knowledge/                        # Local knowledge base
│   │   ├── build_index.py                # Knowledge base build script
│   │   └── data/                         # Legal data
│   │
│   ├── evals/                            # ★ Evaluation system
│   │   ├── run_eval.py                   # Automated evaluation script
│   │   └── datasets/                     # Evaluation datasets
│   │
│   ├── migrations/                       # Database migrations
│   │   └── add_memory_tables.py          # Memory tables migration
│   │
│   ├── utils/                            # Shared utilities
│   │   ├── law_utils.py                  # Legal utility functions
│   │   └── urllib_transport.py           # ★ httpx→urllib transport layer
│   │
│   └── models/                           # Data models
│       ├── request_models.py             # Request body definitions
│       └── response_models.py            # Response body definitions
│
├── vue-project/                          # Frontend application
│   ├── src/
│   │   ├── App.vue                       # Main application component (dual-mode interaction)
│   │   ├── main.ts                       # Entry point
│   │   ├── router/                       # Router configuration
│   │   ├── services/api.ts               # API service layer
│   │   └── stores/auth.ts                # Auth state management
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── UPGRADE_ROADMAP.md                    # Upgrade roadmap document
├── README.md                             # Project README (Chinese)
├── README_EN.md                          # Project README (English)
└── .gitignore
```

---

## 🚀 Installation Guide

### Prerequisites

- Python 3.10+
- Node.js 20.19+ or 22.12+
- MySQL 8.0+ (optional, in-memory mode supported)

### Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python -m venv venv

# Windows activation
venv\Scripts\activate
# Linux/macOS activation
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# Edit .env file with your API keys and database configuration

# 5. Build local knowledge base (optional)
python knowledge/build_index.py

# 6. Run database migration (optional, for MySQL mode)
python migrations/add_memory_tables.py
```

### Frontend Setup

```bash
# 1. Navigate to frontend directory
cd vue-project

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

---

## ⚙️ Configuration

Edit the `backend/.env` file:

```env
# === LLM Configuration ===
# Choose LLM provider: dashscope / tencent_hunyuan / openai / deepseek / zhipu / moonshot / minimax / anthropic / google
LLM_PROVIDER=dashscope
LLM_MODEL_NAME=qwen-turbo

# Provider API Keys (fill as needed)
DASHSCOPE_API_KEY=your-dashscope-api-key-here
TENCENT_HUNYUAN_API_KEY=
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
ZHIPU_API_KEY=
MOONSHOT_API_KEY=
MINIMAX_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# === Deli Legal Database API ===
# Register at: https://open.delilegal.com/personal/keys
DELI_APPID=your-deli-appid-here
DELI_SECRET=your-deli-secret-here

# === JWT Authentication ===
SECRET_KEY=your-jwt-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# === Server Configuration ===
BACKEND_PORT=8000

# === Database Configuration (optional, falls back to in-memory mode) ===
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=lax_user_db
```

> **Tip**: You can also dynamically configure LLM provider and API Key through the "Account Settings" page in the application without modifying environment variables.

---

## 📖 Usage

### Start Services

```bash
# Start backend
cd backend
uvicorn main:app --reload --port 8000

# Start frontend
cd vue-project
npm run dev
```

After starting:
- Frontend App: `http://localhost:5173`
- API Service: `http://localhost:8000`
- Swagger Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### Feature Usage

#### 💬 Legal Consultation
Choose any consultation portal (General / Labor Dispute / Corporate Compliance / Marriage & Property), describe your legal question in natural language, and the Agent will autonomously invoke law search and case search tools to provide evidence-based legal advice.

#### 📝 Contract Review
Upload contract files (PDF/DOCX/TXT/Images). The system supports two review modes:
- **Single Agent Review**: Quick risk clause identification and modification suggestions
- **Collaborative Review**: Multi-agent parallel review of completeness, compliance, and risk, consolidated into a comprehensive report

#### 📋 Contract Drafting
Select a contract template, then choose your input mode:
- **Form Mode**: Fill in contract elements field by field
- **Natural Language Mode**: Describe your needs in one sentence; the system auto-extracts fields and intelligently asks follow-up questions for missing items

#### 📄 Legal Document Generation
Select a document template (civil complaint, defense statement, arbitration application, etc.), fill in the elements, and AI automatically generates a professional legal document.

### API Overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| POST | `/api/chat/send` | Multi-turn legal consultation (SSE streaming) |
| POST | `/api/contract/review` | Contract review |
| POST | `/api/contract/collaborative-review` | ★ Multi-Agent collaborative review |
| POST | `/api/contract-draft/outline` | Generate contract outline |
| POST | `/api/contract-draft/generate` | Generate contract text |
| POST | `/api/contract-compare/compare` | Contract comparison |
| POST | `/api/proofread/check` | Document proofreading (file upload) |
| POST | `/api/proofread/check-text` | Document proofreading (text input) |
| POST | `/api/doc-interpret/interpret` | Legal document interpretation |
| POST | `/api/docgen-v2/outline` | Legal document generation (outline) |
| POST | `/api/docgen-v2/generate` | Legal document generation (generate) |
| POST | `/api/nlu/extract` | ★ NLU natural language field extraction |
| POST | `/api/nlu/clarify` | ★ NLU missing field follow-up |
| POST | `/api/agent/labor/chat` | Labor dispute Agent (SSE) |
| POST | `/api/agent/compliance/chat` | Corporate compliance Agent (SSE) |
| POST | `/api/agent/marriage/chat` | Marriage & property Agent (SSE) |
| POST | `/api/agent/legal/chat` | ★ Unified legal Agent (SSE) |
| GET | `/api/trace/recent` | ★ Execution trace records |
| GET | `/api/trace/deli/stats` | ★ Deli API usage statistics |
| POST | `/api/cases/search-cases` | ★ Case search |
| POST | `/api/cases/{id}/search-similar` | ★ Similar case search |
| GET | `/api/cases` | Case list |
| GET | `/api/account/providers` | Get LLM provider list |

---

## 📊 Key Metrics

| Metric | Value |
|--------|-------|
| True Agent Ratio | **100%** (9/9) |
| Registered Tools | **7** (Unified Registry) |
| Skills Count | **6** (Extensible) |
| Memory Layers | **3** (Working/Session/Long-term) |
| Collaborative Review Dimensions | **3** (Completeness/Compliance/Risk) |
| Deli API Cache Hit Latency | **0ms** (vs first call ~5500ms) |
| Contract Templates | **45+** |
| Document Templates | **30+** |
| API Routes | **67** |
| Evaluation Dataset | **20 queries** |

---

## 🤝 Contributing

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a Pull Request

### Development Guidelines

- Backend follows PEP 8 code style
- Frontend uses ESLint + Prettier for formatting
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) specification
- New APIs must include Pydantic models and Swagger documentation updates
- New domains only require adding SKILL.md + prompt.md in the `skills/` directory

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
