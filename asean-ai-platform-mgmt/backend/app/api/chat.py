from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas import ChatRequest, ChatResponse, FeedbackCreate
from app.db.database import SessionLocal, get_session
from app.db.models import Conversation, Feedback, Message
from app.services.pm_agent import get_agent

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest, session: AsyncSession = Depends(get_session)):
    agent = get_agent()
    if not agent.client.is_ready:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY chưa được cấu hình trên server. "
            "Cập nhật file .env và khởi động lại backend.",
        )

    conversation_id = payload.conversation_id
    if conversation_id is None:
        conv = Conversation(title=_derive_title(payload.messages[-1].content))
        session.add(conv)
        await session.commit()
        await session.refresh(conv)
        conversation_id = conv.id

    # Lưu tin nhắn user
    last_user = payload.messages[-1]
    session.add(
        Message(
            conversation_id=conversation_id,
            role=last_user.role,
            content=last_user.content,
        )
    )
    await session.commit()

    result = await agent.chat(
        messages=[m.model_dump() for m in payload.messages],
        role=payload.role,
        use_rag=payload.use_rag,
    )

    # Lưu phản hồi assistant
    msg = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=result["text"],
        model=result.get("model", ""),
        input_tokens=result.get("usage", {}).get("input_tokens", 0),
        output_tokens=result.get("usage", {}).get("output_tokens", 0),
    )
    session.add(msg)
    await session.commit()
    await session.refresh(msg)

    return ChatResponse(
        text=result["text"],
        model=result.get("model", ""),
        stop_reason=result.get("stop_reason"),
        input_tokens=result.get("usage", {}).get("input_tokens", 0),
        output_tokens=result.get("usage", {}).get("output_tokens", 0),
        rag_used=result.get("rag_used", False),
        conversation_id=conversation_id,
        message_id=msg.id,
    )


@router.post("/stream")
async def chat_stream(payload: ChatRequest):
    agent = get_agent()
    if not agent.client.is_ready:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY chưa được cấu hình trên server.",
        )

    async def gen():
        # Persist conversation + user message trước khi bắt đầu stream
        async with SessionLocal() as session:
            conversation_id = payload.conversation_id
            if conversation_id is None:
                conv = Conversation(title=_derive_title(payload.messages[-1].content))
                session.add(conv)
                await session.commit()
                await session.refresh(conv)
                conversation_id = conv.id
            last_user = payload.messages[-1]
            session.add(
                Message(
                    conversation_id=conversation_id,
                    role=last_user.role,
                    content=last_user.content,
                )
            )
            await session.commit()

        yield f"data: {json.dumps({'conversation_id': conversation_id})}\n\n"

        buffer: list[str] = []
        try:
            async for chunk in agent.stream_chat(
                messages=[m.model_dump() for m in payload.messages],
                role=payload.role,
                use_rag=payload.use_rag,
            ):
                buffer.append(chunk)
                yield f"data: {json.dumps({'delta': chunk}, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
            return

        # Lưu tin nhắn assistant hoàn chỉnh và emit message_id
        full_text = "".join(buffer)
        async with SessionLocal() as session:
            msg = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=full_text,
            )
            session.add(msg)
            await session.commit()
            await session.refresh(msg)
            message_id = msg.id
        yield f"data: {json.dumps({'message_id': message_id})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")


@router.post("/feedback")
async def submit_feedback(
    payload: FeedbackCreate, session: AsyncSession = Depends(get_session)
):
    fb = Feedback(
        message_id=payload.message_id, rating=payload.rating, note=payload.note
    )
    session.add(fb)
    await session.commit()
    await session.refresh(fb)
    return {"ok": True, "id": fb.id}


def _derive_title(text: str) -> str:
    text = text.strip().splitlines()[0] if text else "Cuộc trò chuyện mới"
    return text[:80]
