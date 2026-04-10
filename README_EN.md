<div align="center">

# ⚖️ LexAI / 小理智法 AI

**Intelligent Legal Consultation Platform Powered by Large Language Models**

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg)](https://fastapi.tiangolo.com/)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D.svg)](https://vuejs.org/)
[![LangChain](https://img.shields.io/badge/LangChain-0.2.6-1C3C3C.svg)](https://www.langchain.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

English | **[简体中文](README.md)**

</div>

---

### 📖 Project Overview

LexAI (小理智法 AI) is an intelligent legal consultation platform powered by Large Language Models (LLMs). It integrates multiple AI-powered legal services including legal consultation, contract review, document generation, contract drafting, contract comparison, intelligent proofreading, and legal document interpretation. Built on the LangChain Agent architecture and integrated with the Deli Legal Database API for case and law retrieval, the system provides professional, accurate, and well-sourced legal analysis and advice.

### ✨ Core Features

| Feature | Description |
|---------|-------------|
| 🤖 **Multi-turn Legal Consultation** | LangChain Agent-based multi-step reasoning with SSE streaming, automatic case/law retrieval tool invocation |
| 📝 **Contract Review** | Upload contract files (PDF/DOCX/TXT/Images), AI identifies risk clauses, missing clauses, provides scoring and suggestions |
| 📄 **Legal Document Generation** | Supports labor arbitration applications, civil complaints, lawyer's letters, divorce agreements, and more with AI auto-expansion |
| 📋 **Smart Contract Drafting** | 6 categories with 45+ contract templates, full workflow: element filling → outline generation → contract generation |
| 🔄 **Contract Comparison** | Upload original/revised contracts, AI compares clause-by-clause differences, evaluates legal risks and impacts |
| ✏️ **AI Proofreading** | Comprehensive Chinese document proofreading for grammar, spelling, punctuation, and wording errors with correction suggestions |
| 🔍 **Legal Document Interpretation** | Translates complex legal documents into plain language, interprets key clauses, rights/obligations, and risk warnings |
| 👷 **Labor Dispute Agent** | Specialized in labor law: wage disputes, wrongful termination, work injury claims |
| 🏢 **Corporate Compliance Agent** | Specialized in corporate compliance: employment, data security, antitrust |
| 💍 **Marriage & Property Agent** | Specialized in family law: divorce, property division, child custody |
| 📁 **Case Management** | CRUD operations for case files with associated conversations and documents |
| 🔐 **Auth & Multi-Model Config** | JWT authentication, dynamic switching across 8+ LLM provider API keys |

### 🏗️ Technical Architecture

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
│  │  │  Deli Legal   │  │  8+ LLM Providers        │ │ │
│  │  │  Database     │  │  (DashScope/OpenAI/      │ │ │
│  │  │  (Case/Law)   │  │   DeepSeek/Zhipu/...)    │ │ │
│  │  └──────────────┘  └──────────────────────────┘ │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │              MySQL / Memory Storage              │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

#### Backend Stack

| Technology | Purpose |
|------------|---------|
| **FastAPI** | High-performance async web framework |
| **LangChain** | LLM application framework (Agent, Chain, Memory, Tool) |
| **langchain-openai** | OpenAI-protocol compatible LLM integration |
| **Pydantic** | Data validation and serialization |
| **aiomysql** | Async MySQL database driver |
| **python-jose** | JWT token authentication |
| **httpx** | Async HTTP client |
| **pypdf** | PDF file parsing |
| **uvicorn** | ASGI server |

#### Frontend Stack

| Technology | Purpose |
|------------|---------|
| **Vue 3** | Progressive frontend framework (Composition API) |
| **TypeScript** | Type safety |
| **Pinia** | State management |
| **Tailwind CSS** | Utility-first CSS framework |
| **Vite** | Build tool |
| **Lucide Vue** | Icon library |

#### Supported LLM Providers

| Provider | Default Model |
|----------|--------------|
| Alibaba DashScope | qwen-turbo |
| OpenAI | gpt-4o-mini |
| DeepSeek | deepseek-chat |
| Zhipu AI (GLM) | glm-4-flash |
| Moonshot (Kimi) | moonshot-v1-8k |
| MiniMax | MiniMax-Text-01 |
| Anthropic (Claude) | claude-sonnet-4-20250514 |
| Google (Gemini) | gemini-2.0-flash |

### 📂 Project Structure

```
LegalTech_AI/
├── backend/                          # Backend service
│   ├── main.py                       # FastAPI entry point
│   ├── config.py                     # Global config (multi-LLM provider support)
│   ├── database.py                   # MySQL database (with in-memory fallback)
│   ├── requirements.txt              # Python dependencies
│   ├── .env.example                  # Environment variable template
│   ├── agents/                       # LangChain Agent modules
│   │   ├── chat_agent.py             # Multi-turn legal consultation Agent
│   │   ├── contract_agent.py         # Contract review Agent
│   │   ├── contract_draft_agent.py   # Smart contract drafting Agent
│   │   ├── contract_compare_agent.py # Contract comparison Agent
│   │   ├── docgen_agent.py           # Legal document generation Agent
│   │   ├── doc_interpret_agent.py    # Legal document interpretation Agent
│   │   ├── proofread_agent.py        # AI proofreading Agent
│   │   ├── labor_agent.py            # Labor dispute Agent
│   │   ├── compliance_agent.py       # Corporate compliance Agent
│   │   ├── marriage_agent.py         # Marriage & property Agent
│   │   ├── contract_templates.py     # Contract template library (6 categories, 45+ templates)
│   │   └── docgen_templates.py       # Legal document template library
│   ├── routers/                      # API routes
│   │   ├── auth.py                   # Authentication (login/register/reset)
│   │   ├── chat.py                   # Multi-turn legal consultation
│   │   ├── contract.py               # Contract review
│   │   ├── contract_draft.py         # Smart contract drafting
│   │   ├── contract_compare.py       # Contract comparison
│   │   ├── docgen.py                 # Legal document generation V1
│   │   ├── docgen_v2.py              # Legal document generation V2 (template-based)
│   │   ├── doc_interpret.py          # Legal document interpretation
│   │   ├── proofread.py              # AI proofreading
│   │   ├── labor.py                  # Labor dispute consultation
│   │   ├── compliance.py             # Corporate compliance check
│   │   ├── marriage.py               # Marriage & property consultation
│   │   ├── cases.py                  # Case file management
│   │   └── account.py                # Account & LLM configuration
│   ├── tools/                        # LangChain Tool modules
│   │   ├── deli_case_tool.py         # Deli case retrieval Tool
│   │   ├── deli_law_tool.py          # Deli law retrieval Tool
│   │   ├── ocr_extractor.py          # File parsing & OCR Tool
│   │   └── law_parser.py             # Legal text parsing utilities
│   ├── memory/                       # Session memory management
│   │   └── session_memory.py         # Session-based conversation memory
│   └── models/                       # Data models
│       ├── request_models.py         # Request body definitions
│       └── response_models.py        # Response body definitions
├── vue-project/                      # Frontend application
│   ├── src/
│   │   ├── App.vue                   # Main application component
│   │   ├── main.ts                   # Entry point
│   │   ├── router/                   # Router configuration
│   │   ├── services/api.ts           # API service layer
│   │   └── stores/auth.ts            # Auth state management
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
└── .gitignore
```

### 🚀 Installation Guide

#### Prerequisites

- Python 3.10+
- Node.js 20.19+ or 22.12+
- MySQL 8.0+ (optional, in-memory mode supported)

#### Backend Setup

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
```

#### Frontend Setup

```bash
# 1. Navigate to frontend directory
cd vue-project

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

### ⚙️ Configuration

Edit the `backend/.env` file:

```env
# === LLM Configuration ===
# Choose LLM provider: dashscope / openai / deepseek / zhipu / moonshot / minimax / anthropic / google
LLM_PROVIDER=dashscope
LLM_MODEL_NAME=qwen-turbo

# Provider API Keys (fill as needed)
DASHSCOPE_API_KEY=your-dashscope-api-key-here
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
ZHIPU_API_KEY=
MOONSHOT_API_KEY=
MINIMAX_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# === Deli Legal Database API ===
# Register at: https://openapi.delilegal.com
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

### 📖 Usage

#### Start Backend Service

```bash
cd backend
uvicorn main:app --reload --port 8000
```

After starting:
- API Service: `http://localhost:8000`
- Swagger Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

#### Start Frontend Service

```bash
cd vue-project
npm run dev
```

Visit `http://localhost:5173` to use the application.

#### API Overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/chat/send` | Multi-turn legal consultation (SSE streaming) |
| POST | `/api/contract/review` | Contract review |
| POST | `/api/contract-draft/outline` | Generate contract outline |
| POST | `/api/contract-draft/generate` | Generate contract text |
| POST | `/api/contract-compare/compare` | Contract comparison |
| POST | `/api/proofread/check` | Document proofreading (file upload) |
| POST | `/api/proofread/check-text` | Document proofreading (text input) |
| POST | `/api/doc-interpret/interpret` | Legal document interpretation |
| POST | `/api/docgen/generate` | Legal document generation V1 |
| POST | `/api/docgen-v2/outline` | Legal document generation V2 (outline) |
| POST | `/api/docgen-v2/generate` | Legal document generation V2 (generate) |
| POST | `/api/agent/labor/chat` | Labor dispute Agent (SSE) |
| POST | `/api/agent/compliance/chat` | Corporate compliance Agent (SSE) |
| POST | `/api/agent/marriage/chat` | Marriage & property Agent (SSE) |
| GET | `/api/cases` | Case list |
| POST | `/api/cases` | Create case |
| GET | `/api/account/providers` | Get LLM provider list |
| PUT | `/api/account/config` | Save LLM configuration |
| POST | `/api/account/config/validate` | Validate API Key |

### 🤝 Contributing

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a Pull Request

#### Development Guidelines

- Backend follows PEP 8 code style
- Frontend uses ESLint + Prettier for formatting
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) specification
- New APIs must include Pydantic models and Swagger documentation updates

### 📄 License

This project is licensed under the [MIT License](LICENSE).
