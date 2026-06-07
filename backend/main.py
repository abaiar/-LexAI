from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import auth, chat, contract, docgen, cases, account, labor, compliance, marriage, contract_draft, docgen_v2, contract_compare, proofread, doc_interpret
from routers import agent, nlu, trace_route
from config import settings
from database import init_db, close_db

# 导入工具模块以触发 Registry 注册
import tools.deli_tools  # noqa: F401
import tools.nlu_tools  # noqa: F401
import tools.knowledge_tool  # noqa: F401
import tools.law_lookup_tool  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="小理智法 AI 后端服务",
    description="基于 LangChain + FastAPI 的智能法律咨询后端，集成 Agent Harness、Skills、Memory Agent、多Agent协作审查",
    version="3.0.0",
    lifespan=lifespan,
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5500",
    "http://81.70.155.160",
    "http://81.70.155.160:80",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(contract.router)
app.include_router(docgen.router)
app.include_router(cases.router)
app.include_router(account.router)
app.include_router(labor.router)
app.include_router(compliance.router)
app.include_router(marriage.router)
app.include_router(contract_draft.router)
app.include_router(docgen_v2.router)
app.include_router(contract_compare.router)
app.include_router(proofread.router)
app.include_router(doc_interpret.router)
app.include_router(agent.router)
app.include_router(nlu.router)
app.include_router(trace_route.router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "code": 500,
            "message": "服务器内部错误",
            "detail": str(exc),
        },
    )


@app.get("/")
async def root():
    return {"message": "小理智法 AI 后端服务运行中", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.BACKEND_PORT, reload=True)
