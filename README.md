# FlowBoard

FlowBoard is a project and task management application. This repository contains
a React + TypeScript + Tailwind CSS frontend and a Python + FastAPI backend.

## Prerequisites

- Node.js 20.19+ or 22.12+
- Python 3.10+

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

In a separate terminal, run:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`. Check its health endpoint at
`http://127.0.0.1:8000/health` with:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

The endpoint returns `{"status":"ok"}`. FastAPI's interactive API documentation
is at `http://127.0.0.1:8000/docs`.
