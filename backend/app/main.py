import logging

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.v1.auth import router as auth_router
from app.api.v1.projects import router as projects_router
from app.core.config import Settings, get_settings
from app.db.session import get_engine


logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or get_settings()
    application = FastAPI(title="FlowBoard API")
    application.state.settings = app_settings
    application.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.allowed_frontend_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-CSRF-Token"],
    )
    application.include_router(auth_router, prefix="/api/v1/auth")
    application.include_router(projects_router, prefix="/api/v1/projects")

    @application.get("/health")
    def health_check() -> dict[str, str]:
        return {"status": "ok"}

    @application.get("/health/ready")
    def readiness_check() -> dict[str, str]:
        try:
            with get_engine().connect() as connection:
                connection.execute(text("SELECT 1")).scalar_one()
        except (RuntimeError, SQLAlchemyError) as error:
            logger.exception("Database readiness check failed")
            raise HTTPException(
                status_code=503,
                detail="Database unavailable",
            ) from error

        return {"status": "ready"}

    return application


app = create_app()
