# Library Management System

FastAPI + Next.js library management system with PostgreSQL.

## Stack
- **Backend**: Python 3.11, FastAPI, PostgreSQL, SQLAlchemy (async)
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Infrastructure**: Docker Compose

## Quick Start (Docker)

```bash
# Copy env file
cp .env.example .env

# Start all services
docker compose up --build

```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs

## Seed Data

To populate the database with sample books and members:

```bash
docker compose exec backend python seed.py
```

> Requires the backend service to already be running (`docker compose up -d`).

## Local Development (without Docker)

### Backend

```bash
cd backend

# Create virtualenv
python -m venv .venv
source .venv/bin/activate 

# Install deps
pip install -r requirements.txt

# Copy env and configure DB
cp .env.example .env
# Edit .env with your PostgreSQL URL

# Run
uvicorn app.main:app --reload

### Frontend

```bash
cd frontend
npm install

# Copy env
cp .env.local.example .env.local

# Run
npm run dev
```

### PostgreSQL (local)

```bash
# Using Docker just for DB
docker run -d \
  --name library-db \
  -e POSTGRES_DB=library_db \
  -e POSTGRES_USER=library_user \
  -e POSTGRES_PASSWORD=library_pass \
  -p 5432:5432 \
  postgres:15-alpine
```
