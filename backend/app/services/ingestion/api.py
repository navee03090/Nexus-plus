"""
JSON API Ingestion Adapter.
Consumes verified public JSON endpoints (e.g. university open data or government portal APIs).
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import httpx
import dateutil.parser

from app.services.ingestion.base import BaseSourceAdapter, RawEvidenceItem, RawEvidenceMedia
from app.core.security import validate_target_url, sanitize_text
from app.core.config import settings
from app.core.logging import logger


class ApiAdapter(BaseSourceAdapter):
    """Adapter for consuming structured JSON API endpoints."""

    def __init__(self, source_id: str, source_url: str, parser_key: str = "generic_api", api_headers: Optional[Dict[str, str]] = None):
        super().__init__(source_id, source_url, parser_key)
        self.api_headers = api_headers or {}

    async def _fetch_json(self) -> Any:
        clean_url = validate_target_url(self.source_url)
        headers = {"User-Agent": settings.CRAWLER_USER_AGENT, "Accept": "application/json"}
        headers.update(self.api_headers)
        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.get(clean_url, headers=headers)
            resp.raise_for_status()
            return resp.json(), resp.status_code

    async def test_connection(self) -> Dict[str, Any]:
        try:
            data, status_code = await self._fetch_json()
            items_count = len(data) if isinstance(data, list) else len(data.get("items", data.get("data", [])))
            return {
                "status_code": status_code,
                "is_reachable": True,
                "items_count": items_count,
            }
        except Exception as e:
            return {"status_code": 500, "is_reachable": False, "error": str(e)}

    async def fetch_items(self) -> List[RawEvidenceItem]:
        items: List[RawEvidenceItem] = []
        try:
            data, _ = await self._fetch_json()
            records = data if isinstance(data, list) else data.get("items", data.get("data", [data]))

            for idx, rec in enumerate(records):
                if not isinstance(rec, dict):
                    continue
                title = rec.get("title") or rec.get("name") or rec.get("subject") or f"Event {idx}"
                desc = rec.get("description") or rec.get("summary") or rec.get("details") or ""
                url = rec.get("url") or rec.get("link") or self.source_url

                pub_date = None
                date_str = rec.get("date") or rec.get("published_at") or rec.get("created_at")
                if date_str:
                    try:
                        pub_date = dateutil.parser.parse(str(date_str))
                    except Exception:
                        pass

                media_list = []
                img_url = rec.get("image") or rec.get("poster") or rec.get("flyer_url")
                if img_url:
                    media_list.append(RawEvidenceMedia(media_type="flyer", url=img_url))

                item = RawEvidenceItem(
                    source_id=self.source_id,
                    external_id=str(rec.get("id", f"{self.source_id}-{idx}")),
                    canonical_url=url,
                    title_raw=str(title),
                    body_raw=sanitize_text(str(desc)),
                    published_at=pub_date or datetime.now(timezone.utc),
                    raw_payload=rec,
                    content_type="mixed" if media_list else "text",
                    media_items=media_list
                )
                items.append(item)
        except Exception as e:
            logger.error(f"ApiAdapter failed: {e}")
            raise
        return items
