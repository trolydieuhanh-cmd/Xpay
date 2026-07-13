from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas import TaskCreate, TaskOut, TaskUpdate
from app.db.database import get_session
from app.db.models import Project, Task

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    project_id: int | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Task).order_by(Task.created_at.desc())
    if project_id is not None:
        stmt = stmt.where(Task.project_id == project_id)
    result = await session.execute(stmt)
    return list(result.scalars())


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreate, session: AsyncSession = Depends(get_session)):
    if not await session.get(Project, payload.project_id):
        raise HTTPException(status_code=404, detail="Không tìm thấy dự án")
    task = Task(**payload.model_dump())
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: int, payload: TaskUpdate, session: AsyncSession = Depends(get_session)
):
    task = await session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    await session.commit()
    await session.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: int, session: AsyncSession = Depends(get_session)):
    task = await session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")
    await session.delete(task)
    await session.commit()
