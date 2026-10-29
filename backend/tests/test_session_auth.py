from collections.abc import Generator
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException, Request
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import User, UserSession
from app.security.csrf import SESSION_COOKIE_NAME
from app.security.session_auth import (
    AuthenticatedSessionContext,
    get_authenticated_session,
)
from app.services.auth import generate_session_token, hash_session_token


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    try:
        with Session(engine) as session:
            yield session
    finally:
        engine.dispose()


def make_request(token: str | None = None) -> Request:
    headers: list[tuple[bytes, bytes]] = []
    if token is not None:
        headers.append((b"cookie", f"{SESSION_COOKIE_NAME}={token}".encode("ascii")))
    return Request({"type": "http", "headers": headers})


def create_session(
    db: Session,
    *,
    token: str,
    expires_at: datetime,
    revoked_at: datetime | None = None,
    user_id: UUID | None = None,
) -> tuple[User | None, UserSession]:
    user = None
    if user_id is None:
        user = User(
            email=f"{uuid4()}@example.com",
            password_hash="test-password-hash",
            display_name="Test User",
        )
        db.add(user)
        db.flush()
        user_id = user.id

    session = UserSession(
        user_id=user_id,
        token_hash=hash_session_token(token),
        expires_at=expires_at,
        revoked_at=revoked_at,
    )
    db.add(session)
    db.flush()
    return user, session


def test_valid_session_returns_user_and_non_secret_session_context(
    db_session: Session,
) -> None:
    token = generate_session_token()
    user, stored_session = create_session(
        db_session,
        token=token,
        expires_at=datetime.now(UTC) + timedelta(minutes=5),
    )

    context = get_authenticated_session(make_request(token), db_session)

    assert isinstance(context, AuthenticatedSessionContext)
    assert user is not None
    assert context.user.id == user.id
    assert context.session_id == stored_session.id
    assert not hasattr(context, "token")
    assert not hasattr(context, "token_hash")


def test_missing_session_cookie_is_rejected_without_database_lookup(
    db_session: Session,
) -> None:
    with pytest.raises(HTTPException) as error:
        get_authenticated_session(make_request(), db_session)

    assert error.value.status_code == 401
    assert error.value.detail == "Invalid or expired session."


def test_unknown_session_token_is_rejected(db_session: Session) -> None:
    with pytest.raises(HTTPException) as error:
        get_authenticated_session(make_request(generate_session_token()), db_session)

    assert error.value.status_code == 401
    assert error.value.detail == "Invalid or expired session."


def test_expired_session_is_rejected(db_session: Session) -> None:
    token = generate_session_token()
    create_session(
        db_session,
        token=token,
        expires_at=datetime.now(UTC) - timedelta(seconds=1),
    )

    with pytest.raises(HTTPException) as error:
        get_authenticated_session(make_request(token), db_session)

    assert error.value.status_code == 401


def test_malformed_session_expiry_is_rejected_generically(db_session: Session) -> None:
    token = generate_session_token()
    create_session(
        db_session,
        token=token,
        expires_at=datetime.now() + timedelta(minutes=5),
    )

    with pytest.raises(HTTPException) as error:
        get_authenticated_session(make_request(token), db_session)

    assert error.value.status_code == 401
    assert error.value.detail == "Invalid or expired session."


def test_revoked_session_is_rejected(db_session: Session) -> None:
    token = generate_session_token()
    now = datetime.now(UTC)
    create_session(
        db_session,
        token=token,
        expires_at=now + timedelta(minutes=5),
        revoked_at=now,
    )

    with pytest.raises(HTTPException) as error:
        get_authenticated_session(make_request(token), db_session)

    assert error.value.status_code == 401


def test_database_query_failure_returns_generic_service_unavailable(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    internal_detail = "database server db.internal.example is unavailable"

    def fail_query(_statement) -> None:
        raise OperationalError("session lookup", {}, Exception(internal_detail))

    monkeypatch.setattr(db_session, "execute", fail_query)

    with pytest.raises(HTTPException) as error:
        get_authenticated_session(
            make_request(generate_session_token()),
            db_session,
        )

    assert error.value.status_code == 503
    assert error.value.detail == "Authentication service unavailable."
    assert internal_detail not in str(error.value)


def test_session_without_an_associated_user_is_rejected(db_session: Session) -> None:
    token = generate_session_token()
    create_session(
        db_session,
        token=token,
        expires_at=datetime.now(UTC) + timedelta(minutes=5),
        user_id=uuid4(),
    )

    with pytest.raises(HTTPException) as error:
        get_authenticated_session(make_request(token), db_session)

    assert error.value.status_code == 401
