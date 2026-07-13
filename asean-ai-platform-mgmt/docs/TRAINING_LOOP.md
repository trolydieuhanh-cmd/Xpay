# Đào tạo AI liên tục — Continuous Improvement Loop

> **Sự thật quan trọng**: Chúng ta **KHÔNG** huấn luyện lại foundation model (Claude, GPT). Điều đó cần hàng nghìn GPU và ngân sách tỷ USD.
> Thay vào đó, chúng ta **cải tiến liên tục** khả năng của AI thông qua 6 kênh dưới đây. Kết hợp cả 6 sẽ cho AI **chuyên sâu hơn Claude "vanilla"** trong lĩnh vực quản lý dự án ASEAN AI Platform.

## 6 vòng lặp cải tiến

### Vòng 1 — Mở rộng Knowledge Base (KB)

**Mục tiêu**: AI trả lời chính xác dựa trên tài liệu nội bộ, không bịa.

**Cách làm**:
1. Thu thập tài liệu ASEAN Holding (chiến lược, quy chế, hợp đồng mẫu, biên bản họp).
2. Chuyển sang markdown, đặt vào `backend/app/knowledge/`.
3. Đặt tên có tiền tố số để sắp xếp (VD: `06_hr_policy.md`, `07_procurement.md`).
4. Gọi API `POST /api/knowledge/reload` để nạp lại (hoặc restart backend).
5. Test: vào `/knowledge`, tìm kiếm từ khóa liên quan để chắc chắn được index.

**Chỉ số theo dõi**: số lượng chunk, độ phủ chủ đề, tỷ lệ câu trả lời có trích dẫn nguồn.

### Vòng 2 — Tinh chỉnh Prompt

**Mục tiêu**: AI có phong cách phù hợp doanh nghiệp, luôn trả lời chuẩn cấu trúc.

**Cách làm**:
1. Ghi nhận các câu trả lời chưa đạt (thiếu cấu trúc, sai tone, không trích dẫn).
2. Điều chỉnh file trong `backend/app/prompts/`:
   - `base_system.md`: nguyên tắc chung, luôn áp dụng
   - `role_<xxx>.md`: prompt cho từng vai trò cụ thể
3. Thử A/B nội bộ (chạy cùng câu hỏi, so 2 phiên bản prompt).
4. Chỉ commit prompt khi ≥ 5 case test đều tốt hơn version cũ.

**Chú ý**: prompt là **code**, cần review & version control.

### Vòng 3 — Bổ sung Tool / Skill mới

**Mục tiêu**: AI có thể "hành động" — tra cứu API bên ngoài, tính toán, sinh file.

**Cách làm**:
1. Định nghĩa tool trong `backend/app/services/tools/` (VD: tra Jira, gửi Slack, tính NPV).
2. Đăng ký tool với Claude qua `tools=[...]` trong `ClaudeClient.complete()`.
3. Cập nhật `PMAgent` để xử lý `tool_use` block.
4. Test end-to-end.

**Roadmap tool khuyến nghị**:
- Tra Jira / Linear ticket
- Đọc file Excel / PDF
- Tính toán ngân sách với biểu tỷ giá
- Gửi báo cáo tới Slack / email

### Vòng 4 — Feedback Loop

**Mục tiêu**: học từ đánh giá của người dùng thực tế.

**Cách làm**:
1. Thêm nút 👍/👎 và text feedback vào giao diện chat.
2. Backend đã có endpoint `POST /api/chat/feedback` và bảng `feedback`.
3. Mỗi tuần, export các câu trả lời rating -1 → phân tích nguyên nhân → cập nhật KB hoặc prompt.
4. Khi có ≥ 200 cặp (query, better_answer, worse_answer), cân nhắc **preference fine-tune** cho model open-source (bước sau).

### Vòng 5 — Evaluation & Benchmark

**Mục tiêu**: đo chất lượng khách quan, tránh "cảm tính".

**Cách làm**:
1. Xây bộ **eval set** — 50-100 câu hỏi tiêu biểu về ASEAN Holding + PM.
2. Với mỗi câu, ghi rõ tiêu chí đúng (rubric).
3. Chạy AI trả lời, cho Claude Opus làm judge chấm điểm theo rubric.
4. Track điểm mỗi lần thay đổi prompt / KB / model.
5. Từ chối bất kỳ thay đổi nào làm điểm giảm > 5%.

Script eval mẫu sẽ được thêm vào `backend/eval/`.

### Vòng 6 — Model Upgrade

**Mục tiêu**: dùng model mới nhất khi Anthropic phát hành.

**Cách làm**:
1. Theo dõi https://docs.anthropic.com/en/release-notes/api
2. Khi có model mới:
   - Chạy eval set (Vòng 5) với model mới.
   - So sánh chi phí và độ trễ.
   - Nếu tốt hơn → đổi `ANTHROPIC_MODEL_MAIN` trong `.env` và restart backend.
3. Giữ model cũ trong `.env.example` để có thể rollback.

## Roadmap "đạt trình độ ngang Claude" (giải thích rõ)

Câu "AI đạt trình độ ngang Claude" cần được hiểu chính xác. Có 2 chiều:

**Chiều 1 — Năng lực ngôn ngữ (Language Ability)**:
- Không thể tự huấn luyện đạt bằng, vì tốn tỷ USD.
- ✅ Cách khả thi: **dùng chính Claude** làm engine (đang làm).

**Chiều 2 — Năng lực chuyên môn (Domain Expertise)**:
- ✅ **HOÀN TOÀN CÓ THỂ VƯỢT** Claude vanilla trong lĩnh vực quản lý dự án ASEAN AI Platform.
- Vì Claude vanilla không có knowledge về:
  - Cấu trúc ASEAN Holding
  - Ưu tiên chiến lược nội bộ
  - Quy trình phê duyệt / văn hóa doanh nghiệp
  - Lịch sử dự án, các quyết định đã ra
- Bổ sung 6 vòng lặp ở trên → AI này sẽ trả lời chuyên sâu hơn bất kỳ ai chỉ dùng Claude vanilla.

**Kỳ vọng thực tế sau 3 tháng "đào tạo"**:
- KB ≥ 100 tài liệu chuẩn, 5000+ chunk
- 10+ vai trò prompt được tinh chỉnh
- 3-5 tool tích hợp
- Eval score ≥ 4.2/5 (LLM-as-judge)
- Được người dùng nội bộ đánh giá "cực kỳ hữu ích" hơn ChatGPT/Claude trực tiếp cho công việc PM.

## Nhật ký "training" (điền tay hoặc tự động)

| Ngày | Thay đổi | Impact | Owner |
| --- | --- | --- | --- |
| 2026-07-13 | Khởi tạo dự án, KB base | 5 doc, 20 chunk | Claude Code |
| ... | ... | ... | ... |
