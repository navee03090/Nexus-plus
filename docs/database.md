# NEXUS PULSE — Database Architecture & Supabase Schema

## 1. Overview

NEXUS PULSE uses a normalized Supabase PostgreSQL database design consisting of 25 relational tables, `pgvector` HNSW indexes, Row Level Security (RLS) policies, and Supabase Storage buckets.

---

## 2. Table Catalog

| Table | Purpose |
|---|---|
| `profiles` | User academic background, degree level, semester, and location |
| `organizations` | Official institutions (e.g. UET Peshawar, KPITB, HEC, NIC Peshawar) |
| `sources` | Registered ingestion channels with platform type, URL, and crawl frequency |
| `source_items` | Immutable raw evidence announcements with SHA-256 hash |
| `source_media` | Flyers, posters, and PDF enclosures with checksum and MIME type |
| `extractions` | Structured AI extractions with confidence scores and contradiction flags |
| `categories` | Opportunity taxonomy (Hackathons, Scholarships, Cohorts, etc.) |
| `tags` | Skill, domain, and eligibility tags |
| `opportunities` | Canonical opportunity entities with verified metadata |
| `opportunity_sources` | Provenance join table linking canonical events to every source |
| `opportunity_tags` | Tag associations for canonical events |
| `opportunity_embeddings` | 768-dimensional vector embeddings (`vector(768)`) with HNSW index |
| `opportunity_changes` | Audit log of detected changes (e.g. deadline extensions) |
| `eligibility_rules` | Machine-readable rule assertions for academic qualifications |
| `user_interests` | User-selected topic preferences for personalization |
| `user_preferences` | User delivery preferences and location scope |
| `saved_opportunities` | User bookmarks with alert tracking |
| `notification_preferences` | Per-channel notification settings (Email, Telegram, Push) |
| `notification_deliveries` | Audit log of dispatched alerts with deduplication keys |
| `ingestion_runs` | Scheduled and manual crawler execution logs |
| `ingestion_errors` | Crawl exceptions and HTTP failure logs |
| `verification_queue` | Human-in-the-loop editorial queue for flagged items |
| `audit_logs` | Immutable system audit records |
| `opportunity_reports` | Public provenance dispute and inaccuracy reports |
| `subscriptions` | Optional organization and premium alert subscriptions |

---

## 3. Row Level Security (RLS)

All tables have RLS enabled:
- **Public Read Access**: Active canonical `opportunities`, `categories`, `tags`, and `organizations` are publicly readable.
- **Authenticated Access**: Users can only read and write their own `profiles`, `saved_opportunities`, and `notification_preferences`.
- **Admin & Service Role**: Privileged write access to ingestion pipelines, audit logs, and verification queues is restricted to backend services using the Supabase Service Role key (never exposed to client browsers).

---

## 4. Vector & Full-Text Search Indexes

- **Full-Text Search**: PostgreSQL GIN indexes on `to_tsvector('english', title || ' ' || summary)` for instant keyword filtering.
- **pgvector HNSW Index**:
  ```sql
  CREATE INDEX idx_opp_embeddings_hnsw
  ON opportunity_embeddings
  USING hnsw (embedding vector_cosine_ops);
  ```
  Provides sub-millisecond semantic search and similarity matching across opportunity embeddings.
