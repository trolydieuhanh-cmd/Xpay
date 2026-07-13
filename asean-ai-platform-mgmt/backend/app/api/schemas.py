from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.db.models import (
    ProjectStatus,
    RiskLevel,
    RiskStatus,
    TaskPriority,
    TaskStatus,
)


class ProjectCreate(BaseModel):
    name: str
    code: str
    description: str = ""
    status: ProjectStatus = ProjectStatus.PLANNING
    owner: str = ""
    start_date: datetime | None = None
    target_date: datetime | None = None
    budget_vnd: int = 0
    tags: list[str] = Field(default_factory=list)


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: ProjectStatus | None = None
    owner: str | None = None
    start_date: datetime | None = None
    target_date: datetime | None = None
    budget_vnd: int | None = None
    tags: list[str] | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    description: str
    status: ProjectStatus
    owner: str
    start_date: datetime | None
    target_date: datetime | None
    budget_vnd: int
    tags: list[str]
    created_at: datetime
    updated_at: datetime


class TaskCreate(BaseModel):
    project_id: int
    title: str
    description: str = ""
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    assignee: str = ""
    estimate_hours: int = 0
    due_date: datetime | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assignee: str | None = None
    estimate_hours: int | None = None
    due_date: datetime | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    description: str
    status: TaskStatus
    priority: TaskPriority
    assignee: str
    estimate_hours: int
    due_date: datetime | None
    created_at: datetime
    updated_at: datetime


class RiskCreate(BaseModel):
    project_id: int
    title: str
    description: str = ""
    level: RiskLevel = RiskLevel.MEDIUM
    probability: int = 50
    impact: int = 50
    status: RiskStatus = RiskStatus.IDENTIFIED
    mitigation: str = ""
    owner: str = ""


class RiskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    description: str
    level: RiskLevel
    probability: int
    impact: int
    status: RiskStatus
    mitigation: str
    owner: str
    created_at: datetime
    updated_at: datetime


class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    role: str = "project_manager"
    use_rag: bool = True
    stream: bool = False
    conversation_id: int | None = None


class ChatResponse(BaseModel):
    text: str
    model: str
    stop_reason: str | None = None
    input_tokens: int = 0
    output_tokens: int = 0
    rag_used: bool = False
    conversation_id: int | None = None
    message_id: int | None = None


class KnowledgeSearchResult(BaseModel):
    title: str
    source: str
    excerpt: str
    score: float


class FeedbackCreate(BaseModel):
    message_id: int | None = None
    rating: int = 0  # -1, 0, 1
    note: str = ""
