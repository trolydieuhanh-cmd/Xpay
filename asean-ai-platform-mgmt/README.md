# ASEAN AI Platform — Project Management AI

> AI trợ lý chuyên biệt cho công tác quản lý dự án **ASEAN AI Platform** của **ASEAN Holding**.
> Xây dựng trên Claude API (Anthropic), Next.js + FastAPI, có knowledge base riêng và cơ chế tự cải tiến liên tục.

---

## Mục tiêu

Xây dựng một AI Agent chuyên trách quản lý dự án ASEAN AI Platform, có khả năng:

1. **Lập kế hoạch dự án** — Sinh WBS, timeline, milestone, cân đối nguồn lực.
2. **Phân tích rủi ro** — Nhận diện, đánh giá và đề xuất mitigation cho rủi ro kỹ thuật/tài chính/vận hành.
3. **Theo dõi tiến độ** — Ghi nhận task, blocker, tự động sinh báo cáo tuần/tháng.
4. **Tư vấn kiến trúc AI** — Định hướng công nghệ, model selection, MLOps cho AI Platform.
5. **Hỗ trợ ra quyết định** — Trả lời câu hỏi bằng tiếng Việt dựa trên kho tri thức nội bộ (RAG).
6. **Học liên tục** — Mở rộng knowledge base, tinh chỉnh prompt qua từng iteration cùng Claude Code.

---

## Kiến trúc tổng quan

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Next.js 14     │─────▶│  FastAPI         │─────▶│  Claude API     │
│  (Dashboard,    │  API │  (Business logic,│  SDK │  (LLM engine)   │
│   AI Chat,      │◀─────│   RAG, PM tools) │◀─────│                 │
│   Kanban)       │      │                  │      └─────────────────┘
└─────────────────┘      └────────┬─────────┘
                                  │
                         ┌────────┴────────┐
                         ▼                 ▼
                  ┌─────────────┐   ┌─────────────┐
                  │  SQLite DB  │   │  Knowledge  │
                  │  (projects, │   │  Base       │
                  │   tasks,    │   │  (markdown, │
                  │   risks)    │   │   embeds)   │
                  └─────────────┘   └─────────────┘
```

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: FastAPI + SQLAlchemy + Anthropic SDK
- **Data**: SQLite (dev) / PostgreSQL-ready (prod)
- **AI**: Claude Opus/Sonnet cho reasoning, Claude Haiku cho tác vụ nhanh
- **RAG**: In-memory vector search với sentence-transformers (không cần vector DB ngoài)

---

## Chạy nhanh bằng Docker (khuyến nghị cho lần đầu thử)

```bash
# Ở thư mục gốc dự án
cp .env.example .env
# Sửa .env: điền ANTHROPIC_API_KEY

docker compose up --build
# Mở http://localhost:3000
```

## Cài đặt nhanh trên Windows (ổ E:)

Xem chi tiết tại [`docs/SETUP_WINDOWS.md`](./docs/SETUP_WINDOWS.md).

Tóm tắt:

```powershell
# 1. Clone repo về ổ E
E:
git clone https://github.com/trolydieuhanh-cmd/xpay.git
cd xpay\asean-ai-platform-mgmt

# 2. Cài Node.js 20+ và Python 3.11+ (nếu chưa có)
#    https://nodejs.org  và  https://www.python.org

# 3. Backend
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# Sửa .env: thêm ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000

# 4. Frontend (mở terminal mới)
cd frontend
npm install
npm run dev
# Mở http://localhost:3000
```

---

## Cấu trúc dự án

```
asean-ai-platform-mgmt/
├── backend/                    # FastAPI service
│   ├── app/
│   │   ├── main.py            # Entry point
│   │   ├── api/               # REST endpoints
│   │   ├── core/              # Config, Claude client, prompts
│   │   ├── db/                # Models, migrations
│   │   ├── services/          # Business logic (PM, risk, RAG)
│   │   ├── knowledge/         # ASEAN Holding knowledge base (markdown)
│   │   └── prompts/           # Prompt templates chuyên biệt
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                   # Next.js UI
│   ├── app/                   # App Router pages
│   ├── components/            # React components
│   ├── lib/                   # API client, utilities
│   └── package.json
│
├── docs/
│   ├── ARCHITECTURE.md        # Chi tiết kiến trúc
│   ├── SETUP_WINDOWS.md       # Hướng dẫn cài trên Windows
│   ├── ROADMAP.md             # Lộ trình phát triển
│   └── TRAINING_LOOP.md       # Cách "đào tạo" AI liên tục
│
└── scripts/
    ├── setup.ps1              # Script cài đặt tự động Windows
    └── setup.sh               # Script cài đặt tự động Linux/Mac
```

---

## Cơ chế "đào tạo liên tục" bằng Claude Code

Chúng ta không huấn luyện mô hình từ đầu (không khả thi về chi phí và tài nguyên).
Thay vào đó, AI được **cải tiến liên tục** thông qua 5 vòng lặp:

1. **Mở rộng Knowledge Base** — Thêm tài liệu ASEAN Holding, ASEAN AI Platform vào `backend/app/knowledge/`
2. **Tinh chỉnh Prompt** — Cập nhật `backend/app/prompts/` dựa trên phản hồi thực tế
3. **Thêm Tool/Skill** — Bổ sung khả năng (tra cứu, tính toán, gọi API khác) trong `backend/app/services/`
4. **Đánh giá đầu ra** — Ghi nhận feedback trong `data/feedback.jsonl`, dùng để cải tiến
5. **Model upgrade** — Chuyển sang model Claude mới hơn khi Anthropic phát hành

Chi tiết xem [`docs/TRAINING_LOOP.md`](./docs/TRAINING_LOOP.md).

---

## Bảo mật

- **KHÔNG** commit file `.env` chứa `ANTHROPIC_API_KEY`
- Knowledge base có thể chứa thông tin nội bộ → cân nhắc trước khi push lên GitHub công khai
- Xem `.gitignore` để biết những file được loại trừ

---

## License & Ownership

- **Chủ sở hữu**: ASEAN Holding
- **Dự án**: ASEAN AI Platform
- **Nội bộ** — không phân phối bên ngoài.
