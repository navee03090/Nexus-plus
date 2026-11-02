# NEXUS PULSE — System Architecture

**Tagline**: *"Never Miss the Opportunity That Matters."*

NEXUS PULSE is an AI-powered Opportunity Intelligence Platform designed for continuous discovery, multimodal verification, deduplication, personalization, and multi-channel notification of academic, research, hackathon, and career opportunities across Pakistan.

---

## 1. High-Level Architecture Diagram

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

## 2. Core Invariants & Product Principles

1. **Original Sources are the Source of Truth**: Announcements are never invented. Original URLs, evidence screenshots, and flyer links are preserved immutably.
2. **AI is an Extraction Layer, Not Truth**: LLMs extract and structure dates, venues, links, and requirements. LLM outputs never override primary evidence.
3. **Zero Hallucination Standard**: If a registration deadline is absent from the text or flyer, it remains `null`. Fabricated links or invented deadlines are strictly rejected by the deterministic validator.
4. **Separation of Layers**:
   - `source_items` & `source_media`: Unmodified raw evidence.
   - `extractions`: AI-structured output schemas.
   - `opportunities`: Normalized, canonical events.
   - `opportunity_sources`: Provenance mappings linking canonical events back to every raw source.
   - `opportunity_changes`: Audit records of deadline extensions or venue changes.
5. **Multi-Source Event Resolution**: When the same hackathon is posted on a university website, Facebook, and Twitter, the system resolves them into a single canonical opportunity rather than 3 duplicate cards.
6. **Change Detection**: When a deadline is extended or postponed, the existing record is updated and marked with a `deadline_extension` audit event, notifying bookmarked users.

---

## 3. Technology Stack

- **Backend**: Python 3.12+ / FastAPI, Pydantic v2, SQLAlchemy 2.0 (Async), asyncpg, Celery, Redis, httpx, BeautifulSoup4, OpenCV, pytesseract.
- **AI & Extraction**: Google GenAI SDK (`gemini-2.5-flash`), OpenCV QR detector, Otsu thresholding image preprocessor.
- **Database & Auth**: Supabase PostgreSQL with `pgvector`, Row Level Security (RLS), Supabase Storage.
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide icons.
- **Infrastructure**: Docker & Docker Compose.
