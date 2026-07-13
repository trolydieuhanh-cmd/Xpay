# Kiến trúc — ASEAN AI Platform PM AI

## Tổng quan

Ứng dụng gồm 2 tầng chính:

1. **Backend** (FastAPI, Python) — logic nghiệp vụ + tích hợp Claude API + RAG
2. **Frontend** (Next.js, TypeScript) — giao diện web

## Sơ đồ thành phần

```
┌────────────────────────────────────────────────────────────┐
│                     Browser (User)                         │
└─────────────────────────┬──────────────────────────────────┘
                          │  HTTPS
┌─────────────────────────▼──────────────────────────────────┐
│                Frontend — Next.js 14 (App Router)          │
│  Pages:  /  /chat  /projects  /tasks  /risks  /planning    │
│          /knowledge                                        │
│  Proxy:  /api/* → BACKEND_URL                              │
└─────────────────────────┬──────────────────────────────────┘
                          │  REST
┌─────────────────────────▼──────────────────────────────────┐
│                 Backend — FastAPI                          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  api/     projects, tasks, risks, chat, knowledge,   │ │
│  │           planning                                    │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │  services/  PMAgent, KnowledgeBase (RAG TF-IDF)       │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │  core/    ClaudeClient, prompts loader, config       │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │  db/      SQLAlchemy async (SQLite dev / PG prod)    │ │
│  └──────────────────────────────────────────────────────┘ │
└───┬──────────────────────────────────────┬─────────────────┘
    │                                      │
    │ REST                                 │ fs read
┌───▼──────────────┐            ┌──────────▼──────────┐
│  Anthropic API   │            │  Knowledge base     │
│  Claude models   │            │  (backend/app/      │
│                  │            │   knowledge/*.md)   │
└──────────────────┘            └─────────────────────┘
```

## Data flow — Chat

1. User gõ câu hỏi trong `/chat`.
2. Frontend POST `/api/chat` với `{ messages, role, use_rag }`.
3. Backend `api/chat.py` gọi `PMAgent.chat()`.
4. `PMAgent` truy vấn `KnowledgeBase.search(query)` (TF-IDF) lấy top-4 chunk.
5. Ghép system prompt = `base_system.md` + `role_<role>.md` + KB context.
6. Gọi Claude API qua `ClaudeClient.complete()`.
7. Lưu tin nhắn vào bảng `messages` + `conversations`.
8. Trả về text + metadata (tokens, model, rag_used).

## Data flow — Sinh WBS/Risk/Report

1. User điền form ở `/planning`.
2. Frontend POST `/api/planning/wbs` (hoặc `/risks`, `/weekly-report`).
3. Backend build user prompt chuyên biệt và gọi `PMAgent.chat()` với role phù hợp.
4. Kết quả markdown trả về, frontend render qua `react-markdown`.

## Database schema

| Bảng | Mục đích |
| --- | --- |
| `projects` | Dự án (tên, mã, chủ nhiệm, ngân sách, trạng thái) |
| `tasks` | Công việc (title, status, priority, assignee, project_id) |
| `risks` | Rủi ro (level, probability, impact, mitigation, project_id) |
| `conversations` | Phiên chat |
| `messages` | Tin nhắn trong phiên chat |
| `feedback` | Đánh giá của user cho câu trả lời AI (dùng để cải tiến) |

## Deployment

### Development (khuyến nghị lúc đầu)
- SQLite file: `backend/data/app.db`
- Backend: `uvicorn --reload`
- Frontend: `next dev`

### Production (khi đưa vào sử dụng thực tế)

**Backend**:
- Chuyển `DATABASE_URL` sang PostgreSQL: `postgresql+asyncpg://user:pass@host/db`
- Chạy với gunicorn + uvicorn workers:
  ```
  gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
  ```
- Đặt sau reverse proxy (nginx / Caddy) với TLS
- Log vào file rotating

**Frontend**:
- Build: `npm run build`
- Chạy: `npm start` hoặc deploy Vercel/Docker

**Docker Compose** (chưa có sẵn, roadmap): sẽ đóng gói cả 2 tầng để chạy 1 lệnh.

## Bảo mật production

1. Đặt sau reverse proxy có TLS
2. Bật CORS chặt chẽ (không dùng `*`)
3. Thêm authentication: SSO (Azure AD / Google Workspace) qua NextAuth
4. Rate limit ở API Gateway
5. Audit log mọi request Claude API
6. Secret management: dùng vault (Azure Key Vault / AWS Secrets Manager) thay vì `.env`

## Khả năng mở rộng

- **Model Gateway**: bổ sung provider (OpenAI, Gemini, local model) — sửa `core/claude_client.py` thành `llm_client.py` với chiến lược router
- **Vector DB**: thay `sklearn TF-IDF` bằng Qdrant/pgvector khi KB > 10k chunk
- **Streaming**: đã có endpoint `/api/chat/stream` — thêm UI streaming trong frontend
- **Multi-tenant**: mỗi công ty thành viên có KB + config riêng — thêm `tenant_id` vào tất cả bảng
