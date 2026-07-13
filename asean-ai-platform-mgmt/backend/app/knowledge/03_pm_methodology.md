# Phương pháp luận quản lý dự án ASEAN AI Platform

## Khung tổng thể

Chúng ta dùng **Hybrid Agile-Stage-Gate** — chia dự án thành các phase có gate phê duyệt, trong mỗi phase chạy sprint 2 tuần theo Scrum.

## Các Gate chính

| Gate | Thời điểm | Điều kiện PASS |
| --- | --- | --- |
| G0 - Concept | Khởi động | Business case được HĐQT phê duyệt |
| G1 - Architecture | Cuối tháng 1 | Kiến trúc + POC Model Gateway hoạt động; risk register v1 |
| G2 - Pilot Ready | Cuối Q1 | Chatbot + RAG hoạt động với 1 công ty pilot; SLA đã ký |
| G3 - Scale Ready | Cuối Q2 | Uptime ≥ 99.5% trong 30 ngày; chi phí/query ≤ $0.05 |
| G4 - Y1 Review | Cuối Q4 | KPI Y1 đạt ≥ 80%; đề xuất Phase 2 |

## Nhịp sinh hoạt

- **Daily standup**: 15 phút, 9:30 sáng (tùy chọn cho pod < 4 người)
- **Sprint planning**: 2 giờ, đầu sprint
- **Sprint review**: 1 giờ, cuối sprint, có stakeholder tham gia
- **Retrospective**: 1 giờ, cuối sprint
- **Weekly PM review**: thứ 6 hàng tuần, PM tổng hợp báo cáo gửi Sponsor
- **Monthly Steering Committee**: tuần đầu tháng, review KPI + rủi ro cấp cao

## Công cụ

| Mục đích | Công cụ khuyến nghị |
| --- | --- |
| Task tracking | Linear hoặc Jira |
| Docs & Wiki | Notion hoặc Confluence |
| Chat | Slack (kênh riêng cho dự án) |
| Repo | GitHub (private) |
| CI/CD | GitHub Actions + ArgoCD |
| Diagram | Excalidraw, Mermaid |
| PM AI trợ lý | **Chính dự án này** — dùng để lập plan, phân tích rủi ro, báo cáo |

## Định nghĩa "Done"

Một task chỉ được coi là Done khi:
1. Code review đã pass, đã merge vào main
2. Test unit + integration ≥ 80% coverage cho code mới
3. Documentation đã cập nhật
4. Đã deploy lên staging và có smoke test
5. Không phá vỡ SLA hiện tại

## Định nghĩa "Ready" cho sprint

Một task chỉ được đưa vào sprint khi:
1. Có acceptance criteria rõ ràng
2. Đã ước lượng (story point hoặc T-shirt size)
3. Không có blocker chưa xử lý
4. Dependencies đã có sẵn hoặc được lên kế hoạch trong sprint

## Ma trận trách nhiệm (RACI mẫu)

| Hoạt động | Sponsor | PM | Tech Lead | Dev/MLE | DevOps | Stakeholder |
| --- | --- | --- | --- | --- | --- | --- |
| Duyệt phạm vi | A | R | C | I | I | C |
| Thiết kế kiến trúc | I | C | A/R | C | C | I |
| Ước lượng | I | R | A | R | R | I |
| Triển khai | I | I | A | R | R | I |
| Release production | I | R | C | I | A/R | I |
| Báo cáo tuần | I | A/R | C | I | I | I |
| Đánh giá rủi ro cao | A | R | C | I | C | I |

*R = Responsible, A = Accountable, C = Consulted, I = Informed*
