from fastapi import APIRouter, HTTPException, Query

from app.api.schemas import KnowledgeSearchResult
from app.services.rag_service import get_kb, reload_kb

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.get("/search", response_model=list[KnowledgeSearchResult])
async def search(q: str = Query(..., min_length=1), top_k: int = 5):
    kb = get_kb()
    results = kb.search(q, top_k=top_k)
    return [
        KnowledgeSearchResult(
            title=chunk.title,
            source=chunk.source,
            excerpt=chunk.content[:600],
            score=score,
        )
        for chunk, score in results
    ]


@router.get("/documents")
async def list_documents():
    kb = get_kb()
    seen: dict[str, dict] = {}
    for chunk in kb.chunks:
        if chunk.source not in seen:
            seen[chunk.source] = {
                "source": chunk.source,
                "title": chunk.title,
                "chunk_count": 0,
                "char_count": 0,
            }
        seen[chunk.source]["chunk_count"] += 1
        seen[chunk.source]["char_count"] += len(chunk.content)
    return {"documents": list(seen.values()), "total_chunks": len(kb.chunks)}


@router.post("/reload")
async def reload_knowledge():
    kb = reload_kb()
    return {"ok": True, "chunk_count": len(kb.chunks)}


@router.get("/document/{source:path}")
async def get_document(source: str):
    kb = get_kb()
    path = kb.knowledge_dir / source
    if not path.exists() or path.suffix != ".md":
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    return {
        "source": source,
        "content": path.read_text(encoding="utf-8"),
    }
