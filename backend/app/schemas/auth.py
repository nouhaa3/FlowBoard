from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.services.auth import normalize_email


class RegistrationRequest(BaseModel):
    email: EmailStr = Field(max_length=320)
    password: str = Field(min_length=12, max_length=128)
    display_name: str = Field(min_length=1, max_length=80)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email_address(cls, email: object) -> object:
        if isinstance(email, str):
            return normalize_email(email)
        return email

    @field_validator("display_name", mode="before")
    @classmethod
    def trim_display_name(cls, display_name: object) -> object:
        if isinstance(display_name, str):
            return display_name.strip()
        return display_name


class LoginRequest(BaseModel):
    email: EmailStr = Field(max_length=320)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email_address(cls, email: object) -> object:
        if isinstance(email, str):
            return normalize_email(email)
        return email


class PublicUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    display_name: str
    created_at: datetime
