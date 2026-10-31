from typing import NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.security.csrf import require_csrf
from app.security.session_auth import (
    AuthenticatedSessionContext,
    get_authenticated_session,
)

router = APIRouter()


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


def _raise_service_unavailable(db: Session) -> NoReturn:
    db.rollback()
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Project service unavailable.",
    ) from None


@router.get("", response_model=list[ProjectResponse])
def list_projects(
    context: AuthenticatedSessionContext = Depends(get_authenticated_session),
    db: Session = Depends(get_db),
) -> list[Project]:
    try:
        return list(
            db.scalars(
                select(Project)
                .where(Project.owner_id == context.user.id)
                .order_by(Project.created_at.desc(), Project.id)
            ).all()
        )
    except SQLAlchemyError:
        _raise_service_unavailable(db)


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf)],
)
def create_project(
    payload: ProjectCreate,
    context: AuthenticatedSessionContext = Depends(get_authenticated_session),
    db: Session = Depends(get_db),
) -> Project:
    project = Project(
        owner_id=context.user.id,
        name=payload.name,
        description=payload.description,
    )
    try:
        db.add(project)
        db.commit()
        db.refresh(project)
    except SQLAlchemyError:
        _raise_service_unavailable(db)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: UUID,
    context: AuthenticatedSessionContext = Depends(get_authenticated_session),
    db: Session = Depends(get_db),
) -> Project:
    try:
        return _get_owned_project(db, project_id, context.user.id)
    except SQLAlchemyError:
        _raise_service_unavailable(db)


@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
    dependencies=[Depends(require_csrf)],
)
def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    context: AuthenticatedSessionContext = Depends(get_authenticated_session),
    db: Session = Depends(get_db),
) -> Project:
    try:
        project = _get_owned_project(db, project_id, context.user.id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(project, field, value)
        db.commit()
        db.refresh(project)
    except SQLAlchemyError:
        _raise_service_unavailable(db)
    return project


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_csrf)],
)
def delete_project(
    project_id: UUID,
    context: AuthenticatedSessionContext = Depends(get_authenticated_session),
    db: Session = Depends(get_db),
) -> Response:
    try:
        project = _get_owned_project(db, project_id, context.user.id)
        db.delete(project)
        db.commit()
    except SQLAlchemyError:
        _raise_service_unavailable(db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
