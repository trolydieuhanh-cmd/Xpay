# Roadmap phát triển — ASEAN AI Platform PM AI

## v0.1 — MVP (bản hiện tại)

- [x] Backend FastAPI với các endpoint: projects, tasks, risks, chat, knowledge, planning
- [x] Frontend Next.js với 6 trang chính
- [x] Knowledge base RAG dùng TF-IDF (đủ tốt cho dev)
- [x] Prompt templates cho 4 vai trò
- [x] Chat có lưu conversation vào DB
- [x] Sinh WBS / phân tích rủi ro / báo cáo tuần

## v0.2 — Sản phẩm dùng nội bộ

- [ ] Authentication (SSO Azure AD hoặc Google)
- [x] Streaming chat trong UI (SSE, hiển thị token dần)
- [x] Feedback 👍/👎 trong UI, lưu vào bảng `feedback`
- [ ] Export báo cáo tuần ra PDF/DOCX
- [ ] Multi-user với phân quyền cơ bản
- [x] Upload file để bổ sung KB qua UI (`.md`/`.txt`, tự reload)
- [x] Docker Compose để `docker compose up` chạy cả 2 tầng
- [x] GitHub Actions CI: ruff + Python import smoke + Next typecheck
- [x] Eval framework skeleton (`backend/eval/`) với LLM-as-judge

## v0.3 — Bổ sung năng lực AI

- [ ] Thay TF-IDF bằng embeddings (bge-m3) + Qdrant
- [ ] Hybrid search (BM25 + dense) + reranking
- [ ] Multi-model routing (Claude + fallback)
- [ ] Prompt caching (Anthropic) để giảm 70% chi phí
- [ ] Tool: đọc PDF, đọc Excel, tra Jira/Linear
- [ ] LLM-as-judge eval framework

## v0.4 — Tích hợp sâu

- [ ] Kết nối Jira/Linear để tự đồng bộ task
- [ ] Kết nối Slack/Teams: hỏi AI ngay trong workspace
- [ ] Kết nối Google Calendar / Outlook để lên lịch tự động
- [ ] Analytics dashboard: token usage, latency, độ hài lòng
- [ ] Alert khi chi phí vượt ngưỡng

## v1.0 — Production-ready

- [ ] Chuyển sang PostgreSQL
- [ ] TLS + reverse proxy nginx/Caddy
- [ ] Audit log đầy đủ
- [ ] Backup tự động (DB + KB)
- [ ] Rate limit + quota theo user/team
- [ ] Grafana + Langfuse cho monitoring
- [ ] Documentation người dùng cuối
- [ ] Đào tạo team ASEAN Holding
- [ ] SLA 99.5%

## Ý tưởng dài hạn (v2+)

- **Multi-tenant**: dùng chung cho các công ty thành viên với KB riêng
- **Voice interface** cho lãnh đạo cấp cao
- **Mobile app** (React Native)
- **Cognitive Agent**: tự động chủ động cảnh báo rủi ro dự án
- **Fine-tuned local model** cho các câu hỏi lặp lại (giảm chi phí Claude API)
