"""Chạy eval set qua PM Agent, chấm điểm bằng LLM-as-judge (Claude Opus)."""

from __future__ import annotations

import asyncio
import json
import re
import sys
from datetime import UTC, datetime
from pathlib import Path

from app.core.claude_client import ClaudeClient
from app.services.pm_agent import PMAgent

EVAL_SET = Path(__file__).parent / "eval_set.jsonl"
RESULTS_DIR = Path(__file__).parent / "results"

JUDGE_PROMPT = """Bạn là giám khảo đánh giá chất lượng câu trả lời của một AI trợ lý quản lý dự án.

Câu hỏi:
{query}

Rubric chấm điểm:
{rubric}

Câu trả lời của AI:
---
{answer}
---

Hãy chấm điểm từ 1 đến 5:
- 5: Đáp ứng toàn bộ rubric, chính xác, chuyên nghiệp, có trích dẫn nguồn nếu phù hợp
- 4: Đáp ứng phần lớn, chỉ thiếu chi tiết nhỏ
- 3: Đáp ứng cơ bản, nhưng có điểm quan trọng bị bỏ sót
- 2: Sai/thiếu nhiều điểm chính, hoặc lạc đề một phần
- 1: Sai hoàn toàn hoặc từ chối trả lời

Trả về DUY NHẤT một JSON:
{{"score": <1-5>, "reason": "<lý do ngắn gọn, tối đa 200 ký tự>"}}
"""


async def load_eval_set() -> list[dict]:
    if not EVAL_SET.exists():
        raise FileNotFoundError(f"Không tìm thấy {EVAL_SET}")
    items = []
    for line in EVAL_SET.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("//"):
            continue
        items.append(json.loads(line))
    return items


def check_hard_constraints(item: dict, answer: str) -> tuple[bool, str]:
    answer_lower = answer.lower()
    for kw in item.get("must_include", []):
        if kw.lower() not in answer_lower:
            return False, f"Thiếu từ khóa bắt buộc: '{kw}'"
    for kw in item.get("must_not_include", []):
        if kw.lower() in answer_lower:
            return False, f"Chứa từ khóa cấm: '{kw}'"
    return True, ""


async def judge_answer(client: ClaudeClient, item: dict, answer: str) -> dict:
    prompt = JUDGE_PROMPT.format(
        query=item["query"], rubric=item["rubric"], answer=answer
    )
    result = await client.complete(
        system="Bạn là một giám khảo khách quan. Chỉ trả về JSON hợp lệ.",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
    )
    text = result["text"].strip()
    # Attempt to parse JSON — accept fenced code blocks too
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        return {"score": 0, "reason": "Judge không trả về JSON: " + text[:200]}
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError as e:
        return {"score": 0, "reason": f"JSON parse fail: {e}"}


async def run_one(agent: PMAgent, client: ClaudeClient, item: dict) -> dict:
    try:
        response = await agent.chat(
            messages=[{"role": "user", "content": item["query"]}],
            role=item.get("role", "project_manager"),
        )
        answer = response.get("text", "")
    except Exception as e:
        return {
            "id": item["id"],
            "role": item.get("role"),
            "score": 0,
            "hard_pass": False,
            "reason": f"AI lỗi: {e}",
            "answer_preview": "",
        }

    hard_pass, hard_reason = check_hard_constraints(item, answer)
    judge = await judge_answer(client, item, answer)
    return {
        "id": item["id"],
        "role": item.get("role"),
        "score": int(judge.get("score", 0)),
        "hard_pass": hard_pass,
        "hard_reason": hard_reason,
        "judge_reason": judge.get("reason", ""),
        "rag_used": response.get("rag_used", False),
        "input_tokens": response.get("usage", {}).get("input_tokens", 0),
        "output_tokens": response.get("usage", {}).get("output_tokens", 0),
        "answer_preview": answer[:300],
    }


async def main() -> int:
    client = ClaudeClient()
    if not client.is_ready:
        print("❌ ANTHROPIC_API_KEY chưa cấu hình.", file=sys.stderr)
        return 2

    agent = PMAgent(client=client)
    items = await load_eval_set()
    print(f"Chạy {len(items)} eval item...")

    results = []
    for item in items:
        print(f"  · {item['id']}...", end=" ", flush=True)
        r = await run_one(agent, client, item)
        results.append(r)
        mark = "✓" if r["hard_pass"] and r["score"] >= 4 else "✗"
        print(f"{mark} score={r['score']}/5 hard={r['hard_pass']}")

    total = len(results)
    avg = sum(r["score"] for r in results) / max(total, 1)
    hard_pass = sum(1 for r in results if r["hard_pass"])
    print()
    print("=== Tổng kết ===")
    print(f"Điểm trung bình: {avg:.2f}/5")
    print(f"Vượt hard-constraint: {hard_pass}/{total}")

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    out = RESULTS_DIR / f"{ts}.json"
    out.write_text(
        json.dumps(
            {
                "timestamp": ts,
                "summary": {
                    "count": total,
                    "avg_score": avg,
                    "hard_pass_rate": hard_pass / max(total, 1),
                },
                "results": results,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"Chi tiết ghi vào: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
