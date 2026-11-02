# NEXUS PULSE

<div align="center">

### *"Never Miss the Opportunity That Matters."*

**AI-Powered Opportunity Intelligence Platform for Pakistan**

[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%2B_pgvector-3ECF8E?logo=supabase)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?logo=google)](https://deepmind.google/technologies/gemini/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-15_Passed-success)](#acceptance-test-suite)

</div>

---

## 🌟 Executive Summary

Government organizations, universities, research institutions, technology boards, and academic communities across Pakistan publish high-value opportunities—such as hackathons, international scholarships, seed grants, and incubation programs—across fragmented and disconnected channels:
- University websites (e.g. UET Peshawar, GIKI, FAST-NUCES, IMSciences)
- Government portals (e.g. KPITB, HEC Pakistan, MoITT)
- Tech incubators (e.g. NIC Peshawar, NIC Islamabad)
- Physical flyers, bulletin boards, and social announcements

**NEXUS PULSE** continuously discovers these announcements, extracts structured metadata using multimodal AI and OCR, validates every field deterministically, merges duplicates across multiple sources into a single canonical record, tracks changes (such as deadline extensions), personalizes recommendations, and delivers instant notifications over Telegram, Email, and Push.

---

## 🏛️ Core Principles & Invariants

1. **Original Sources are the Source of Truth**: Announcements are never invented. Original URLs, evidence screenshots, and flyer links are preserved immutably.
2. **AI is an Extraction Layer, Not Truth**: LLMs extract and structure dates, venues, links, and requirements. LLM outputs never override primary evidence.
3. **Zero Hallucination Standard**: If a registration deadline is absent from the text or flyer, it remains `null`. Fabricated links or invented deadlines are strictly rejected.
4. **Strict Separation of Layers**:
   - `source_items` & `source_media`: Unmodified raw evidence.
   - `extractions`: AI-structured output schemas.
   - `opportunities`: Normalized, canonical events.
   - `opportunity_sources`: Provenance mappings linking canonical events back to every raw source.
   - `opportunity_changes`: Audit records of deadline extensions or venue changes.
5. **Multi-Source Deduplication**: Resolves multiple announcements of the same event into one canonical record with complete provenance citations.
6. **Change Detection**: Automatically audits announcements for deadline extensions, venue modifications, or cancellations and triggers alert updates.

---

## 🔬 High-Level Architecture & Pipeline

```
                         NEXUS PULSE
                              |
                       SOURCE REGISTRY
                              |
          +-------------------+-------------------+
          |                   |                   |
       Websites            Social APIs        Feeds/APIs
          |                   |                   |
          +-------------------+-------------------+
                              |
                       INGESTION LAYER
                              |
                        RAW EVIDENCE
                              |
                        NORMALIZATION
                              |
                       EARLY FILTERING
                              |
                +-------------+-------------+
                |                           |
              TEXT                        IMAGE
                |                           |
                |                    OCR / Vision
                |                           |
                +-------------+-------------+
                              |
                    GEMINI MULTIMODAL AI
                              |
                    STRUCTURED EXTRACTION
                              |
                    PYDANTIC VALIDATION
                              |
                    RULE-BASED VALIDATION
                              |
                      SOURCE TRUST
                              |
                       DEDUPLICATION
                              |
                      EVENT RESOLUTION
                              |
                 +------------+------------+
                 |                         |
             AUTO PUBLISH             HUMAN REVIEW
                 |                         |
                 +------------+------------+
                              |
                     CANONICAL EVENTS
                              |
                    PERSONALIZATION ENGINE
                              |
                     ELIGIBILITY ENGINE
                              |
                    NOTIFICATION ENGINE
                              |
           +----------+---------+----------+----------+
           |          |         |          |          |
          WEB       MOBILE    EMAIL     TELEGRAM   PUSH
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend API** | Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.0 (Async), asyncpg |
| **Asynchronous Engine** | Celery, Redis 7, Flower (monitoring) |
| **Multimodal AI & OCR** | Google GenAI SDK (`gemini-2.5-flash`), OpenCV, Otsu Preprocessor, Tesseract OCR |
| **Database & Auth** | Supabase PostgreSQL, `pgvector` (HNSW indexing), Row Level Security (RLS) |
| **Storage** | Supabase Storage (`nexus-pulse-media`, `nexus-pulse-flyers`) |
| **Testing & Quality** | pytest (15 test suites), pytest-asyncio, Ruff, mypy |

---

## 📁 Repository Structure

```
Nexus Plus/
├── backend/
│   ├── app/
│   │   ├── algorithms/       # Rate limiting, similarity, scoring, 4-stage deduplication
│   │   ├── api/v1/           # REST endpoints (events, search, admin, sources, users, ingestion)
│   │   ├── core/             # Settings, database, SSRF protection, logging
│   │   ├── models/           # SQLAlchemy 2.0 models (25 entities)
│   │   ├── schemas/          # Pydantic v2 schemas and validation contracts
│   │   ├── services/         # Adapters, multimodal AI, resolution, personalization, notifications
│   │   └── tasks/            # Celery async tasks
│   ├── tests/                # Automated pytest suite (Adapters, Validation, Dedup, Acceptance)
│   ├── Dockerfile
│   └── requirements.txt
├── web/
│   ├── src/
│   │   ├── app/              # Next.js 14 App Router (/, /opportunities, /for-you, /admin, etc.)
│   │   ├── components/       # OpportunityCard, Badges, Modals, Navbar, Footer, AdminSidebar
│   │   ├── lib/              # API client, Supabase client, utilities
│   │   └── types/            # TypeScript definitions matching database schema
│   ├── package.json
│   └── Dockerfile
├── supabase/
│   └── migrations/           # 25 tables, RLS policies, vector indexing, seed data
├── docs/                     # Architecture, ingestion, AI extraction, database, security, deployment
├── docker-compose.yml        # Orchestration for Redis, Backend, Workers, Beat, Web
└── .env.example              # Comprehensive environment configuration template
```

---

## 🚀 Quickstart

### Option 1: Docker Compose (All Services)

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Launch full cluster
docker compose up -d --build
```

- Web Portal: `http://localhost:3000`
- FastAPI REST Docs: `http://localhost:8000/docs`

### Option 2: Local Development

```bash
# Backend Setup
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.api.v1.main:app --reload --port 8000

# Frontend Setup
cd ../web
npm install
npm run dev  # Starts dev server on http://localhost:3000
```

---

## 🧪 Acceptance Test Suite

The test suite validates the complete Section 115 end-to-end acceptance flow:
1. Ingests announcement from primary source (e.g. UET Peshawar) -> Creates canonical event with provenance.
2. Ingests announcement from secondary source (e.g. KPITB) -> Matches and resolves as duplicate, updating provenance citations without creating a new card.
3. Ingests deadline extension notice -> Detects update, modifies registration deadline, and logs an `opportunity_changes` audit event.
4. Triggers multi-channel notification engine with deduplication.

Run tests:
```bash
cd backend
pytest -v
```

Output:
```
============================= 15 passed in 2.80s =============================
```

---

## 🔒 Security & Privacy

- **SSRF Defense**: Strict validation of target crawl URLs blocking private IP ranges (RFC 1918) and cloud metadata services.
- **Service-Role Isolation**: Supabase service-role keys are never sent to the browser or frontend bundle.
- **Strict Provenance**: Public API exposes verifiable original source URLs and audit records for complete transparency.

---

## 📄 Documentation

- [Architecture Guide](docs/architecture.md)
- [Ingestion & Source Adapters](docs/ingestion.md)
- [Multimodal AI & Zero Hallucination](docs/ai-extraction.md)
- [Database Schema & Vectors](docs/database.md)
- [Security Architecture](docs/security.md)
- [Production Deployment](docs/deployment.md)

---

<div align="center">
Built for Pakistan 🇵🇰 • Expanding Worldwide
</div>
