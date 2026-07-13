"""Endpoint dành riêng cho các nghiệp vụ PM: sinh WBS, phân tích rủi ro, báo cáo."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.pm_agent import get_agent

router = APIRouter(prefix="/api/planning", tags=["planning"])


class WBSRequest(BaseModel):
    project_name: str
    goal: str
    constraints: str = ""
    duration_weeks: int = 12


class RiskAnalysisRequest(BaseModel):
    project_name: str
    context: str
    focus: str = "all"  # all | technical | financial | operational


class WeeklyReportRequest(BaseModel):
    project_name: str
    accomplishments: str
    blockers: str = ""
    next_week: str = ""


@router.post("/wbs")
async def generate_wbs(payload: WBSRequest):
    agent = get_agent()
    if not agent.client.is_ready:
        raise HTTPException(status_code=503, detail="Chưa cấu hình ANTHROPIC_API_KEY")

    user_prompt = f"""Hãy xây dựng Work Breakdown Structure (WBS) chi tiết cho dự án.

**Tên dự án**: {payload.project_name}
**Mục tiêu**: {payload.goal}
**Ràng buộc**: {payload.constraints or "Không có"}
**Thời gian dự kiến**: {payload.duration_weeks} tuần

Yêu cầu đầu ra (dạng markdown):
1. Phân rã 3 cấp: Phase → Deliverable → Task
2. Ước lượng effort (person-week) cho mỗi task
3. Xác định dependencies quan trọng
4. Đề xuất milestone/gate ở cuối mỗi phase
5. Cảnh báo các giả định (assumptions) và rủi ro chính
"""
    result = await agent.chat(
        messages=[{"role": "user", "content": user_prompt}],
        role="wbs_planner",
    )
    return result


@router.post("/risks")
async def analyze_risks(payload: RiskAnalysisRequest):
    agent = get_agent()
    if not agent.client.is_ready:
        raise HTTPException(status_code=503, detail="Chưa cấu hình ANTHROPIC_API_KEY")

    focus_map = {
        "all": "tất cả các khía cạnh (kỹ thuật, tài chính, vận hành, pháp lý, nhân sự)",
        "technical": "khía cạnh kỹ thuật (kiến trúc, model AI, hạ tầng, tích hợp)",
        "financial": "khía cạnh tài chính (ngân sách, ROI, chi phí vận hành, licensing)",
        "operational": "khía cạnh vận hành (nhân sự, quy trình, tuân thủ, thay đổi tổ chức)",
    }
    scope = focus_map.get(payload.focus, focus_map["all"])

    user_prompt = f"""Phân tích rủi ro cho dự án dưới đây, tập trung vào {scope}.

**Dự án**: {payload.project_name}
**Ngữ cảnh**: {payload.context}

Yêu cầu đầu ra (dạng bảng markdown):
| # | Rủi ro | Mô tả | Xác suất (0-100) | Tác động (0-100) | Mức | Chiến lược ứng phó | Người chịu trách nhiệm gợi ý |

Sau bảng, tổng kết 3 rủi ro TOP cần xử lý ngay và giải thích lý do."""
    result = await agent.chat(
        messages=[{"role": "user", "content": user_prompt}],
        role="risk_analyst",
    )
    return result


@router.post("/weekly-report")
async def weekly_report(payload: WeeklyReportRequest):
    agent = get_agent()
    if not agent.client.is_ready:
        raise HTTPException(status_code=503, detail="Chưa cấu hình ANTHROPIC_API_KEY")

    user_prompt = f"""Soạn báo cáo tuần cho dự án theo phong cách chuyên nghiệp, súc tích.

**Dự án**: {payload.project_name}
**Đã đạt được**: {payload.accomplishments}
**Vướng mắc**: {payload.blockers or "Không có"}
**Kế hoạch tuần tới**: {payload.next_week or "(chưa cung cấp)"}

Yêu cầu:
- Định dạng markdown, có mục 1) Tóm tắt điều hành, 2) Tiến độ, 3) Blocker & Rủi ro, 4) Kế hoạch tuần tới, 5) Đề nghị hỗ trợ
- Tone: chuyên nghiệp, tiếng Việt, phù hợp gửi Ban Giám đốc
- Không quá 400 từ"""
    result = await agent.chat(
        messages=[{"role": "user", "content": user_prompt}],
        role="report_writer",
    )
    return result
