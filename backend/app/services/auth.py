"""Authentication primitives; routes must add CSRF and exact Origin checks.

Cookie-authenticated state-changing endpoints must validate a CSRF token and
compare the request Origin exactly against configured frontend origins.
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from pwdlib.hashers.argon2 import Argon2Hasher

from app.models.user_session import UserSession

_password_hash = PasswordHash((Argon2Hasher(),))


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hash.verify(password, password_hash)
    except UnknownHashError:
        return False


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    if not token:
        raise ValueError("Session token cannot be empty.")
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def session_expiry(
    lifetime_seconds: int,
    *,
    now: datetime | None = None,
) -> datetime:
    if lifetime_seconds <= 0:
        raise ValueError("Session lifetime must be positive.")
    current_time = now or datetime.now(UTC)
    if current_time.tzinfo is None or current_time.utcoffset() is None:
        raise ValueError("Session time must be timezone-aware.")
    return current_time + timedelta(seconds=lifetime_seconds)


def is_session_active(
    session: UserSession,
    *,
    now: datetime | None = None,
) -> bool:
    current_time = now or datetime.now(UTC)
    if current_time.tzinfo is None or current_time.utcoffset() is None:
        raise ValueError("Session time must be timezone-aware.")
    expires_at = session.expires_at
    if expires_at.tzinfo is None or expires_at.utcoffset() is None:
        raise ValueError("Session expiry must be timezone-aware.")
    return session.revoked_at is None and expires_at > current_time


def revoke_session(
    session: UserSession,
    *,
    now: datetime | None = None,
) -> None:
    if session.revoked_at is None:
        revoked_at = now or datetime.now(UTC)
        if revoked_at.tzinfo is None or revoked_at.utcoffset() is None:
            raise ValueError("Revocation time must be timezone-aware.")
        session.revoked_at = revoked_at
