"""Project Management AI agent — điều phối RAG + Claude."""

from __future__ import annotations

from typing import Any

from app.core.claude_client import ClaudeClient
from app.core.prompts import build_system_prompt
from app.services.rag_service import get_kb


class PMAgent:
    def __init__(self, client: ClaudeClient | None = None) -> None:
        self.client = client or ClaudeClient()

    def _build_context(self, query: str, top_k: int = 4) -> str:
        kb = get_kb()
        results = kb.search(query, top_k=top_k)
        if not results:
            return ""
        blocks = []
        for chunk, score in results:
            blocks.append(
                f"### [{chunk.title}] ({chunk.source}) — score={score:.2f}\n{chunk.content}"
            )
        return "\n\n".join(blocks)

    async def chat(
        self,
        *,
        messages: list[dict[str, Any]],
        role: str = "project_manager",
        use_rag: bool = True,
    ) -> dict[str, Any]:
        query = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                query = str(m.get("content", ""))
                break

        context = self._build_context(query) if use_rag else ""
        system = build_system_prompt(role=role, knowledge_context=context or None)

        response = await self.client.complete(system=system, messages=messages)
        response["rag_used"] = bool(context)
        return response

    async def stream_chat(
        self,
        *,
        messages: list[dict[str, Any]],
        role: str = "project_manager",
        use_rag: bool = True,
    ):
        query = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                query = str(m.get("content", ""))
                break
        context = self._build_context(query) if use_rag else ""
        system = build_system_prompt(role=role, knowledge_context=context or None)
        async for chunk in self.client.stream(system=system, messages=messages):
            yield chunk


_agent: PMAgent | None = None


def get_agent() -> PMAgent:
    global _agent
    if _agent is None:
        _agent = PMAgent()
    return _agent
