from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api import chat, knowledge, planning, projects, risks, tasks
from app.core.config import get_settings
from app.db.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


settings = get_settings()

app = FastAPI(
    title="ASEAN AI Platform — PM AI",
    description=(
        "AI trợ lý quản lý dự án cho ASEAN Holding, chuyên trách dự án "
        "ASEAN AI Platform. Dựa trên Claude API + RAG knowledge base nội bộ."
    ),
    version=__version__,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(risks.router)
app.include_router(chat.router)
app.include_router(knowledge.router)
app.include_router(planning.router)


@app.get("/", tags=["meta"])
async def root():
    return {
        "name": "ASEAN AI Platform — PM AI",
        "version": __version__,
        "docs": "/docs",
        "owner": "ASEAN Holding",
        "project": "ASEAN AI Platform",
    }


@app.get("/health", tags=["meta"])
async def health():
    from app.core.claude_client import ClaudeClient

    client = ClaudeClient()
    return {
        "status": "ok",
        "anthropic_configured": client.is_ready,
        "model_main": settings.anthropic_model_main,
        "model_fast": settings.anthropic_model_fast,
    }
