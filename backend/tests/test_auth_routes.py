from collections.abc import Generator
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, Request
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.config import Settings
from app.api.v1 import auth as auth_routes
from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.models import User, UserSession
from app.security.csrf import CSRF_COOKIE_NAME, require_csrf
from app.services.auth import hash_session_token

FRONTEND_ORIGIN = "http://localhost:5173"


@pytest.fixture
def client_and_engine() -> Generator[tuple[TestClient, Engine], None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    settings = Settings(
        _env_file=None,
        app_environment="development",
        allowed_frontend_origins=[FRONTEND_ORIGIN],
        session_lifetime_seconds=600,
    )
    application = create_app(settings)

    def override_get_db() -> Generator[Session, None, None]:
        with Session(engine) as db:
            yield db

    application.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(application) as client:
            yield client, engine
    finally:
        application.dependency_overrides.clear()
        engine.dispose()


def test_registration_creates_user_and_hashed_session_cookie(
    client_and_engine: tuple[TestClient, Engine],
) -> None:
    client, engine = client_and_engine
    response = client.post(
        "/api/v1/auth/register",
        headers={"Origin": FRONTEND_ORIGIN},
        json={
            "email": "  FLOW.User@Example.com ",
            "password": "a sufficiently long password",
            "display_name": "Flow User",
        },
    )

    assert response.status_code == 201
    assert set(response.json()) == {"id", "email", "display_name", "created_at"}
    assert response.json()["email"] == "flow.user@example.com"
    assert "password_hash" not in response.text

    session_token = client.cookies.get("flowboard_session")
    assert session_token
    session_cookie = response.headers.get_list("set-cookie")
    assert any(
        "flowboard_session=" in cookie
        and "HttpOnly" in cookie
        and "SameSite=lax" in cookie
        and "Path=/" in cookie
        and "Max-Age=600" in cookie
        and "secure" not in cookie.lower()
        for cookie in session_cookie
    )
    assert any(
        "flowboard_csrf=" in cookie and "HttpOnly" not in cookie
        for cookie in session_cookie
    )

    with Session(engine) as db:
        user = db.scalar(select(User).where(User.email == "flow.user@example.com"))
        stored_session = db.scalar(select(UserSession))
        assert user is not None
        assert user.password_hash != "a sufficiently long password"
        assert stored_session is not None
        assert stored_session.token_hash == hash_session_token(session_token)
        assert session_token not in stored_session.token_hash


def test_production_session_cookie_is_secure() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    settings = Settings(
        _env_file=None,
        app_environment="production",
        allowed_frontend_origins=["https://flowboard.example"],
    )
    application = create_app(settings)

    def override_get_db() -> Generator[Session, None, None]:
        with Session(engine) as db:
            yield db

    application.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(application) as client:
            response = client.post(
                "/api/v1/auth/register",
                headers={"Origin": "https://flowboard.example"},
                json={
                    "email": "secure@example.com",
                    "password": "a sufficiently long password",
                    "display_name": "Secure User",
                },
            )
        assert response.status_code == 201
        session_cookie = next(
            cookie
            for cookie in response.headers.get_list("set-cookie")
            if "flowboard_session=" in cookie
        )
        assert "Secure" in session_cookie
        assert "HttpOnly" in session_cookie
    finally:
        application.dependency_overrides.clear()
        engine.dispose()


def test_duplicate_registration_returns_conflict(
    client_and_engine: tuple[TestClient, Engine],
) -> None:
    client, _ = client_and_engine
    payload = {
        "email": "duplicate@example.com",
        "password": "a sufficiently long password",
        "display_name": "Flow User",
    }
    headers = {"Origin": FRONTEND_ORIGIN}

    assert client.post("/api/v1/auth/register", headers=headers, json=payload).status_code == 201
    response = client.post("/api/v1/auth/register", headers=headers, json=payload)

    assert response.status_code == 409
    assert response.json() == {"detail": "Email is already registered."}


def test_registration_uniqueness_race_rolls_back(
    client_and_engine: tuple[TestClient, Engine],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, _ = client_and_engine
    rollback_called = False
    original_rollback = Session.rollback

    def raise_unique_conflict(_session: Session) -> None:
        original_error = SimpleNamespace(
            diag=SimpleNamespace(constraint_name="uq_users_email")
        )
        raise IntegrityError("INSERT INTO users", {}, original_error)

    def track_rollback(session: Session) -> None:
        nonlocal rollback_called
        rollback_called = True
        original_rollback(session)

    monkeypatch.setattr(Session, "commit", raise_unique_conflict)
    monkeypatch.setattr(Session, "rollback", track_rollback)
    response = client.post(
        "/api/v1/auth/register",
        headers={"Origin": FRONTEND_ORIGIN},
        json={
            "email": "race@example.com",
            "password": "a sufficiently long password",
            "display_name": "Race User",
        },
    )

    assert response.status_code == 409
    assert rollback_called


def test_registration_unrelated_integrity_error_is_not_reported_as_duplicate(
    client_and_engine: tuple[TestClient, Engine],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, _ = client_and_engine
    rollback_called = False
    original_rollback = Session.rollback

    def raise_other_conflict(_session: Session) -> None:
        raise IntegrityError(
            "INSERT INTO users",
            {},
            SimpleNamespace(diag=SimpleNamespace(constraint_name="other_constraint")),
        )

    def track_rollback(session: Session) -> None:
        nonlocal rollback_called
        rollback_called = True
        original_rollback(session)

    monkeypatch.setattr(Session, "commit", raise_other_conflict)
    monkeypatch.setattr(Session, "rollback", track_rollback)
    with pytest.raises(IntegrityError):
        client.post(
            "/api/v1/auth/register",
            headers={"Origin": FRONTEND_ORIGIN},
            json={
                "email": "integrity@example.com",
                "password": "a sufficiently long password",
                "display_name": "Integrity User",
            },
        )

    assert rollback_called


@pytest.mark.parametrize(
    "email,password",
    [
        ("missing@example.com", "a sufficiently long password"),
        ("known@example.com", "incorrect password"),
    ],
)
def test_login_failures_are_generic(
    client_and_engine: tuple[TestClient, Engine],
    email: str,
    password: str,
) -> None:
    client, _ = client_and_engine
    headers = {"Origin": FRONTEND_ORIGIN}
    client.post(
        "/api/v1/auth/register",
        headers=headers,
        json={
            "email": "known@example.com",
            "password": "a sufficiently long password",
            "display_name": "Known User",
        },
    )

    client.cookies.clear()
    response = client.post(
        "/api/v1/auth/login",
        headers=headers,
        json={"email": email, "password": password},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid email or password."}
    assert "set-cookie" not in response.headers


def test_login_verifies_unknown_user_against_fixed_dummy_hash(
    client_and_engine: tuple[TestClient, Engine],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, _ = client_and_engine
    verification_hashes: list[str] = []
    original_verify_password = auth_routes.verify_password

    def track_verification(password: str, password_hash: str) -> bool:
        verification_hashes.append(password_hash)
        return original_verify_password(password, password_hash)

    monkeypatch.setattr(auth_routes, "verify_password", track_verification)
    response = client.post(
        "/api/v1/auth/login",
        headers={"Origin": FRONTEND_ORIGIN},
        json={
            "email": "missing@example.com",
            "password": "a sufficiently long password",
        },
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid email or password."}
    assert verification_hashes == [auth_routes.DUMMY_PASSWORD_HASH]
    assert auth_routes.DUMMY_PASSWORD_HASH.startswith("$argon2id$")


def test_login_sets_session_cookie_and_returns_public_user(
    client_and_engine: tuple[TestClient, Engine],
) -> None:
    client, engine = client_and_engine
    headers = {"Origin": FRONTEND_ORIGIN}
    client.post(
        "/api/v1/auth/register",
        headers=headers,
        json={
            "email": "login@example.com",
            "password": "a sufficiently long password",
            "display_name": "Login User",
        },
    )
    client.cookies.clear()

    response = client.post(
        "/api/v1/auth/login",
        headers=headers,
        json={"email": " LOGIN@example.com ", "password": "a sufficiently long password"},
    )

    assert response.status_code == 200
    assert set(response.json()) == {"id", "email", "display_name", "created_at"}
    assert "password_hash" not in response.text
    token = client.cookies.get("flowboard_session")
    assert token
    with Session(engine) as db:
        sessions = list(db.scalars(select(UserSession)))
        assert len(sessions) == 2
        assert hash_session_token(token) in {item.token_hash for item in sessions}


@pytest.mark.parametrize("origin", [None, "https://not-allowed.example"])
def test_auth_routes_reject_missing_or_unlisted_origins(
    client_and_engine: tuple[TestClient, Engine],
    origin: str | None,
) -> None:
    client, engine = client_and_engine
    headers = {} if origin is None else {"Origin": origin}
    response = client.post(
        "/api/v1/auth/register",
        headers=headers,
        json={
            "email": "blocked@example.com",
            "password": "a sufficiently long password",
            "display_name": "Blocked User",
        },
    )

    assert response.status_code == 403
    with Session(engine) as db:
        assert db.scalar(select(User)) is None


def test_cors_allows_configured_origin_with_credentials(
    client_and_engine: tuple[TestClient, Engine],
) -> None:
    client, _ = client_and_engine
    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": FRONTEND_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == FRONTEND_ORIGIN
    assert response.headers["access-control-allow-credentials"] == "true"


def test_cors_rejects_unconfigured_origin(
    client_and_engine: tuple[TestClient, Engine],
) -> None:
    client, _ = client_and_engine
    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "https://not-allowed.example",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_csrf_dependency_requires_matching_cookie_and_header() -> None:
    settings = Settings(
        _env_file=None,
        app_environment="development",
        allowed_frontend_origins=[FRONTEND_ORIGIN],
    )
    valid_request = Request(
        {
            "type": "http",
            "headers": [
                (b"origin", FRONTEND_ORIGIN.encode()),
                (b"cookie", f"{CSRF_COOKIE_NAME}=token-value".encode()),
                (b"x-csrf-token", b"token-value"),
            ],
        }
    )
    invalid_request = Request(
        {
            "type": "http",
            "headers": [
                (b"origin", FRONTEND_ORIGIN.encode()),
                (b"cookie", f"{CSRF_COOKIE_NAME}=cookie-value".encode()),
                (b"x-csrf-token", b"different-value"),
            ],
        }
    )

    require_csrf(valid_request, settings)
    with pytest.raises(HTTPException) as error:
        require_csrf(invalid_request, settings)
    assert error.value.status_code == 403


@pytest.mark.parametrize(
    "cookie_token,header_token",
    [
        ("tøkén", "tøkén"),
        ("token-value", "tøkén"),
        ("tøkén", "token-value"),
    ],
)
def test_csrf_dependency_rejects_non_ascii_tokens(
    cookie_token: str,
    header_token: str,
) -> None:
    settings = Settings(
        _env_file=None,
        app_environment="development",
        allowed_frontend_origins=[FRONTEND_ORIGIN],
    )
    request = Request(
        {
            "type": "http",
            "headers": [
                (b"origin", FRONTEND_ORIGIN.encode()),
                (b"cookie", f"{CSRF_COOKIE_NAME}={cookie_token}".encode("utf-8")),
                (b"x-csrf-token", header_token.encode("utf-8")),
            ],
        }
    )

    with pytest.raises(HTTPException) as error:
        require_csrf(request, settings)
    assert error.value.status_code == 403
