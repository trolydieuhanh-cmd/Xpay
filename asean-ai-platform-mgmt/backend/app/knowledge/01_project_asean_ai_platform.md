# Dự án: ASEAN AI Platform

## 1. Mục tiêu

Xây dựng nền tảng AI dùng chung cho các công ty thành viên của ASEAN Holding, cung cấp:

- **Chatbot AI đa vai trò** (nội bộ + đối ngoại): CSKH, HR, IT helpdesk, trợ lý pháp lý
- **RAG-as-a-Service**: kho tri thức riêng cho mỗi công ty thành viên, tra cứu bằng ngôn ngữ tự nhiên
- **Document AI**: OCR, phân loại, trích xuất thông tin hợp đồng/hóa đơn (chuẩn hóa cho tiếng Việt)
- **AI Analytics**: hỗ trợ ra quyết định (dashboards + insight tự động)
- **Voice AI**: TTS/STT chất lượng cao cho tiếng Việt và một số tiếng ASEAN
- **Model Gateway**: điểm truy cập duy nhất tới các model của Anthropic (Claude), OpenAI, Google, và các model open-source (Llama, Qwen)

## 2. Phạm vi giai đoạn 1 (12 tháng đầu)

**Trong phạm vi:**
- Model Gateway + billing/tracking token
- RAG-as-a-Service với knowledge base riêng theo công ty
- Chatbot khung cho 2 công ty thành viên pilot
- Portal quản trị: người dùng, quota, audit log
- Tích hợp SSO (Azure AD / Google Workspace tùy hệ hiện tại)

**Ngoài phạm vi (Phase 2+):**
- Voice AI production
- Fine-tuning model nội bộ
- Đa ngôn ngữ ASEAN (chỉ tiếng Việt và tiếng Anh ở Phase 1)

## 3. Kiến trúc dự kiến

```
        ┌───────────────────────────────┐
        │  Frontend (Next.js / Mobile)  │
        └──────────────┬────────────────┘
                       │
              ┌────────▼────────┐
              │   API Gateway   │  (auth, rate limit, quota)
              └────────┬────────┘
     ┌─────────┬──────┴───────┬─────────────┐
     ▼         ▼              ▼             ▼
  Chat Svc  RAG Svc       Doc AI Svc   Analytics Svc
     │         │              │             │
     └────┬────┴──────┬───────┴───────┬─────┘
          ▼           ▼               ▼
    Model Router   Vector Store   Object Storage
     │  │  │        (Qdrant)        (S3/MinIO)
     ▼  ▼  ▼
   Claude OpenAI Local (vLLM)
```

**Stack đề xuất**:
- Backend: Python (FastAPI) + Node.js (một số microservice)
- Vector DB: Qdrant hoặc pgvector
- LLM Gateway: LiteLLM hoặc tự viết
- Frontend: Next.js + TypeScript
- Hạ tầng: Kubernetes trên VNG Cloud / VCC / AWS Singapore
- Observability: Langfuse hoặc Helicone + Grafana

## 4. Ước lượng ngân sách (chỉ là placeholder — cần thẩm định)

| Hạng mục | Chi phí năm 1 (USD) | Ghi chú |
| --- | --- | --- |
| API tokens (Claude/OpenAI) | 60,000 - 180,000 | Phụ thuộc volume người dùng |
| Hạ tầng cloud | 40,000 - 80,000 | GPU cho model open-source (nếu có) |
| Vector DB & storage | 10,000 - 20,000 | |
| Nhân sự (5-8 người) | 200,000 - 400,000 | Devs, MLE, PM, DevOps |
| Licenses (SSO, monitoring, security) | 15,000 - 30,000 | |
| Buffer 15% | | |

**Tổng ước tính**: 400,000 - 800,000 USD năm đầu.

## 5. Tổ chức dự án

**Steering Committee**: Chủ tịch HĐQT + TGĐ + CIO/CTO ASEAN Holding
**Project Sponsor**: (cần chỉ định)
**Project Manager**: (cần chỉ định)
**Tech Lead**: (cần chỉ định — kinh nghiệm 8+ năm về AI/ML platform)
**Đội core**: 5-8 người (2 backend, 1 frontend, 1 MLE, 1 DevOps, 1-2 tùy phase)

## 6. Chỉ số thành công (KPI)

| # | KPI | Target Q1 | Target Y1 |
| --- | --- | --- | --- |
| 1 | Số công ty thành viên onboarded | 1 | 3 |
| 2 | Số MAU (nội bộ) | 50 | 500 |
| 3 | Số ticket giảm nhờ chatbot | 5% | 30% |
| 4 | Độ hài lòng (CSAT) người dùng nội bộ | ≥ 3.5/5 | ≥ 4.2/5 |
| 5 | Uptime SLA | 99% | 99.5% |
| 6 | Chi phí trung bình / lần hỏi | ≤ $0.05 | ≤ $0.02 |

## 7. Rủi ro trọng yếu đã biết

Xem chi tiết tại `02_top_risks.md`.

## 8. Roadmap tóm tắt

- **Q1**: Chốt kiến trúc, POC Model Gateway + RAG với 1 công ty pilot
- **Q2**: Chatbot khung + Portal quản trị, onboard công ty pilot #1 chính thức
- **Q3**: Onboard công ty pilot #2, Doc AI cho hợp đồng
- **Q4**: Analytics dashboard, tối ưu chi phí, chuẩn bị Phase 2

---

**Lưu ý**: Số liệu trong tài liệu này là dự kiến ban đầu, cần Ban Lãnh đạo phê duyệt và cập nhật theo thực tế triển khai.
