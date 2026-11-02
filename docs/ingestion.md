# NEXUS PULSE — Ingestion Layer & Pluggable Adapters

## 1. Overview

The Ingestion Layer is responsible for discovering, fetching, normalizing, and storing raw evidence from fragmented sources across Pakistan and international registries without fabricating or altering original source information.

---

## 2. Pluggable Adapter Architecture

All adapters inherit from `BaseSourceAdapter` defined in `backend/app/services/ingestion/base.py`:

```python
class BaseSourceAdapter(ABC):
    @abstractmethod
    async def fetch_items(self, source: Source) -> List[RawEvidenceItem]:
        pass

    @abstractmethod
    async def validate_source(self, url: str) -> bool:
        pass
```

### Supported Adapter Types:

1. **Website Adapter (`WebsiteAdapter`)**:
   - Fetches HTML using `httpx.AsyncClient` with user-agent attribution.
   - Cleans HTML, extracts title, announcement body, published date, flyer/poster image links, and downloadable attachments.
   - Respects `robots.txt` and domain-level crawl delays.

2. **RSS / Atom Feed Adapter (`RSSAdapter`)**:
   - Parses standard feeds from universities, news bulletins, and research agencies.
   - Extracts title, entry link, published timestamp, description, and enclosure media.

3. **Sitemap Adapter (`SitemapAdapter`)**:
   - Inspects XML sitemaps to discover newly added announcement endpoints and changes.

4. **REST API Adapter (`APIAdapter`)**:
   - Connects to structured public APIs (e.g. government open data portals, student affairs APIs).

5. **PDF Document Adapter (`PDFAdapter`)**:
   - Ingests official PDF notifications, circulars, and gazettes.
   - Extracts text and renders PDF pages for OCR analysis.

6. **Social Media Adapter (`SocialMediaAdapter`)**:
   - Pluggable adapter supporting approved platform Graph APIs, webhooks, and manual feeds.
   - Never hardcodes a fragile single-platform scraper.

7. **Manual Import Adapter (`ManualAdapter`)**:
   - Allows administrators to upload verified physical event posters, university bulletin scans, or student organization circulars.

---

## 3. Crawler Politeness & Rate Limiting

The ingestion engine uses a token-bucket rate limiter (`backend/app/algorithms/rate_limiter.py`):
- Enforces polite crawl delays (default: 5.0 seconds between consecutive requests to the same domain).
- Implements exponential backoff upon encountering HTTP 429 (Too Many Requests) or server errors:
  - Attempt 1: 10 seconds
  - Attempt 2: 30 seconds
  - Attempt 3: 2 minutes
  - Attempt 4: 10 minutes

---

## 4. Evidence Immutability

When an announcement is discovered, a record is created in `source_items`:
- `source_id`: Reference to the registered source.
- `title_raw`: Exact original title as published.
- `body_raw`: Raw textual body.
- `raw_payload`: Complete JSON or HTML payload.
- `canonical_url`: The primary public URL of the announcement.
- `content_hash`: SHA-256 hash of the content to prevent redundant processing.

Flyers and image attachments are stored in `source_media` and uploaded to the Supabase Storage bucket `nexus-pulse-media` with cryptographic SHA-256 checksums.
