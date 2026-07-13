"""Retrieval-Augmented Generation service dùng TF-IDF (không cần vector DB ngoài).

Đủ tốt cho knowledge base nội bộ vài trăm tài liệu. Có thể thay bằng
embeddings + FAISS khi kho tài liệu lớn hơn.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.core.config import get_settings


@dataclass
class KnowledgeChunk:
    doc_id: str
    title: str
    content: str
    source: str


class KnowledgeBase:
    """Đọc toàn bộ markdown trong knowledge_dir và chia thành chunk."""

    CHUNK_SIZE = 1200  # ký tự
    CHUNK_OVERLAP = 200

    def __init__(self, knowledge_dir: Path | None = None) -> None:
        self.knowledge_dir = knowledge_dir or get_settings().knowledge_path
        self.chunks: list[KnowledgeChunk] = []
        self._vectorizer: TfidfVectorizer | None = None
        self._matrix = None
        self.reload()

    def reload(self) -> None:
        self.chunks = list(self._load_chunks())
        if not self.chunks:
            self._vectorizer = None
            self._matrix = None
            return
        corpus = [c.content for c in self.chunks]
        self._vectorizer = TfidfVectorizer(
            lowercase=True,
            ngram_range=(1, 2),
            min_df=1,
            max_df=0.95,
        )
        self._matrix = self._vectorizer.fit_transform(corpus)

    def _load_chunks(self):
        if not self.knowledge_dir.exists():
            return
        for path in sorted(self.knowledge_dir.rglob("*.md")):
            text = path.read_text(encoding="utf-8", errors="replace")
            title = self._extract_title(text) or path.stem
            source = str(path.relative_to(self.knowledge_dir))
            for i, chunk in enumerate(self._split(text)):
                yield KnowledgeChunk(
                    doc_id=f"{source}#{i}",
                    title=title,
                    content=chunk,
                    source=source,
                )

    @staticmethod
    def _extract_title(text: str) -> str | None:
        m = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
        return m.group(1).strip() if m else None

    @classmethod
    def _split(cls, text: str) -> list[str]:
        text = text.strip()
        if not text:
            return []
        if len(text) <= cls.CHUNK_SIZE:
            return [text]
        chunks = []
        start = 0
        while start < len(text):
            end = min(start + cls.CHUNK_SIZE, len(text))
            # cố gắng cắt ở ranh giới đoạn
            if end < len(text):
                nl = text.rfind("\n\n", start, end)
                if nl > start + cls.CHUNK_SIZE // 2:
                    end = nl
            chunks.append(text[start:end].strip())
            start = end - cls.CHUNK_OVERLAP if end < len(text) else end
        return [c for c in chunks if c]

    def search(self, query: str, top_k: int = 4) -> list[tuple[KnowledgeChunk, float]]:
        if not query or self._vectorizer is None or self._matrix is None:
            return []
        q_vec = self._vectorizer.transform([query])
        sims = cosine_similarity(q_vec, self._matrix).flatten()
        idx = sims.argsort()[::-1][:top_k]
        results = []
        for i in idx:
            score = float(sims[i])
            if score <= 0:
                continue
            results.append((self.chunks[i], score))
        return results


_kb_singleton: KnowledgeBase | None = None


def get_kb() -> KnowledgeBase:
    global _kb_singleton
    if _kb_singleton is None:
        _kb_singleton = KnowledgeBase()
    return _kb_singleton


def reload_kb() -> KnowledgeBase:
    global _kb_singleton
    _kb_singleton = KnowledgeBase()
    return _kb_singleton
