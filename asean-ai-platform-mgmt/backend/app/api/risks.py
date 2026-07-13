from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas import RiskCreate, RiskOut
from app.db.database import get_session
from app.db.models import Project, Risk

router = APIRouter(prefix="/api/risks", tags=["risks"])


@router.get("", response_model=list[RiskOut])
async def list_risks(
    project_id: int | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Risk).order_by(Risk.created_at.desc())
    if project_id is not None:
        stmt = stmt.where(Risk.project_id == project_id)
    result = await session.execute(stmt)
    return list(result.scalars())


@router.post("", response_model=RiskOut, status_code=status.HTTP_201_CREATED)
async def create_risk(payload: RiskCreate, session: AsyncSession = Depends(get_session)):
    if not await session.get(Project, payload.project_id):
        raise HTTPException(status_code=404, detail="Không tìm thấy dự án")
    risk = Risk(**payload.model_dump())
    session.add(risk)
    await session.commit()
    await session.refresh(risk)
    return risk


@router.delete("/{risk_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_risk(risk_id: int, session: AsyncSession = Depends(get_session)):
    risk = await session.get(Risk, risk_id)
    if not risk:
        raise HTTPException(status_code=404, detail="Không tìm thấy rủi ro")
    await session.delete(risk)
    await session.commit()
