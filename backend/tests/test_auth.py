from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.models import UserSession
from app.schemas.auth import LoginRequest, PublicUserResponse, RegistrationRequest
from app.services.auth import (
    generate_session_token,
    hash_password,
    hash_session_token,
    is_session_active,
    normalize_email,
    revoke_session,
    session_expiry,
    verify_password,
)


def test_password_hash_uses_argon2id_and_verifies_password() -> None:
    password = "correct horse battery staple"
    password_hash = hash_password(password)

    assert password_hash.startswith("$argon2id$")
    assert verify_password(password, password_hash)
    assert not verify_password("incorrect password", password_hash)
    assert not verify_password(password, "unrecognized-password-hash")
    assert password not in password_hash


def test_session_tokens_are_random_and_hashes_are_one_way_identifiers() -> None:
    first_token = generate_session_token()
    second_token = generate_session_token()

    assert first_token != second_token
    assert first_token not in hash_session_token(first_token)
    assert len(hash_session_token(first_token)) == 64
    assert hash_session_token(first_token) == hash_session_token(first_token)
    assert hash_session_token(first_token) != hash_session_token(second_token)
    with pytest.raises(ValueError, match="cannot be empty"):
        hash_session_token("")


def test_session_expiry_and_revocation_helpers() -> None:
    now = datetime(2026, 10, 29, 9, 0, tzinfo=UTC)
    expiry = session_expiry(3600, now=now)
    session = UserSession(
        user_id=uuid4(),
        token_hash=hash_session_token(generate_session_token()),
        expires_at=expiry,
    )

    assert expiry == now + timedelta(hours=1)
    assert is_session_active(session, now=now)
    assert not is_session_active(session, now=expiry)

    revoke_session(session, now=now)
    assert session.revoked_at == now
    assert not is_session_active(session, now=now)

    revoke_session(session, now=now + timedelta(minutes=1))
    assert session.revoked_at == now


def test_user_session_model_only_has_token_hash_and_cascade_fk() -> None:
    columns = UserSession.__table__.c
    user_fk = next(iter(columns.user_id.foreign_keys))

    assert "token" not in columns
    assert columns.token_hash.type.length == 64
    assert columns.token_hash.unique
    assert user_fk.target_fullname == "users.id"
    assert user_fk.ondelete == "CASCADE"
    assert columns.created_at.type.timezone is True
    assert columns.expires_at.type.timezone is True
    assert columns.revoked_at.nullable


def test_expiry_requires_positive_lifetime_and_aware_time() -> None:
    with pytest.raises(ValueError, match="positive"):
        session_expiry(0)
    with pytest.raises(ValueError, match="timezone-aware"):
        session_expiry(60, now=datetime(2026, 10, 29))


def test_local_cookie_defaults_are_usable_over_http() -> None:
    settings = Settings(_env_file=None, app_environment="development")

    assert settings.app_environment == "development"
    assert settings.secure_session_cookie is False
    assert "http://localhost:5173" in settings.allowed_frontend_origins


def test_production_cookie_security_is_required() -> None:
    settings = Settings(
        _env_file=None,
        app_environment="production",
        allowed_frontend_origins=["https://flowboard.example"],
    )
    assert settings.secure_session_cookie is True

    with pytest.raises(ValidationError, match="secure in production"):
        Settings(
            _env_file=None,
            app_environment="production",
            session_cookie_secure=False,
            allowed_frontend_origins=["https://flowboard.example"],
        )


@pytest.mark.parametrize(
    "origin",
    [
        "*",
        "https://flowboard.example/path",
        "http://flowboard.example",
        "not-an-origin",
    ],
)
def test_frontend_origins_must_be_exact_and_safe(origin: str) -> None:
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            app_environment="development",
            allowed_frontend_origins=[origin],
        )


def test_registration_and_login_normalize_email() -> None:
    registration = RegistrationRequest(
        email="  User@Example.com ",
        password="a long test password",
        display_name="  Flow User  ",
    )
    login = LoginRequest(
        email="USER@example.com",
        password="a long test password",
    )

    assert registration.email == "user@example.com"
    assert registration.display_name == "Flow User"
    assert login.email == "user@example.com"
    assert normalize_email(" User@Example.com ") == "user@example.com"


def test_public_user_response_never_exposes_password_or_session_secrets() -> None:
    user = SimpleNamespace(
        id=uuid4(),
        email="user@example.com",
        display_name="Flow User",
        created_at=datetime(2026, 10, 29, tzinfo=UTC),
        password_hash="private-password-hash",
        sessions=[
            SimpleNamespace(token_hash="private-token-hash"),
            SimpleNamespace(token="raw-session-token"),
        ],
    )

    response = PublicUserResponse.model_validate(user)
    response_data = response.model_dump()

    assert set(response_data) == {"id", "email", "display_name", "created_at"}
    assert "password_hash" not in response_data
    assert "sessions" not in response_data
    assert "token_hash" not in response_data
    assert "raw-session-token" not in str(response_data)
