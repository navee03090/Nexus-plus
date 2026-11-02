# NEXUS PULSE — Deployment & Production Operations

## 1. Local Development via Docker Compose

Run the complete platform locally using Docker Compose:

```bash
# 1. Clone repository and navigate to root
cd "Nexus Plus"

# 2. Configure environment
cp .env.example .env
# Fill in your GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.

# 3. Launch all containers (Redis, Backend, Celery Worker, Celery Beat, Web)
docker compose up -d --build
```

### Services Launched:
- `nexus-pulse-db-redis`: Redis 7 on port `6379` (Celery broker and cache).
- `nexus-pulse-backend`: FastAPI REST API on port `8000` (`http://localhost:8000`).
- `nexus-pulse-celery-worker`: Distributed worker running ingestion, extraction, and notification tasks.
- `nexus-pulse-celery-beat`: Scheduler running recurring crawls according to source frequencies.
- `nexus-pulse-web`: Next.js 14 App Router on port `3000` (`http://localhost:3000`).

---

## 2. Running Services Manually

### Backend Service:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Run migrations
alembic upgrade head  # Or apply supabase/migrations/*.sql

# Start FastAPI development server
uvicorn app.api.v1.main:app --host 0.0.0.0 --port 8000 --reload
```

### Celery Workers:
```bash
# Celery Worker
celery -A app.tasks.celery_app.celery_app worker --loglevel=info -Q default,ingestion,extraction,notifications

# Celery Beat Scheduler
celery -A app.tasks.celery_app.celery_app beat --loglevel=info
```

### Frontend Web:
```bash
cd web
npm install
npm run build
npm start  # Runs production server on port 3000
```

---

## 3. Database Migrations & Supabase Configuration

SQL migrations are located in `supabase/migrations/`:
1. `20261004000001_initial_schema.sql`: 25 normalized tables.
2. `20261004000002_rls_and_indexes.sql`: RLS policies, GIN indexes, pgvector HNSW index, storage buckets.
3. `20261004000003_seed_data.sql`: Seed data for Pakistani universities and tech incubators.

Execute against your remote or local Supabase instance:
```bash
supabase db push
# or run SQL migrations directly via the Supabase Dashboard SQL Editor
```

---

## 4. Running the Automated Test Suite

```bash
cd backend
pytest -v
```

The test suite runs 15 automated acceptance tests covering:
- Ingestion adapters (Website, RSS, API, PDF)
- Deterministic temporal & URL validators
- 4-stage deduplication engine (Exact hash, Fuzzy, Semantic vector)
- End-to-End Pipeline test: Creation -> Cross-source duplicate resolution -> Deadline extension detection -> Notification dispatch
- FastAPI REST endpoints
