from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ProjectCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=10_000)

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, name: object) -> object:
        if isinstance(name, str):
            return name.strip()
        return name


class ProjectUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=10_000)

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, name: object) -> object:
        if isinstance(name, str):
            return name.strip()
        return name

    @model_validator(mode="after")
    def validate_changes(self) -> "ProjectUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one project field must be provided.")
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("Project name cannot be null.")
        return self


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
