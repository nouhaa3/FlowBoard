from collections.abc import Generator

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db import session as database_session


def test_session_factory_uses_configured_database(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DATABASE_URL", "sqlite+pysqlite:///:memory:")
    get_settings.cache_clear()
    database_session.get_engine.cache_clear()
    database_session.get_session_factory.cache_clear()
    engine = database_session.get_engine()

    try:
        factory = database_session.get_session_factory()
        with factory() as db:
            assert db.scalar(text("SELECT 1")) == 1
    finally:
        engine.dispose()
        database_session.get_session_factory.cache_clear()
        database_session.get_engine.cache_clear()
        get_settings.cache_clear()


def test_session_dependency_closes_session(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    closed = False

    class FakeSession:
        def close(self) -> None:
            nonlocal closed
            closed = True

    fake_session = FakeSession()
    monkeypatch.setattr(
        database_session,
        "get_session_factory",
        lambda: lambda: fake_session,
    )

    dependency: Generator[Session, None, None] = database_session.get_db()
    assert next(dependency) is fake_session

    with pytest.raises(StopIteration):
        next(dependency)

    assert closed
