# Eval framework

Bộ khung đánh giá chất lượng câu trả lời của PM AI. Dùng để track chất lượng
qua mỗi lần thay đổi prompt / knowledge base / model — chi tiết trong
`docs/TRAINING_LOOP.md`, Vòng 5.

## Cấu trúc

- `eval_set.jsonl` — bộ câu hỏi + rubric (mỗi dòng là 1 JSON object)
- `run_eval.py` — chạy toàn bộ eval, gọi PM AI và Claude judge, xuất báo cáo

## Format eval item

```json
{
  "id": "wbs-001",
  "role": "wbs_planner",
  "query": "Sinh WBS cho dự án chatbot pilot 8 tuần với đội 3 người...",
  "rubric": "Phải có: 3 cấp, ≥ 3 phase, ước lượng effort, milestone/gate, cảnh báo giả định.",
  "must_include": ["Phase", "milestone", "assumption"],
  "must_not_include": ["I cannot", "As an AI"]
}
```

## Chạy eval

```bash
cd backend
source .venv/bin/activate
python -m eval.run_eval
```

Kết quả in ra terminal + ghi vào `eval/results/<timestamp>.json`.

## Bổ sung eval item

Thêm dòng mới vào `eval_set.jsonl` với id duy nhất. Với mỗi thay đổi prompt/KB
lớn, chạy lại eval và so sánh điểm trung bình.
