from functools import lru_cache
from ipaddress import ip_address
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str | None = None
    app_environment: Literal["development", "production"]
    session_cookie_secure: bool | None = None
    session_lifetime_seconds: int = Field(default=86_400, ge=60, le=2_592_000)
    allowed_frontend_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )

    @field_validator("allowed_frontend_origins")
    @classmethod
    def validate_frontend_origins(cls, origins: list[str]) -> list[str]:
        if not origins:
            raise ValueError("At least one frontend origin must be configured.")

        for origin in origins:
            parsed = urlsplit(origin)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.hostname
                or parsed.path
                or parsed.query
                or parsed.fragment
                or parsed.username
                or parsed.password
                or "*" in origin
                or origin != origin.strip()
            ):
                raise ValueError(
                    "Frontend origins must be exact http(s) origins without paths."
                )
            try:
                parsed.port
            except ValueError as error:
                raise ValueError("Frontend origin has an invalid port.") from error

            if parsed.scheme == "http":
                try:
                    loopback = ip_address(parsed.hostname).is_loopback
                except ValueError:
                    loopback = parsed.hostname.lower() == "localhost"
                if not loopback:
                    raise ValueError(
                        "HTTP frontend origins are allowed only on localhost "
                        "during development."
                    )

        return origins

    @model_validator(mode="after")
    def validate_cookie_security(self) -> "Settings":
        if (
            self.app_environment == "production"
            and self.session_cookie_secure is False
        ):
            raise ValueError("Session cookies must be secure in production.")
        if (
            self.app_environment == "production"
            and any(not origin.startswith("https://") for origin in self.allowed_frontend_origins)
        ):
            raise ValueError("Production frontend origins must use HTTPS.")
        return self

    @property
    def secure_session_cookie(self) -> bool:
        if self.session_cookie_secure is not None:
            return self.session_cookie_secure
        return self.app_environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
