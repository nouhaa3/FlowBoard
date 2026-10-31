from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.task import TaskPriority, TaskStatus


class TaskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10_000)
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: date | None = None

    @field_validator("title", mode="before")
    @classmethod
    def trim_title(cls, title: object) -> object:
        if isinstance(title, str):
            return title.strip()
        return title


class TaskUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10_000)
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_date: date | None = None

    @field_validator("title", mode="before")
    @classmethod
    def trim_title(cls, title: object) -> object:
        if isinstance(title, str):
            return title.strip()
        return title

    @model_validator(mode="after")
    def validate_changes(self) -> "TaskUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one task field must be provided.")
        for field in ("title", "status", "priority"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"Task {field} cannot be null.")
        return self


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    due_date: date | None
    created_at: datetime
    updated_at: datetime
