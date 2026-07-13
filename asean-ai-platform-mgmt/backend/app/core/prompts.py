"""Loader cho các prompt template chuyên biệt cho ASEAN AI Platform PM AI."""

from __future__ import annotations

from app.core.config import BASE_DIR

PROMPT_DIR = BASE_DIR / "app" / "prompts"


def load_prompt(name: str) -> str:
    """Đọc file `name`.md trong thư mục prompts."""
    path = PROMPT_DIR / f"{name}.md"
    if not path.exists():
        raise FileNotFoundError(f"Prompt template not found: {path}")
    return path.read_text(encoding="utf-8")


def build_system_prompt(
    *,
    role: str = "project_manager",
    knowledge_context: str | None = None,
    extra: str | None = None,
) -> str:
    """Ghép prompt hệ thống từ base + role-specific + RAG context."""
    parts = [load_prompt("base_system")]

    try:
        parts.append(load_prompt(f"role_{role}"))
    except FileNotFoundError:
        pass

    if knowledge_context:
        parts.append(
            "## Tài liệu tham chiếu (Knowledge Base)\n"
            "Các trích đoạn dưới đây là NGUỒN CHÍNH THỨC — ưu tiên sử dụng để trả lời.\n"
            "Nếu câu hỏi vượt ngoài, nói rõ và trả lời dựa trên hiểu biết chung.\n\n"
            + knowledge_context
        )

    if extra:
        parts.append(extra)

    return "\n\n---\n\n".join(parts)
