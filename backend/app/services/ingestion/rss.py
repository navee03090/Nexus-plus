"""
RSS / Atom Feed Ingestion Adapter.
Parses structured feeds for universities, research bodies, and tech communities.
"""
from datetime import datetime, timezone
import time
from typing import List, Dict, Any
import feedparser
import httpx
import dateutil.parser

from app.services.ingestion.base import BaseSourceAdapter, RawEvidenceItem, RawEvidenceMedia
from app.core.security import validate_target_url, sanitize_text
from app.core.config import settings
from app.core.logging import logger


class RSSAdapter(BaseSourceAdapter):
    """Adapter for RSS 2.0 and Atom feeds."""

    async def _fetch_feed_content(self) -> str:
        clean_url = validate_target_url(self.source_url)
        headers = {"User-Agent": settings.CRAWLER_USER_AGENT}
        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.get(clean_url, headers=headers)
            resp.raise_for_status()
            return resp.text

    async def test_connection(self) -> Dict[str, Any]:
        try:
            content = await self._fetch_feed_content()
            parsed = feedparser.parse(content)
            entries = parsed.entries
            titles = [e.get("title", "") for e in entries[:5]]
            return {
                "status_code": 200,
                "is_reachable": True,
                "feed_title": parsed.feed.get("title", ""),
                "items_count": len(entries),
                "sample_titles": titles,
            }
        except Exception as e:
            return {"status_code": 500, "is_reachable": False, "error": str(e)}

    async def fetch_items(self) -> List[RawEvidenceItem]:
        items: List[RawEvidenceItem] = []
        try:
            content = await self._fetch_feed_content()
            parsed = feedparser.parse(content)

            for entry in parsed.entries:
                title = entry.get("title", "")
                link = entry.get("link", self.source_url)
                summary = entry.get("summary", "") or entry.get("description", "")

                # Check for publication timestamp
                pub_date = None
                if entry.get("published_parsed"):
                    pub_date = datetime.fromtimestamp(time.mktime(entry.published_parsed), tz=timezone.utc)
                elif entry.get("published"):
                    try:
                        pub_date = dateutil.parser.parse(entry.published)
                    except Exception:
                        pass

                # Check for attached enclosures / images
                media_list: List[RawEvidenceMedia] = []
                for enc in entry.get("enclosures", []):
                    if enc.get("type", "").startswith("image/") and enc.get("href"):
                        media_list.append(RawEvidenceMedia(media_type="flyer", url=enc["href"], mime_type=enc["type"]))

                item = RawEvidenceItem(
                    source_id=self.source_id,
                    external_id=entry.get("id", link),
                    canonical_url=link,
                    title_raw=title,
                    caption_raw=sanitize_text(summary)[:500],
                    body_raw=sanitize_text(summary),
                    published_at=pub_date or datetime.now(timezone.utc),
                    raw_payload={"entry": {k: str(v)[:200] for k, v in entry.items() if k != "content"}},
                    content_type="mixed" if media_list else "text",
                    media_items=media_list
                )
                items.append(item)

        except Exception as e:
            logger.error(f"RSSAdapter failed for {self.source_url}: {e}")
            raise

        return items
