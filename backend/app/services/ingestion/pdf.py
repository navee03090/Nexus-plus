"""
PDF Announcement Ingestion Adapter (Section 28).
Extracts text, embedded links, and metadata from official PDF notifications.
"""
import io
import re
from datetime import datetime, timezone
from typing import List, Dict, Any
import httpx
from pypdf import PdfReader

from app.services.ingestion.base import BaseSourceAdapter, RawEvidenceItem
from app.core.security import validate_target_url, sanitize_text
from app.core.config import settings
from app.core.logging import logger


class PdfAdapter(BaseSourceAdapter):
    """Adapter for downloading and inspecting PDF circulars and conference brochures."""

    async def _download_pdf(self) -> bytes:
        clean_url = validate_target_url(self.source_url)
        headers = {"User-Agent": settings.CRAWLER_USER_AGENT}
        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.get(clean_url, headers=headers)
            resp.raise_for_status()
            if len(resp.content) > settings.MAX_CONTENT_LENGTH_BYTES:
                raise ValueError("PDF file exceeds maximum allowed file size.")
            return resp.content

    async def test_connection(self) -> Dict[str, Any]:
        try:
            pdf_bytes = await self._download_pdf()
            reader = PdfReader(io.BytesIO(pdf_bytes))
            return {
                "status_code": 200,
                "is_reachable": True,
                "page_count": len(reader.pages),
                "is_encrypted": reader.is_encrypted,
            }
        except Exception as e:
            return {"status_code": 500, "is_reachable": False, "error": str(e)}

    async def fetch_items(self) -> List[RawEvidenceItem]:
        items: List[RawEvidenceItem] = []
        try:
            pdf_bytes = await self._download_pdf()
            reader = PdfReader(io.BytesIO(pdf_bytes))

            full_text = []
            for i, page in enumerate(reader.pages[:10]):  # Inspect up to first 10 pages
                text = page.extract_text() or ""
                full_text.append(text)

            combined = "\n".join(full_text)
            clean_body = sanitize_text(combined)

            # Extract first line as title or filename fallback
            lines = [line_item.strip() for line_item in combined.split("\n") if line_item.strip()]
            title = lines[0][:200] if lines else f"PDF Announcement from {self.source_url.split('/')[-1]}"

            # Extract any URLs mentioned in text
            urls_found = re.findall(r"https?://[^\s<>\"']+", combined)

            item = RawEvidenceItem(
                source_id=self.source_id,
                external_id=self.source_url,
                canonical_url=self.source_url,
                title_raw=title,
                caption_raw=clean_body[:500],
                body_raw=clean_body,
                published_at=datetime.now(timezone.utc),
                raw_payload={"pdf_urls_detected": urls_found[:5], "page_count": len(reader.pages)},
                content_type="pdf",
            )
            items.append(item)
        except Exception as e:
            logger.error(f"PdfAdapter failed: {e}")
            raise

        return items
