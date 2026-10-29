# FlowBoard

FlowBoard is a project and task management application. This repository contains
a React + TypeScript + Tailwind CSS frontend and a Python + FastAPI backend.

## Prerequisites

- Node.js 20.19+ or 22.12+
- Python 3.10+
- Docker Desktop with Docker Compose

## Frontend

In a terminal, run:

```powershell
cd frontend
npm install
npm run dev
```

Vite prints the local URL after the development server starts. To verify the
frontend build, run `npm run build` from the `frontend` directory.

## Backend

### Run the API and PostgreSQL with Docker Compose

From the repository root, copy the example environment file and replace the
password placeholder with a local-only password using URL-safe characters
(letters, numbers, and hyphens), since it is also included in `DATABASE_URL`:

```powershell
Copy-Item .\backend\.env.example .\backend\.env
```

The authentication configuration in this file defaults to development mode:
secure cookies are disabled for localhost HTTP, and the Vite localhost origins
are explicitly allowed. Production must set `APP_ENVIRONMENT=production`,
`SESSION_COOKIE_SECURE=true`, and HTTPS-only `ALLOWED_FRONTEND_ORIGINS`.
Before adding cookie-authenticated state-changing routes, implement CSRF token
validation and exact `Origin` allow-list checks; `SameSite` alone is not enough.

Start PostgreSQL and the API:

```powershell
docker compose --env-file .\backend\.env up --build -d
```

Compose waits for PostgreSQL's `pg_isready` health check before starting the API.
The database data is stored in the named `postgres_data` volume and survives
container stops and recreation.

Check liveness and database readiness:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/health/ready
```

`/health` is a process liveness check and does not access the database.
`/health/ready` returns success only after a database query succeeds; it
returns HTTP 503 when the database is unavailable.

Run migrations explicitly when migration revisions exist:

```powershell
docker compose --env-file .\backend\.env run --rm api alembic upgrade head
```

Migrations are not run automatically when the API starts. This initial setup
does not yet define domain models or migration revisions.

Stop the containers without deleting the database volume:

```powershell
docker compose --env-file .\backend\.env down
```

Do not use the `-v` option if you want to keep the PostgreSQL data.

### Run the backend tests

Run tests from the backend directory:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest
```

Database integration tests are skipped unless `TEST_DATABASE_URL` is explicitly
set to a dedicated PostgreSQL database whose name ends in `_test` and differs
from `DATABASE_URL`. They never fall back to the application database URL.

### Run the API directly on the host (optional)

For local development without running the API container, use the backend
directory and set `DATABASE_URL` in `backend\.env` to the host address
(`localhost`, not the Compose service hostname `db`):

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

The FastAPI interactive API documentation is at
`http://127.0.0.1:8000/docs`.
