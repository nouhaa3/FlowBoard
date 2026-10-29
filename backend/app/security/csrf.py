import secrets

from fastapi import Depends, HTTPException, Request, Response, status

from app.core.config import Settings
from app.core.dependencies import get_app_settings

SESSION_COOKIE_NAME = "flowboard_session"
CSRF_COOKIE_NAME = "flowboard_csrf"


def validate_allowed_origin(request: Request, settings: Settings) -> None:
    origin = request.headers.get("origin")
    if origin is None or origin not in settings.allowed_frontend_origins:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Origin is not allowed.",
        )


def require_allowed_origin(
    request: Request,
    settings: Settings = Depends(get_app_settings),
) -> None:
    validate_allowed_origin(request, settings)


def require_csrf(
    request: Request,
    settings: Settings = Depends(get_app_settings),
) -> None:
    validate_allowed_origin(request, settings)
    cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
    header_token = request.headers.get("X-CSRF-Token")
    if (
        not cookie_token
        or not header_token
        or not _csrf_tokens_match(cookie_token, header_token)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token is missing or invalid.",
        )


def _csrf_tokens_match(cookie_token: str, header_token: str) -> bool:
    try:
        cookie_bytes = cookie_token.encode("ascii")
        header_bytes = header_token.encode("ascii")
    except UnicodeEncodeError:
        return False
    return secrets.compare_digest(cookie_bytes, header_bytes)


def set_auth_cookies(response: Response, session_token: str, settings: Settings) -> None:
    cookie_options = {
        "max_age": settings.session_lifetime_seconds,
        "path": "/",
        "secure": settings.secure_session_cookie,
        "samesite": "lax",
    }
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        **cookie_options,
    )
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=secrets.token_urlsafe(32),
        httponly=False,
        **cookie_options,
    )
