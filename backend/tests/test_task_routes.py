from collections.abc import Generator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.config import Settings
from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.models import Project, Task, TaskPriority, TaskStatus, User
from app.security.csrf import CSRF_COOKIE_NAME
from app.security.session_auth import (
    AuthenticatedSessionContext,
    get_authenticated_session,
)

FRONTEND_ORIGIN = "http://localhost:5173"
CSRF_TOKEN = "task-route-csrf-token"


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


def create_authenticated_user(
    client: TestClient,
    engine: Engine,
) -> UUID:
    with Session(engine) as db:
        user = User(
            email=f"{uuid4()}@example.com",
            password_hash="test-password-hash",
            display_name="Task Owner",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        context = AuthenticatedSessionContext(user=user, session_id=uuid4())
        user_id = user.id

    client.app.dependency_overrides[get_authenticated_session] = lambda: context
    return user_id


def create_project(
    engine: Engine,
    owner_id: UUID,
    *,
    name: str = "Test project",
) -> Project:
    with Session(engine) as db:
        project = Project(owner_id=owner_id, name=name)
        db.add(project)
        db.commit()
        db.refresh(project)
        return project


def create_task(
    engine: Engine,
    project_id: UUID,
    *,
    title: str = "Test task",
) -> Task:
    with Session(engine) as db:
        task = Task(project_id=project_id, title=title)
        db.add(task)
        db.commit()
        db.refresh(task)
        return task


def mutation_headers() -> dict[str, str]:
    return {
        "Origin": FRONTEND_ORIGIN,
        "X-CSRF-Token": CSRF_TOKEN,
    }


def test_task_crud_uses_owned_project_and_existing_fields(
    client_and_engine: tuple[TestClient, Engine],
) -> None:
    client, engine = client_and_engine
    owner_id = create_authenticated_user(client, engine)
    project = create_project(engine, owner_id)
    other_owner = User(
        email=f"{uuid4()}@example.com",
        password_hash="test-password-hash",
        display_name="Other Owner",
    )
    with Session(engine) as db:
        db.add(other_owner)
        db.commit()
        db.refresh(other_owner)
        other_project = Project(owner_id=other_owner.id, name="Other project")
        db.add(other_project)
        db.commit()
        db.refresh(other_project)
        other_project_id = other_project.id
        db.add(Task(project_id=other_project_id, title="Private task"))
        db.commit()

    created = client.post(
        f"/api/v1/projects/{project.id}/tasks",
        headers=mutation_headers(),
        json={
            "title": "  Prepare release  ",
            "description": "Release checklist",
            "status": "in_progress",
            "priority": "high",
            "due_date": "2026-11-15",
        },
    )

    assert created.status_code == 201
    assert set(created.json()) == {
        "id",
        "project_id",
        "title",
        "description",
        "status",
        "priority",
        "due_date",
        "created_at",
        "updated_at",
    }
    assert created.json()["project_id"] == str(project.id)
    assert created.json()["title"] == "Prepare release"
    assert created.json()["status"] == TaskStatus.IN_PROGRESS.value
    assert created.json()["priority"] == TaskPriority.HIGH.value
    assert created.json()["due_date"] == "2026-11-15"
    task_id = created.json()["id"]

    listed = client.get(f"/api/v1/projects/{project.id}/tasks")
    assert listed.status_code == 200
    assert [task["id"] for task in listed.json()] == [task_id]

    fetched = client.get(f"/api/v1/tasks/{task_id}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == task_id

    updated = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=mutation_headers(),
        json={
            "title": "Release ready",
            "description": None,
            "status": "done",
            "priority": "low",
            "due_date": None,
        },
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Release ready"
    assert updated.json()["description"] is None
    assert updated.json()["status"] == TaskStatus.DONE.value
    assert updated.json()["priority"] == TaskPriority.LOW.value
    assert updated.json()["due_date"] is None

    with Session(engine) as db:
        stored_task = db.get(Task, UUID(task_id))
        assert stored_task is not None
        assert stored_task.project_id == project.id

    deleted = client.delete(
        f"/api/v1/tasks/{task_id}",
        headers=mutation_headers(),
    )
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/tasks/{task_id}").status_code == 404

    other_project_tasks = client.get(
        f"/api/v1/projects/{other_project_id}/tasks"
    )
    assert other_project_tasks.status_code == 404


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("GET", f"/api/v1/projects/{uuid4()}/tasks", None),
        ("POST", f"/api/v1/projects/{uuid4()}/tasks", {"title": "No project"}),
        ("GET", f"/api/v1/tasks/{uuid4()}", None),
        ("PATCH", f"/api/v1/tasks/{uuid4()}", {"title": "No task"}),
        ("DELETE", f"/api/v1/tasks/{uuid4()}", None),
    ],
)
def test_task_endpoints_require_authentication(
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
        ("POST", f"/api/v1/projects/{uuid4()}/tasks", {"title": "Blocked"}),
        ("PATCH", f"/api/v1/tasks/{uuid4()}", {"title": "Blocked"}),
        ("DELETE", f"/api/v1/tasks/{uuid4()}", None),
    ],
)
def test_task_mutations_require_csrf(
    client_and_engine: tuple[TestClient, Engine],
    method: str,
    path: str,
    payload: dict[str, str] | None,
) -> None:
    client, engine = client_and_engine
    create_authenticated_user(client, engine)
    response = client.request(
        method,
        path,
        headers={"Origin": FRONTEND_ORIGIN},
        json=payload,
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "CSRF token is missing or invalid."}


