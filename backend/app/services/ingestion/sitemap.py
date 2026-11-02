"""
Sitemap XML Ingestion Adapter.
Discovers new announcement URLs published in official sitemaps.
"""
from datetime import datetime, timezone
from typing import List, Dict, Any
from xml.etree import ElementTree as ET
import httpx
import dateutil.parser

from app.services.ingestion.base import BaseSourceAdapter, RawEvidenceItem
from app.core.security import validate_target_url
from app.core.config import settings
from app.core.logging import logger


class SitemapAdapter(BaseSourceAdapter):
    """Parses XML sitemaps to discover newly added announcement endpoints."""

    async def _fetch_xml(self) -> str:
        clean_url = validate_target_url(self.source_url)
        headers = {"User-Agent": settings.CRAWLER_USER_AGENT}
        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.get(clean_url, headers=headers)
            resp.raise_for_status()
            return resp.text

    async def test_connection(self) -> Dict[str, Any]:
        try:
            content = await self._fetch_xml()
            root = ET.fromstring(content)
            urls = []
            for child in root:
                loc = child.find("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")
                if loc is not None and loc.text:
                    urls.append(loc.text)
            return {
                "status_code": 200,
                "is_reachable": True,
                "url_count": len(urls),
                "sample_urls": urls[:5]
            }
        except Exception as e:
            return {"status_code": 500, "is_reachable": False, "error": str(e)}

    async def fetch_items(self) -> List[RawEvidenceItem]:
        items: List[RawEvidenceItem] = []
        try:
            content = await self._fetch_xml()
            root = ET.fromstring(content)
            for idx, elem in enumerate(root):
                loc = elem.find("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")
                lastmod = elem.find("{http://www.sitemaps.org/schemas/sitemap/0.9}lastmod")
                if loc is not None and loc.text:
                    pub_date = None
                    if lastmod is not None and lastmod.text:
                        try:
                            pub_date = dateutil.parser.parse(lastmod.text)
                        except Exception:
                            pass

                    item = RawEvidenceItem(
                        source_id=self.source_id,
                        external_id=f"sitemap-{idx}",
                        canonical_url=loc.text,
                        title_raw=f"Announcement from {loc.text.split('/')[-1]}",
                        body_raw=loc.text,
                        published_at=pub_date or datetime.now(timezone.utc),
                        content_type="html"
                    )
                    items.append(item)
        except Exception as e:
            logger.error(f"SitemapAdapter failed: {e}")
            raise
        return items
