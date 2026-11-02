# NEXUS PULSE — Security & Privacy Architecture

## 1. Overview

Security is built into every layer of NEXUS PULSE, from network ingestion to AI validation and database authorization.

---

## 2. Server-Side Request Forgery (SSRF) Protection

When users or administrators register new source URLs or trigger custom crawls, requests are screened by `backend/app/core/security.py`:
- **Private IP Blocking**: Resolves destination hostnames and blocks internal ranges:
  - Loopback (`127.0.0.0/8`, `::1`)
  - RFC 1918 Private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
  - Link-local and Carrier-Grade NAT (`169.254.0.0/16`, `100.64.0.0/10`)
  - Cloud Metadata services (`169.254.169.254`)
- **Protocol Restrictions**: Only `http` and `https` schemes are permitted; dangerous schemes (`file://`, `gopher://`, `ftp://`) are rejected immediately.

---

## 3. Secret Management & Key Isolation

- **Supabase Service Role Key**: Strictly confined to backend workers and API servers. Never exported to Next.js public environment variables or sent in client responses.
- **Client Anon Key**: Client web browsers only receive the public publishable anon key, constrained by PostgreSQL Row Level Security.
- **Gemini API Keys & Webhook Tokens**: Stored exclusively in server-side `.env` configuration.

---

## 4. Input Sanitization & HTML Cleaning

- Raw HTML ingested from web adapters is sanitized via `clean_html()` using `bleach` and `BeautifulSoup4`.
- All script tags, inline event handlers, and dangerous iframe elements are stripped prior to storage and OCR preprocessing.
- SQL injections are precluded via SQLAlchemy 2.0 parameterized queries and PostgreSQL type casting.

---

## 5. Audit Logging & Non-Repudiation

- Modifications to canonical events, deadline extensions, and verification approvals generate immutable records in `audit_logs` and `opportunity_changes`.
- Provenance links record the exact date, source URL, and content hash, ensuring verifiable history for students and academic institutions.