def test_foreign_project_tasks_are_hidden_for_item_routes(
    client_and_engine: tuple[TestClient, Engine],
) -> None:
    client, engine = client_and_engine
    create_authenticated_user(client, engine)
    other_owner = User(
        email=f"{uuid4()}@example.com",
        password_hash="test-password-hash",
        display_name="Other Owner",
    )
    with Session(engine) as db:
        db.add(other_owner)
        db.commit()
        db.refresh(other_owner)
        project = Project(owner_id=other_owner.id, name="Private project")
        db.add(project)
        db.commit()
        db.refresh(project)
        task = Task(project_id=project.id, title="Private task")
        db.add(task)
        db.commit()
        db.refresh(task)
        project_id = project.id
        task_id = task.id

    for method, payload in (
        ("GET", None),
        ("PATCH", {"title": "Attempted change"}),
        ("DELETE", None),
    ):
        response = client.request(
            method,
            f"/api/v1/tasks/{task_id}",
            headers=mutation_headers(),
            json=payload,
        )
        assert response.status_code == 404
        assert response.json() == {"detail": "Task not found."}

    with Session(engine) as db:
        stored_task = db.get(Task, task_id)
        assert stored_task is not None
        assert stored_task.project_id == project_id
        assert stored_task.title == "Private task"


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"title": "   "},
        {"title": "x" * 201},
        {"title": "Valid", "status": "blocked"},
        {"title": "Valid", "priority": "urgent"},
        {"title": "Valid", "project_id": str(uuid4())},
        {"title": "Valid", "owner_id": str(uuid4())},
    ],
)
def test_task_creation_rejects_invalid_input(
    client_and_engine: tuple[TestClient, Engine],
    payload: dict[str, str],
) -> None:
    client, engine = client_and_engine
    owner_id = create_authenticated_user(client, engine)
    project = create_project(engine, owner_id)

    response = client.post(
        f"/api/v1/projects/{project.id}/tasks",
        headers=mutation_headers(),
        json=payload,
    )

    assert response.status_code == 422
    with Session(engine) as db:
        assert db.scalar(select(Task)) is None


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"title": None},
        {"title": "   "},
        {"status": None},
        {"priority": None},
        {"project_id": str(uuid4())},
        {"unexpected": True},
    ],
)
def test_task_update_rejects_empty_or_invalid_changes(
    client_and_engine: tuple[TestClient, Engine],
    payload: dict[str, object],
) -> None:
    client, engine = client_and_engine
    owner_id = create_authenticated_user(client, engine)
    project = create_project(engine, owner_id)
    task = create_task(engine, project.id)

    response = client.patch(
        f"/api/v1/tasks/{task.id}",
        headers=mutation_headers(),
        json=payload,
    )

    assert response.status_code == 422
    with Session(engine) as db:
        stored_task = db.get(Task, task.id)
        assert stored_task is not None
        assert stored_task.title == "Test task"
        assert stored_task.status == TaskStatus.TODO


@pytest.mark.parametrize("method", ["GET", "PATCH", "DELETE"])
def test_missing_task_returns_generic_not_found(
    client_and_engine: tuple[TestClient, Engine],
    method: str,
) -> None:
    client, engine = client_and_engine
    create_authenticated_user(client, engine)
    response = client.request(
        method,
        f"/api/v1/tasks/{uuid4()}",
        headers=mutation_headers(),
        json={"title": "Not found"} if method == "PATCH" else None,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Task not found."}


def test_nested_task_routes_return_not_found_for_unowned_project(
    client_and_engine: tuple[TestClient, Engine],
) -> None:
    client, engine = client_and_engine
    create_authenticated_user(client, engine)
    other_owner = User(
        email=f"{uuid4()}@example.com",
        password_hash="test-password-hash",
        display_name="Other Owner",
    )
    with Session(engine) as db:
        db.add(other_owner)
        db.commit()
        db.refresh(other_owner)
        project = Project(owner_id=other_owner.id, name="Private project")
        db.add(project)
        db.commit()
        project_id = project.id

    for method, payload in (
        ("GET", None),
        ("POST", {"title": "Attempted task"}),
    ):
        response = client.request(
            method,
            f"/api/v1/projects/{project_id}/tasks",
            headers=mutation_headers(),
            json=payload,
        )
        assert response.status_code == 404
        assert response.json() == {"detail": "Project not found."}

    with Session(engine) as db:
        assert db.scalar(select(Task)) is None


def test_task_database_failure_returns_generic_503_and_rolls_back(
    client_and_engine: tuple[TestClient, Engine],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, engine = client_and_engine
    owner_id = create_authenticated_user(client, engine)
    project = create_project(engine, owner_id)
    original_rollback = Session.rollback
    rollback_called = False
    internal_error = "database server private.internal is unavailable"

    def fail_commit(_session: Session) -> None:
        raise SQLAlchemyError(internal_error)

    def track_rollback(session: Session) -> None:
        nonlocal rollback_called
        rollback_called = True
        original_rollback(session)

    monkeypatch.setattr(Session, "commit", fail_commit)
    monkeypatch.setattr(Session, "rollback", track_rollback)

    response = client.post(
        f"/api/v1/projects/{project.id}/tasks",
        headers=mutation_headers(),
        json={"title": "Must not persist"},
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Task service unavailable."}
    assert internal_error not in response.text
    assert rollback_called
    with Session(engine) as db:
        assert db.scalar(select(Task)) is None
