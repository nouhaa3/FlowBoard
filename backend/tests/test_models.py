from datetime import UTC
import importlib.util
from pathlib import Path
from types import SimpleNamespace

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    MetaData,
    String,
    Table,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable
from sqlalchemy import inspect

from app.db.base import Base
from app.models import Project, Task, TaskPriority, TaskStatus, User


def test_initial_migration_status_length_matches_task_model() -> None:
    migration_path = (
        Path(__file__).parents[1]
        / "alembic"
        / "versions"
        / "20261029_0001_initial_models.py"
    )
    spec = importlib.util.spec_from_file_location(
        "initial_models_migration",
        migration_path,
    )
    assert spec is not None
    assert spec.loader is not None
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)

    migration_tables: dict[str, Table] = {}
    migration.op = SimpleNamespace(
        create_table=lambda name, *elements, **kwargs: migration_tables.setdefault(
            name,
            Table(name, MetaData(), *elements, **kwargs),
        ),
        create_index=lambda *args, **kwargs: None,
    )
    migration.upgrade()

    model_status_length = Task.__table__.c.status.type.length
    migration_status_length = migration_tables["tasks"].c.status.type.length

    assert migration_status_length == model_status_length
    assert migration_status_length >= len(TaskStatus.IN_PROGRESS.value)


def test_all_models_are_registered_with_base_metadata() -> None:
    assert set(Base.metadata.tables) == {
        "users",
        "projects",
        "tasks",
        "user_sessions",
    }


def test_user_columns_and_email_constraints() -> None:
    table = User.__table__

    assert isinstance(table.c.id.type, Uuid)
    assert table.c.id.type.compile(dialect=postgresql.dialect()) == "UUID"
    assert table.c.email.type.length == 320
    assert table.c.password_hash.type.length == 255
    assert table.c.display_name.type.length == 80
    assert isinstance(table.c.created_at.type, DateTime)
    assert table.c.created_at.type.timezone is True
    assert any(
        isinstance(constraint, UniqueConstraint)
        and [column.name for column in constraint.columns] == ["email"]
        for constraint in table.constraints
    )
    assert any(
        isinstance(constraint, CheckConstraint)
        and "lower(email)" in str(constraint.sqltext)
        for constraint in table.constraints
    )


def test_project_and_task_foreign_keys_cascade_on_delete() -> None:
    project_owner_fk = next(iter(Project.__table__.c.owner_id.foreign_keys))
    task_project_fk = next(iter(Task.__table__.c.project_id.foreign_keys))

    assert project_owner_fk.target_fullname == "users.id"
    assert project_owner_fk.ondelete == "CASCADE"
    assert task_project_fk.target_fullname == "projects.id"
    assert task_project_fk.ondelete == "CASCADE"
    assert "owner_id" not in Task.__table__.columns


def test_task_status_and_priority_values_are_database_constrained() -> None:
    table = Task.__table__
    compiled = str(CreateTable(table).compile(dialect=postgresql.dialect()))

    assert TaskStatus.TODO.value == "todo"
    assert TaskStatus.IN_PROGRESS.value == "in_progress"
    assert TaskStatus.DONE.value == "done"
    assert TaskPriority.LOW.value == "low"
    assert TaskPriority.MEDIUM.value == "medium"
    assert TaskPriority.HIGH.value == "high"
    assert "status IN ('todo', 'in_progress', 'done')" in compiled
    assert "priority IN ('low', 'medium', 'high')" in compiled
    assert isinstance(table.c.status.type, String)
    assert isinstance(table.c.priority.type, String)
    assert isinstance(table.c.due_date.type, Date)
    assert table.c.due_date.nullable


def test_timestamps_are_aware_and_model_defaults_are_available() -> None:
    for model in (User, Project, Task):
        created_at = model.__table__.c.created_at.default.arg(None)
        updated_at = model.__table__.c.updated_at.default.arg(None)
        assert created_at.tzinfo is UTC
        assert updated_at.tzinfo is UTC

    assert Task.__table__.c.status.default.arg is TaskStatus.TODO
    assert Task.__table__.c.priority.default.arg is TaskPriority.MEDIUM


def test_relationships_are_bidirectional() -> None:
    assert inspect(User).relationships["projects"].back_populates == "owner"
    assert inspect(Project).relationships["owner"].back_populates == "projects"
    assert inspect(Project).relationships["tasks"].back_populates == "project"
    assert inspect(Task).relationships["project"].back_populates == "tasks"
