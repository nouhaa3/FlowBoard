from collections.abc import Generator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.config import Settings
from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.models import Project, User
from app.security.csrf import CSRF_COOKIE_NAME
from app.security.session_auth import (
    AuthenticatedSessionContext,
    get_authenticated_session,
)

FRONTEND_ORIGIN = "http://localhost:5173"
CSRF_TOKEN = "project-route-csrf-token"


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
    )
    application = create_app(settings)

    def override_get_db() -> Generator[Session, None, None]:
        with Session(engine) as db:
            yield db

    application.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(application) as client:
            client.cookies.set(CSRF_COOKIE_NAME, CSRF_TOKEN)
            yield client, engine
    finally:
        application.dependency_overrides.clear()
        engine.dispose()


def authenticate(client: TestClient, engine: Engine) -> UUID:
    with Session(engine) as db:
        user = User(
            email=f"{uuid4()}@example.com",
            password_hash="test-password-hash",
            display_name="Project Owner",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        context = AuthenticatedSessionContext(user=user, session_id=uuid4())
        owner_id = user.id

    client.app.dependency_overrides[get_authenticated_session] = lambda: context
    return owner_id


def mutation_headers() -> dict[str, str]:
    return {
        "Origin": FRONTEND_ORIGIN,
        "X-CSRF-Token": CSRF_TOKEN,
    }


def test_project_crud_is_scoped_to_authenticated_owner(
    client_and_engine: tuple[TestClient, Engine],
) -> None:
    client, engine = client_and_engine
    owner_id = authenticate(client, engine)

    created = client.post(
        "/api/v1/projects",
        headers=mutation_headers(),
        json={"name": "  FlowBoard  ", "description": "Project description"},
    )

    assert created.status_code == 201
    assert set(created.json()) == {
        "id",
        "name",
        "description",
        "created_at",
        "updated_at",
    }
    assert created.json()["name"] == "FlowBoard"
    project_id = created.json()["id"]

    with Session(engine) as db:
        other_owner = User(
            email=f"{uuid4()}@example.com",
            password_hash="test-password-hash",
            display_name="Other Owner",
        )
        db.add(other_owner)
        db.flush()
        db.add(Project(owner_id=other_owner.id, name="Other user's project"))
        db.commit()

    listed = client.get("/api/v1/projects")
    assert listed.status_code == 200
    assert [project["id"] for project in listed.json()] == [project_id]

    fetched = client.get(f"/api/v1/projects/{project_id}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == project_id

    updated = client.patch(
        f"/api/v1/projects/{project_id}",
        headers=mutation_headers(),
        json={"name": "Updated project", "description": None},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Updated project"
    assert updated.json()["description"] is None

    with Session(engine) as db:
        stored_project = db.get(Project, UUID(project_id))
        assert stored_project is not None
        assert stored_project.owner_id == owner_id

    deleted = client.delete(
        f"/api/v1/projects/{project_id}",
        headers=mutation_headers(),
    )
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/projects/{project_id}").status_code == 404


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("GET", "/api/v1/projects", None),
        ("GET", f"/api/v1/projects/{uuid4()}", None),
        ("POST", "/api/v1/projects", {"name": "Unauthenticated"}),
        ("PATCH", f"/api/v1/projects/{uuid4()}", {"name": "Unauthenticated"}),
        ("DELETE", f"/api/v1/projects/{uuid4()}", None),
    ],
)
def test_project_endpoints_require_authentication(
    client_and_engine: tuple[TestClient, Engine],
    method: str,
    path: str,
    payload: dict[str, str] | None,
) -> None:
    client, _ = client_and_engine
    response = client.request(
        method,
        path,
        headers=mutation_headers(),
        json=payload,
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid or expired session."}


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("POST", "/api/v1/projects", {"name": "Blocked"}),
        ("PATCH", f"/api/v1/projects/{uuid4()}", {"name": "Blocked"}),
        ("DELETE", f"/api/v1/projects/{uuid4()}", None),
    ],
)
def test_project_mutations_require_csrf_header(
    client_and_engine: tuple[TestClient, Engine],
    method: str,
    path: str,
    payload: dict[str, str] | None,
) -> None:
    client, engine = client_and_engine
    authenticate(client, engine)

    response = client.request(
        method,
        path,
        headers={"Origin": FRONTEND_ORIGIN},
        json=payload,
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "CSRF token is missing or invalid."}


