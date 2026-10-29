from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.dependencies import get_app_settings
from app.db.session import get_db
from app.models.user import User
from app.models.user_session import UserSession
from app.schemas.auth import LoginRequest, PublicUserResponse, RegistrationRequest
from app.security.csrf import (
    require_allowed_origin,
    set_auth_cookies,
)
from app.services.auth import (
    generate_session_token,
    hash_password,
    hash_session_token,
    session_expiry,
    verify_password,
)

router = APIRouter()
DUMMY_PASSWORD_HASH = hash_password("flowboard-invalid-user-password")


def _is_email_unique_violation(error: IntegrityError) -> bool:
    diagnostic = getattr(error.orig, "diag", None)
    if getattr(diagnostic, "constraint_name", None) == "uq_users_email":
        return True

    return str(error.orig) == "UNIQUE constraint failed: users.email"


@router.post(
    "/register",
    response_model=PublicUserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_allowed_origin)],
)
def register(
    payload: RegistrationRequest,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_app_settings),
) -> User:
    existing_user = db.scalar(select(User).where(User.email == payload.email))
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered.",
        )

    token = generate_session_token()
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name,
    )
    try:
        db.add(user)
        db.flush()
        db.add(
            UserSession(
                user_id=user.id,
                token_hash=hash_session_token(token),
                expires_at=session_expiry(settings.session_lifetime_seconds),
            )
        )
        db.commit()
    except IntegrityError as error:
        db.rollback()
        if _is_email_unique_violation(error):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already registered.",
            ) from error
        raise
    except Exception:
        db.rollback()
        raise

    set_auth_cookies(response, token, settings)
    return user


@router.post(
    "/login",
    response_model=PublicUserResponse,
    dependencies=[Depends(require_allowed_origin)],
)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_app_settings),
) -> User:
    user = db.scalar(select(User).where(User.email == payload.email))
    password_hash = user.password_hash if user is not None else DUMMY_PASSWORD_HASH
    password_matches = verify_password(payload.password, password_hash)
    if user is None or not password_matches:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = generate_session_token()
    try:
        db.add(
            UserSession(
                user_id=user.id,
                token_hash=hash_session_token(token),
                expires_at=session_expiry(settings.session_lifetime_seconds),
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    set_auth_cookies(response, token, settings)
    return user
