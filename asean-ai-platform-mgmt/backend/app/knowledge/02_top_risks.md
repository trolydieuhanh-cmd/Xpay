# Top rủi ro — ASEAN AI Platform

## Rủi ro kỹ thuật

### R-01: Phụ thuộc nhà cung cấp LLM
- **Mô tả**: Nếu Anthropic/OpenAI thay đổi giá, chính sách, hoặc ngừng dịch vụ tại Việt Nam, toàn bộ nền tảng bị ảnh hưởng.
- **Xác suất**: Medium. **Tác động**: High.
- **Mitigation**: Thiết kế Model Gateway đa nhà cung cấp ngay từ đầu; duy trì fallback bằng model open-source (Llama, Qwen) self-host.

### R-02: Chất lượng tiếng Việt của model
- **Mô tả**: Model foundation vẫn còn hạn chế với tiếng Việt (kỹ năng chuyên ngành pháp lý, tài chính, tên riêng Việt).
- **Xác suất**: High. **Tác động**: Medium.
- **Mitigation**: RAG với knowledge base tiếng Việt chất lượng; đánh giá A/B nhiều model; cân nhắc fine-tune LoRA khi khối lượng đủ lớn.

### R-03: Hallucination / thông tin sai
- **Mô tả**: AI trả lời thông tin bịa hoặc sai, đặc biệt trong CSKH và tư vấn pháp lý.
- **Xác suất**: High. **Tác động**: High.
- **Mitigation**: Bắt buộc RAG với trích dẫn nguồn; guardrails; disclaimer rõ; audit log; con người trong quy trình (HITL) với các câu trả lời rủi ro cao.

## Rủi ro pháp lý & bảo mật

### R-04: Rò rỉ dữ liệu cá nhân
- **Mô tả**: Người dùng gửi PII vào prompt, dữ liệu bị lưu bởi nhà cung cấp LLM.
- **Xác suất**: Medium. **Tác động**: Critical (phạt theo NĐ 13/2023).
- **Mitigation**: PII detector trước khi gửi request; ký DPA với nhà cung cấp; ưu tiên gói zero-retention; đào tạo người dùng.

### R-05: Prompt injection / jailbreak
- **Mô tả**: Kẻ tấn công thao túng chatbot đối ngoại để lộ thông tin nội bộ hoặc gây hại thương hiệu.
- **Xác suất**: Medium. **Tác động**: Medium.
- **Mitigation**: Guardrails ở prompt + output filter; rate limit; audit log; red-team thường xuyên.

## Rủi ro tài chính

### R-06: Burn rate token vượt kiểm soát
- **Mô tả**: Chi phí API tăng phi tuyến khi user base mở rộng.
- **Xác suất**: High. **Tác động**: High.
- **Mitigation**: Quota theo user/team; caching (prompt caching, semantic cache); routing model rẻ trước; báo cáo chi phí hàng ngày; alert khi vượt ngưỡng.

### R-07: ROI khó chứng minh giai đoạn đầu
- **Mô tả**: Ban Lãnh đạo có thể cắt đầu tư nếu chưa thấy giá trị rõ trong 6 tháng đầu.
- **Xác suất**: Medium. **Tác động**: High.
- **Mitigation**: Chọn 1-2 use case có ROI đo được (giảm ticket support, tăng tốc tra cứu hợp đồng); báo cáo giá trị đều đặn.

## Rủi ro vận hành & nhân sự

### R-08: Thiếu nhân sự MLE/DevOps AI
- **Mô tả**: Thị trường Việt Nam khan hiếm senior AI engineer.
- **Xác suất**: High. **Tác động**: High.
- **Mitigation**: Chương trình đào tạo nội bộ; đối tác với công ty AI Việt Nam; hybrid team (in-house + đối tác); cân nhắc remote quốc tế.

### R-09: Kháng cự thay đổi từ các công ty thành viên
- **Mô tả**: Các CIO/IT team các công ty thành viên có thể muốn tự triển khai riêng.
- **Xác suất**: Medium. **Tác động**: Medium.
- **Mitigation**: Steering Committee cấp tập đoàn; showcase sớm; SLA & pricing hấp dẫn cho công ty thành viên.

## Rủi ro chiến lược

### R-10: Model landscape thay đổi nhanh
- **Mô tả**: Model mới ra hàng tháng (Claude 5, GPT-5, Gemini) khiến kiến trúc phải update thường xuyên.
- **Xác suất**: Certain (đã xảy ra liên tục). **Tác động**: Medium.
- **Mitigation**: Kiến trúc plug-and-play cho model; quy trình đánh giá model 2 tuần/lần; ngân sách buffer cho migration.
