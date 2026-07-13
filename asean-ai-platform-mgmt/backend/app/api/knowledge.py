import re

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from app.api.schemas import KnowledgeSearchResult
from app.services.rag_service import get_kb, reload_kb

ALLOWED_EXT = {".md", ".txt"}
MAX_UPLOAD_BYTES = 2 * 1024 * 1024  # 2 MB
SAFE_NAME = re.compile(r"[^a-zA-Z0-9._\-]+")

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


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    subdir: str = Form(default=""),
):
    """Upload a markdown/text file into the knowledge base and reload."""
    ext = "." + (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(
            status_code=400,
            detail=f"Chỉ chấp nhận file {sorted(ALLOWED_EXT)}",
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File rỗng")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File vượt quá {MAX_UPLOAD_BYTES // 1024} KB",
        )

    kb = get_kb()
    kb.knowledge_dir.mkdir(parents=True, exist_ok=True)

    # Sanitize filename to prevent path traversal
    raw_name = (file.filename or "upload.md").rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    safe_stem, safe_ext = raw_name.rsplit(".", 1)
    safe_stem = SAFE_NAME.sub("_", safe_stem)[:80] or "upload"
    safe_name = f"{safe_stem}.{safe_ext.lower()}"

    # Optional subdirectory (also sanitized)
    target_dir = kb.knowledge_dir
    if subdir:
        clean_sub = SAFE_NAME.sub("_", subdir)[:40]
        target_dir = kb.knowledge_dir / clean_sub
        target_dir.mkdir(parents=True, exist_ok=True)

    target = target_dir / safe_name
    if target.exists():
        raise HTTPException(
            status_code=409,
            detail=f"Đã có file '{safe_name}'. Đổi tên trước khi upload.",
        )

    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError as err:
        raise HTTPException(status_code=400, detail="File không phải UTF-8") from err

    target.write_text(text, encoding="utf-8")
    kb_reloaded = reload_kb()
    return {
        "ok": True,
        "source": str(target.relative_to(kb.knowledge_dir)),
        "bytes": len(content),
        "total_chunks": len(kb_reloaded.chunks),
    }


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
