import logging
from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.user_session import UserSession
from app.security.csrf import SESSION_COOKIE_NAME
from app.services.auth import hash_session_token, is_session_active

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class AuthenticatedSessionContext:
    user: User
    session_id: UUID


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired session.",
    )


def get_authenticated_session(
    request: Request,
    db: Session = Depends(get_db),
) -> AuthenticatedSessionContext:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise _unauthorized()

    token_hash = hash_session_token(token)
    statement = (
        select(UserSession, User)
        .join(User, User.id == UserSession.user_id)
        .where(UserSession.token_hash == token_hash)
    )
    try:
        row = db.execute(statement).one_or_none()
    except SQLAlchemyError as error:
        logger.error(
            "Session authentication database query failed (%s)",
            type(error).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable.",
        ) from None

    if row is None:
        raise _unauthorized()

    session, user = row
    try:
        active = is_session_active(session)
    except ValueError:
        active = False
    if not active:
        raise _unauthorized()

    return AuthenticatedSessionContext(user=user, session_id=session.id)
