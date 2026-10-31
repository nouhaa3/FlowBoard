from typing import NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.project import Project
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from app.security.csrf import require_csrf
from app.security.session_auth import (
    AuthenticatedSessionContext,
    get_authenticated_session,
)

router = APIRouter()


def _task_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Task not found.",
    )


def _project_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Project not found.",
    )


def _get_owned_project(
    db: Session,
    project_id: UUID,
    owner_id: UUID,
) -> Project:
    project = db.scalar(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == owner_id,
        )
    )
    if project is None:
        raise _project_not_found()
    return project


def _get_owned_task(
    db: Session,
    task_id: UUID,
    owner_id: UUID,
) -> Task:
    task = db.scalar(
        select(Task)
        .join(Project, Project.id == Task.project_id)
        .where(
            Task.id == task_id,
            Project.owner_id == owner_id,
        )
    )
    if task is None:
        raise _task_not_found()
    return task


def _raise_service_unavailable(db: Session) -> NoReturn:
    db.rollback()
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Task service unavailable.",
    ) from None


@router.get(
    "/projects/{project_id}/tasks",
    response_model=list[TaskResponse],
)
def list_project_tasks(
    project_id: UUID,
    context: AuthenticatedSessionContext = Depends(get_authenticated_session),
    db: Session = Depends(get_db),
) -> list[Task]:
    try:
        _get_owned_project(db, project_id, context.user.id)
        return list(
            db.scalars(
                select(Task)
                .where(Task.project_id == project_id)
                .order_by(Task.created_at.desc(), Task.id)
            ).all()
        )
    except SQLAlchemyError:
        _raise_service_unavailable(db)


@router.post(
    "/projects/{project_id}/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf)],
)
def create_project_task(
    project_id: UUID,
    payload: TaskCreate,
    context: AuthenticatedSessionContext = Depends(get_authenticated_session),
    db: Session = Depends(get_db),
) -> Task:
    try:
        project = _get_owned_project(db, project_id, context.user.id)
        task = Task(
            project_id=project.id,
            title=payload.title,
            description=payload.description,
            status=payload.status,
            priority=payload.priority,
            due_date=payload.due_date,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
    except SQLAlchemyError:
        _raise_service_unavailable(db)
    return task


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: UUID,
    context: AuthenticatedSessionContext = Depends(get_authenticated_session),
    db: Session = Depends(get_db),
) -> Task:
    try:
        return _get_owned_task(db, task_id, context.user.id)
    except SQLAlchemyError:
        _raise_service_unavailable(db)


@router.patch(
    "/tasks/{task_id}",
    response_model=TaskResponse,
    dependencies=[Depends(require_csrf)],
)
def update_task(
    task_id: UUID,
    payload: TaskUpdate,
    context: AuthenticatedSessionContext = Depends(get_authenticated_session),
    db: Session = Depends(get_db),
) -> Task:
    try:
        task = _get_owned_task(db, task_id, context.user.id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(task, field, value)
        db.commit()
        db.refresh(task)
    except SQLAlchemyError:
        _raise_service_unavailable(db)
    return task


@router.delete(
    "/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_csrf)],
)
def delete_task(
    task_id: UUID,
    context: AuthenticatedSessionContext = Depends(get_authenticated_session),
    db: Session = Depends(get_db),
) -> Response:
    try:
        task = _get_owned_task(db, task_id, context.user.id)
        db.delete(task)
        db.commit()
    except SQLAlchemyError:
        _raise_service_unavailable(db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