@pytest.mark.parametrize("method", ["GET", "PATCH", "DELETE"])
def test_project_owned_by_another_user_is_hidden(
    client_and_engine: tuple[TestClient, Engine],
    method: str,
) -> None:
    client, engine = client_and_engine
    authenticate(client, engine)
    with Session(engine) as db:
        other_user = User(
            email=f"{uuid4()}@example.com",
            password_hash="test-password-hash",
            display_name="Other Owner",
        )
        db.add(other_user)
        db.flush()
        project = Project(owner_id=other_user.id, name="Private project")
        db.add(project)
        db.commit()
        project_id = project.id

    payload = {"name": "Attempted takeover"} if method == "PATCH" else None
    response = client.request(
        method,
        f"/api/v1/projects/{project_id}",
        headers=mutation_headers(),
        json=payload,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Project not found."}
    with Session(engine) as db:
        stored_project = db.get(Project, project_id)
        assert stored_project is not None
        assert stored_project.name == "Private project"


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "   "},
        {"name": "x" * 121},
        {"name": "Valid", "owner_id": str(uuid4())},
    ],
)
def test_project_creation_rejects_invalid_input(
    client_and_engine: tuple[TestClient, Engine],
    payload: dict[str, str],
) -> None:
    client, engine = client_and_engine
    authenticate(client, engine)

    response = client.post(
        "/api/v1/projects",
        headers=mutation_headers(),
        json=payload,
    )

    assert response.status_code == 422
    with Session(engine) as db:
        assert db.scalar(select(Project)) is None


def test_project_cors_allows_authenticated_patch_preflight(
    client_and_engine: tuple[TestClient, Engine],
) -> None:
    client, _ = client_and_engine

    response = client.options(
        f"/api/v1/projects/{uuid4()}",
        headers={
            "Origin": FRONTEND_ORIGIN,
            "Access-Control-Request-Method": "PATCH",
            "Access-Control-Request-Headers": "content-type,x-csrf-token",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == FRONTEND_ORIGIN
    assert response.headers["access-control-allow-credentials"] == "true"
    assert "PATCH" in response.headers["access-control-allow-methods"]


@pytest.mark.parametrize("payload", [{}, {"name": None}, {"name": "   "}])
def test_project_update_rejects_empty_or_invalid_changes(
    client_and_engine: tuple[TestClient, Engine],
    payload: dict[str, str | None],
) -> None:
    client, engine = client_and_engine
    authenticate(client, engine)
    with Session(engine) as db:
        owner = db.scalar(select(User))
        assert owner is not None
        project = Project(owner_id=owner.id, name="Unchanged project")
        db.add(project)
        db.commit()
        project_id = project.id

    response = client.patch(
        f"/api/v1/projects/{project_id}",
        headers=mutation_headers(),
        json=payload,
    )

    assert response.status_code == 422
    with Session(engine) as db:
        project = db.get(Project, project_id)
        assert project is not None
        assert project.name == "Unchanged project"


@pytest.mark.parametrize("method", ["GET", "PATCH", "DELETE"])
def test_missing_project_returns_not_found(
    client_and_engine: tuple[TestClient, Engine],
    method: str,
) -> None:
    client, engine = client_and_engine
    authenticate(client, engine)
    response = client.request(
        method,
        f"/api/v1/projects/{uuid4()}",
        headers=mutation_headers(),
        json={"name": "No project"} if method == "PATCH" else None,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Project not found."}
