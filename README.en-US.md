

<div align="center">

# ⚖️ LexAI / Smart Legal AI

**Next-generation AI Agent-driven Legal Consultation Platform — Multi-Agent Collaboration · Autonomous Decision-Making · Intelligent Memory**

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg)](https://fastapi.tiangolo.com/)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D.svg)](https://vuejs.org/)
[![LangChain](https://img.shields.io/badge/LangChain-0.2.6-1C3C3C.svg)](https://www.langchain.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-FF6B6B.svg)](https://github.com/langchain-ai/langgraph)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**[English](README_EN.md)** | Simplified Chinese

</div>

---

## 🏆 AI Agents Hackathon 2026 Submission

This project is submitted to the **AI Agents Hackathon 2026** (hosted by HackIndia), focusing on the **AI Agents & Autonomous Systems** and **Generative AI Applications** tracks, showcasing the deep application of next-generation agents in the legal domain.

### Evaluation Criteria Alignment

| Evaluation Criteria | Project Highlights |
|---------|---------|
| **Innovation & Originality** | Multi-Agent collaborative review, three-tier memory architecture, reusable Skills system, NLU natural language extraction — 4 innovative features |
| **Technical Implementation** | Unified Agent Harness engineering, 100% true Agents (zero fixed Chains), complete execution tracing, automatic fallback strategy |
| **Real-world Usefulness** | Covers full workflow of legal consultation/contract review/document generation/proofreading & interpretation; natural language input lowers the barrier to entry |
| **AI Agent Capabilities** | Autonomous tool invocation, multi-agent parallel collaboration, memory recall, automatic regulation citation lookup — significant depth |
| **Product Thinking** | Dual-mode interaction (form/natural language), intelligent follow-up questions, collaborative review reports, invocation statistics dashboard |
| **Presentation Quality** | Demonstrable complete Trace playback, evaluation metric reports, multi-agent collaboration process visualization |

---

## 📖 Project Overview

LexAI is an **agent-driven** legal consultation platform that breaks through the traditional "single Q&A" model of LLM applications, achieving a complete agent engineering system featuring multi-agent autonomous decision-making, collaborative reasoning, and persistent memory. The system deeply integrates the Deli Legal Database API, supporting regulation retrieval, case retrieval, and full-text regulation access, combined with a local knowledge base for joint retrieval and intelligent caching.

### Core Differences from Traditional Legal AI

| Dimension | Traditional Legal AI | LexAI |
|------|-----------|------------|
| Architecture Pattern | Single LLM call / Fixed Chain | **100% Autonomous Decision Agent** |
| Review Mode | Single LLM output | **Multi-Agent Collaboration** (Planner→Executor×N→Reviewer) |
| Memory Capability | Stateless / Pure in-memory | **Three-Tier Memory** (Working/Session/Long-term) |
| Tool Invocation | Hardcoded | **Unified Registry + Permission Control** |
| Input Method | Form only | **Form + Natural Language Dual Mode** |
| Knowledge Source | API only | **API + Local Knowledge Base Joint Retrieval + Smart Caching** |
| Scalability | Copy files for new domains | **Skills System, just add a directory** |
| Observability | None | **Complete Trace Tracking + Invocation Statistics** |

---

## ✨ Core Features

### 🤖 Agent Architecture

#### Agent Harness Engineering Framework
All agents are uniformly managed under the Harness, providing five core capabilities: tool registration, execution tracing, fallback strategy, permission control, and context compaction:

```
┌─────────────────────────────────────────────────┐
│                  Agent Harness                    │
│  ┌──────────┐ ┌───────┐ ┌──────────┐ ┌────────┐ │
│  │ Registry  │ │ Trace │ │ Fallback │ │Permission│ │
│  │ (7 tools) │ │(Full-chain)│ │(Agent→Chain)│ │(Per-Agent) │ │
│  └──────────┘ └───────┘ └──────────┘ └────────┘ │
│  ┌──────────────────────────────────────────────┐ │
│  │          Context Compaction (Auto-compaction)         │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

- **Registry**: 7 tools uniformly registered (`search_law` / `get_law_detail` / `search_case` / `extract_fields` / `clarify_missing` / `search_knowledge` / `lookup_law_references`), with tool availability controlled at the agent granularity
- **Trace**: Records every decision step (`observe→think→act`), including tool invocations, latency, and results, supporting playback
- **Fallback**: Automatically degrades to Chain mode when an agent invocation fails, ensuring service availability
- **Permission**: Each agent can only access tools within its assigned permission scope
- **Context Compaction**: Automatically compresses excessively long conversations while retaining critical information

#### Skills Reusability Framework
4 duplicate agents merged into 1 general legal agent + 6 Skills. Adding a new domain only requires adding a directory:

```
skills/
├── legal_consultation/    # General Legal Consultation
│   ├── SKILL.md          # Skill Metadata
│   └── prompt.md         # Domain Prompt
├── labor_dispute/         # Labor Dispute Rights Protection
├── corporate_compliance/  # Corporate Compliance Check
├── marriage_property/     # Marriage & Property Division
├── contract_review/       # Contract Review
└── contract_draft/        # Contract Drafting
```

### 🧠 Three-Tier Memory Architecture (Memory Agent)

```
┌─────────────────────────────────────────────┐
│              Memory Agent                     │
│                                               │
│  ┌─────────────┐  Working Memory (Auto-compaction)         │
│  │ Working Mem  │  · Auto-summary for excessively long conversations          │
│  │ (in-memory)  │  · Retains complete context for the last N turns    │
│  └──────┬──────┘                             │
│         ↓                                     │
│  ┌─────────────┐  Session Memory (Persistent)           │
│  │ Session Mem  │  · Stored in Redis/MySQL          │
│  │ (Redis/MySQL)│  · Cross-turn conversation history              │
│  └──────┬──────┘                             │
│         ↓                                     │
│  ┌─────────────┐  Long-term Memory (Personalized)           │
│  │ Long-term Mem│  · User profile / preferences             │
│  │ (MySQL)      │  · Review history / frequently used templates          │
│  └─────────────┘                             │
└─────────────────────────────────────────────┘
```

### 🔄 Multi-Agent Collaborative Review

Contract review is upgraded from a single-agent single call to a multi-agent collaborative workflow:

```
User uploads contract
      ↓
┌──────────┐
│ Planner   │ → Plans review dimensions and task allocation
└────┬─────┘
     ↓ (Parallel)
┌──────────┐ ┌──────────┐ ┌──────────┐
│Executor 1│ │Executor 2│ │Executor 3│
│ Completeness│ │ Compliance│ │ Risk Review  │
└────┬─────┘ └────┬─────┘ └────┬─────┘
     ↓              ↓              ↓
┌──────────┐
│ Reviewer  │ → Deduplicates, sorts, and generates final report
└──────────┘
```

Each Executor autonomously invokes the Deli API to retrieve relevant regulations and cases, ensuring review conclusions are well-grounded.

### 💬 Natural Language Input (NLU)

Supports dual input modes: form and natural language:

- **Intelligent Extraction**: Users describe requirements in natural language, and the system automatically extracts fields required for templates
- **Intelligent Follow-up**: Identifies missing key fields and generates targeted follow-up questions
- **Applicable Scenarios**: Contract drafting, legal document generation

### 🔍 Deep Integration with Deli Legal Database API

| Capability | Description |
|------|------|
| **Regulation Retrieval** | `search_law` — Keyword search for laws and regulations |
| **Full-text Regulation** | `get_law_detail` — Retrieve full text by `lawId` |
| **Case Retrieval** | `search_case` — Keyword search for similar cases |
| **Joint Retrieval** | Local knowledge base + Deli API joint retrieval, automatically supplements when local data is insufficient |
| **Regulation Citation Lookup** | Extracts `《xxx Law》` citations from text and automatically retrieves the full text |
| **Smart Caching** | 1-hour TTL in-memory cache + Deli results cached to local knowledge base |
| **Invocation Statistics** | Complete statistics (count/success rate/latency/errors), queryable via API |

### 📊 Evaluation Framework

- 20 legal query evaluation datasets
- Automated evaluation scripts (recall / response time / error rate)
- Auto-generated evaluation reports

---

## 🏗️ Technical Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Frontend (Vue 3)                     │
│    Vue 3 + TypeScript + Pinia + Tailwind CSS + Vite       │
│    · Dual-mode interaction (Form/Natural Language)                              │
│    · SSE Streaming Output                                          │
└──────────────────────────┬───────────────────────────────┘
                           │ HTTP / SSE
┌──────────────────────────▼───────────────────────────────┐
│                     Backend (FastAPI)                      │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Routers  │  │  Agents  │  │  Skills   │  │  Models  │  │
│  │ (17 APIs)  │  │ (100%    │  │ (6 Skills)│  │(Pydantic)│  │
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
│  │  │  Deli Legal DB │  │ Local KB     │  │ 8+ LLM   │ │  │
│  │  │  (Regs/Cases)   │  │ (ChromaDB)   │  │ Providers │ │  │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              MySQL / Redis / Memory Storage           │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

### Backend Tech Stack

| Technology | Purpose |
|------|------|
| **FastAPI** | High-performance asynchronous web framework |
| **LangChain** | LLM application development framework (Agent, Memory, Tool) |
| **LangGraph** | Multi-agent collaborative workflow orchestration |
| **langchain-openai** | OpenAI protocol-compatible LLM integration |
| **ChromaDB** | Local vector knowledge base |
| **Pydantic** | Data validation and serialization |
| **aiomysql** | Asynchronous MySQL database driver |
| **python-jose** | JWT Token authentication |
| **httpx + urllib** | Dual-fallback asynchronous HTTP clients |
| **uvicorn** | ASGI server |

### Frontend Tech Stack

| Technology | Purpose |
|------|------|
| **Vue 3** | Progressive frontend framework (Composition API) |
| **TypeScript** | Type safety |
| **Pinia** | State management |
| **Tailwind CSS** | Utility-first CSS framework |
| **Vite** | Build tool |

### Supported LLM Providers

| Provider | Default Model |
|------|---------|
| Alibaba Cloud DashScope | qwen-turbo |
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
├── backend/                              # Backend Service
│   ├── main.py                           # FastAPI Entry (v3.0.0)
│   ├── config.py                         # Global Config + httpx monkey-patch
│   ├── database.py                       # MySQL Database (supports in-memory fallback)
│   ├── requirements.txt                  # Python Dependencies
│   ├── .env.example                      # Environment Variables Template
│   │
│   ├── agents/                           # Agent Modules
│   │   ├── base_agent.py                 # ★ Base Agent Class (Harness Integration)
│   │   ├── legal_agent.py                # ★ Unified Legal Agent (Skills Routing)
│   │   ├── contract_agent.py             # Contract Review Agent (Agent Mode + Trace + Fallback)
│   │   ├── contract_draft_agent.py       # Contract Drafting Agent (NLU + Trace)
│   │   ├── contract_compare_agent.py     # Contract Comparison Agent (Agent Mode + Trace + Fallback)
│   │   ├── doc_interpret_agent.py        # Legal Document Interpretation Agent
│   │   ├── proofread_agent.py            # AI Proofreading Agent
│   │   ├── docgen_agent.py               # Legal Document Generation Agent
│   │   ├── chat_agent.py                 # General Legal Consultation Agent
│   │   ├── labor_agent.py                # Labor Dispute Agent
│   │   ├── marriage_agent.py             # Marriage & Property Agent
│   │   ├── compliance_agent.py           # Corporate Compliance Agent
│   │   ├── contract_templates.py         # Contract Template Library (6 categories, 45+ templates)
│   │   └── docgen_templates.py           # Legal Document Template Library (7 categories, 30+ templates)
│   │
│   ├── harness/                          # ★ Agent Harness Engineering Framework
│   │   ├── registry.py                   # Tool Registry Center (7 tools)
│   │   ├── trace.py                      # Execution Tracing (observe→think→act)
│   │   ├── fallback.py                   # Fallback Strategy (Agent→Chain)
│   │   ├── context.py                    # Context Compaction
│   │   └── permission.py                 # Tool Permission Control
│   │
│   ├── skills/                           # ★ Skills Reusability Framework
│   │   ├── skill_loader.py               # Dynamic Skill Loader
│   │   ├── legal_consultation/           # General Legal Consultation Skill
│   │   ├── labor_dispute/                # Labor Dispute Rights Protection Skill
│   │   ├── corporate_compliance/         # Corporate Compliance Check Skill
│   │   ├── marriage_property/            # Marriage & Property Division Skill
│   │   ├── contract_review/              # Contract Review Skill
│   │   └── contract_draft/               # Contract Drafting Skill
│   │
│   ├── memory/                           # ★ Three-Tier Memory Architecture
│   │   ├── working_memory.py             # Working Memory (Auto-compaction)
│   │   ├── memory_agent.py               # Unified Memory Management Agent
│   │   └── long_term_memory.py           # Long-term Memory (User Profile / Review History)
│   │
│   ├── workflows/                        # ★ Multi-Agent Collaborative Workflows
│   │   └── contract_review.py            # Collaborative Contract Review (Planner→Executor×3→Reviewer)
│   │
│   ├── tools/                            # Tool Modules
│   │   ├── deli_tools.py                 # Deli API Tools (Reg/Cases + Cache + Stats)
│   │   ├── deli_stats.py                 # ★ Invocation Statistics & Cache Management
│   │   ├── nlu_tools.py                  # ★ NLU Natural Language Extraction Tools
│   │   ├── knowledge_tool.py             # ★ Local KB + Deli Joint Retrieval
│   │   ├── law_lookup_tool.py            # ★ Automatic Regulation Citation Lookup Tool
│   │   ├── law_parser.py                 # Legal Text Parsing Tool
│   │   └── ocr_extractor.py              # File Parsing & OCR Tool
│   │
│   ├── routers/                          # API Routes (17 modules)
│   │   ├── auth.py                       # Authentication (Login/Register/Reset Password)
│   │   ├── chat.py                       # Multi-turn Legal Consultation
│   │   ├── contract.py                   # Contract Review + ★ Collaborative Review
│   │   ├── contract_draft.py             # Intelligent Contract Drafting
│   │   ├── contract_compare.py           # Contract Comparison
│   │   ├── docgen.py                     # Legal Document Generation V1
│   │   ├── docgen_v2.py                  # Legal Document Generation V2 (Template-based)
│   │   ├── doc_interpret.py              # Legal Document Interpretation
│   │   ├── proofread.py                  # AI Intelligent Proofreading
│   │   ├── labor.py                      # Labor Dispute Rights Protection
│   │   ├── compliance.py                 # Corporate Compliance Check
│   │   ├── marriage.py                   # Marriage & Property Division
│   │   ├── cases.py                      # Case Archives + ★ Similar Case Search
│   │   ├── account.py                    # Account & LLM Configuration
│   │   ├── agent.py                      # ★ Unified Agent Routing
│   │   ├── nlu.py                        # ★ NLU Natural Language Routing
│   │   └── trace_route.py                # ★ Execution Tracing + Deli Statistics Routing
│   │
│   ├── knowledge/                        # Local Knowledge Base
│   │   ├── build_index.py                # Knowledge Base Build Script
│   │   └── data/                         # Regulation Data
│   │
│   ├── evals/                            # ★ Evaluation Framework
│   │   ├── run_eval.py                   # Automated Evaluation Script
│   │   └── datasets/                     # Evaluation Datasets
│   │
│   ├── migrations/                       # Database Migrations
│   │   └── add_memory_tables.py          # Memory Table Migration
│   │
│   ├── utils/                            # Public Utilities
│   │   ├── law_utils.py                  # Legal Utility Functions
│   │   └── urllib_transport.py           # ★ httpx→urllib Transport Layer
│   │
│   └── models/                           # Data Models
│       ├── request_models.py             # Request Body Definitions
│       └── response_models.py            # Response Body Definitions
│
├── vue-project/                          # Frontend Application
│   ├── src/
│   │   ├── App.vue                       # Main App Component (Dual-mode Interaction)
│   │   ├── main.ts                       # Entry File
│   │   ├── router/                       # Router Configuration
│   │   ├── services/api.ts               # API Service Layer
│   │   └── stores/auth.ts                # Auth State Management
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── README.md                             # Project README (Chinese)
├── README_EN.md                          # Project README (English)
└── .gitignore
```

---

## 🚀 Installation Guide

### Environment Requirements

- Python 3.10+
- Node.js 20.19+ or 22.12+
- MySQL 8.0+ (Optional, supports in-memory mode)

### Backend Installation

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python -m venv venv

# Activate on Windows
venv\Scripts\activate
# Activate on Linux/macOS
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# Edit .env file and fill in your API Key and database configuration

# 5. Build local knowledge base (Optional)
python knowledge/build_index.py

# 6. Run database migration (Optional, for MySQL mode)
python migrations/add_memory_tables.py
```

### Frontend Installation

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

Edit the `backend/.env` file for configuration:

```env
# === LLM Configuration ===
# Select LLM provider: dashscope / tencent_hunyuan / openai / deepseek / zhipu / moonshot / minimax / anthropic / google
LLM_PROVIDER=dashscope
LLM_MODEL_NAME=qwen-turbo

# Corresponding Provider API Keys (fill as needed)
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
# Registration: https://open.delilegal.com/personal/keys
DELI_APPID=your-deli-appid-here
DELI_SECRET=your-deli-secret-here

# === JWT Authentication ===
SECRET_KEY=your-jwt-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# === Service Configuration ===
BACKEND_PORT=8000

# === Database Configuration (Optional, falls back to in-memory if unset) ===
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=lax_user_db
```

> **Note**: You can also dynamically configure LLM providers and API Keys via the "Account Settings" page in the application, without modifying environment variables.

---

## 📖 Usage Guide

### Starting Services

```bash
# Start backend
cd backend
uvicorn main:app --reload --port 8000

# Start frontend
cd vue-project
npm run dev
```

Access after startup:
- Frontend App: `http://localhost:5173`
- API Service: `http://localhost:8000`
- Swagger Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### Feature Usage

#### 💬 Legal Consultation
Select any consultation entry (General / Labor Dispute / Corporate Compliance / Marriage & Property), describe your legal issue in natural language, and the Agent will autonomously invoke regulation/case retrieval tools to provide well-grounded legal advice.

#### 📝 Contract Review
Upload contract files (PDF/DOCX/TXT/Image). The system supports two review modes:
- **Single-Agent Review**: Quickly obtain risk clauses and revision suggestions
- **Collaborative Review**: Multi-agents run in parallel to review completeness, compliance, and risk, then aggregate into a comprehensive report

#### 📋 Contract Drafting
After selecting a contract template, supports two input modes:
- **Form Mode**: Fill in contract elements step-by-step
- **Natural Language Mode**: Describe requirements in a single sentence; the system automatically extracts fields and intelligently follows up on missing items

#### 📄 Legal Document Generation
Select a document template (Civil Complaint, Statement of Defense, Arbitration Application, etc.), fill in the elements, and AI automatically expands and generates professional legal documents.

### API Endpoints Overview

| Method | Path | Description |
|------|------|------|
| POST | `/api/auth/login` | User Login |
| POST | `/api/auth/register` | User Registration |
| POST | `/api/chat/send` | Multi-turn Legal Consultation (SSE Streaming) |
| POST | `/api/contract/review` | Contract Review |
| POST | `/api/contract/collaborative-review` | ★ Multi-Agent Collaborative Review |
| POST | `/api/contract-draft/outline` | Generate Contract Outline |
| POST | `/api/contract-draft/generate` | Generate Contract Text |
| POST | `/api/contract-compare/compare` | Contract Comparison |
| POST | `/api/proofread/check` | Document Proofreading (File Upload) |
| POST | `/api/proofread/check-text` | Document Proofreading (Text Input) |
| POST | `/api/doc-interpret/interpret` | Legal Document Interpretation |
| POST | `/api/docgen-v2/outline` | Legal Document Generation (Outline) |
| POST | `/api/docgen-v2/generate` | Legal Document Generation (Generate) |
| POST | `/api/nlu/extract` | ★ NLU Natural Language Field Extraction |
| POST | `/api/nlu/clarify` | ★ NLU Missing Field Follow-up |
| POST | `/api/agent/labor/chat` | Labor Dispute Agent (SSE) |
| POST | `/api/agent/compliance/chat` | Corporate Compliance Agent (SSE) |
| POST | `/api/agent/marriage/chat` | Marriage & Property Agent (SSE) |
| POST | `/api/agent/legal/chat` | ★ Unified Legal Agent (SSE) |
| GET | `/api/trace/recent` | ★ Execution Trace Records |
| GET | `/api/trace/deli/stats` | ★ Deli API Invocation Statistics |
| POST | `/api/cases/search-cases` | ★ Case Search |
| POST | `/api/cases/{id}/search-similar` | ★ Similar Case Search |
| GET | `/api/cases` | Case List |
| GET | `/api/account/providers` | Get LLM Provider List |

---

## 📊 Key Metrics

| Metric | Value |
|------|------|
| True Agent Ratio | **100%** (9/9) |
| Registered Tools | **7** (Unified Registry) |
| Skills Count | **6** (Expandable) |
| Memory Tiers | **3** (Working/Session/Long-term) |
| Collaborative Review Dimensions | **3** (Completeness/Compliance/Risk) |
| Deli API Cache Hit Latency | **0ms** (vs First Call ~5500ms) |
| Contract Templates | **45+** |
| Document Templates | **30+** |
| API Routes | **67** |
| Evaluation Datasets | **20** |

---

## 🤝 Contribution Guide

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add some feature'`
4. Push the branch: `git push origin feature/your-feature`
5. Open a Pull Request

### Development Guidelines

- Backend follows PEP 8 coding style
- Frontend uses ESLint + Prettier for formatting
- Commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) specification
- New APIs must synchronously update Pydantic models and Swagger documentation
- Adding a new domain only requires adding `SKILL.md` + `prompt.md` in the `skills/` directory

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
