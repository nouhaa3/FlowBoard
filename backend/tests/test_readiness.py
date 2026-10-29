from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app import main


class FakeResult:
    def scalar_one(self) -> int:
        return 1


class FakeConnection:
    def __enter__(self) -> "FakeConnection":
        return self

    def __exit__(self, *_: object) -> None:
        pass

    def execute(self, statement: object) -> FakeResult:
        return FakeResult()


class FakeEngine:
    def connect(self) -> FakeConnection:
        return FakeConnection()


def test_readiness_succeeds_when_database_query_succeeds(monkeypatch) -> None:
    monkeypatch.setattr(main, "get_engine", lambda: FakeEngine())

    with TestClient(main.app) as client:
        response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_readiness_returns_service_unavailable_without_database(
    monkeypatch,
) -> None:
    def raise_database_not_configured():
        raise RuntimeError("DATABASE_URL must be set")

    monkeypatch.setattr(main, "get_engine", raise_database_not_configured)

    with TestClient(main.app) as client:
        response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json() == {"detail": "Database unavailable"}


def test_readiness_returns_service_unavailable_when_connection_fails(
    monkeypatch,
) -> None:
    def raise_connection_error():
        raise OperationalError("SELECT 1", {}, RuntimeError("database unavailable"))

    monkeypatch.setattr(main, "get_engine", raise_connection_error)

    with TestClient(main.app) as client:
        response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json() == {"detail": "Database unavailable"}
