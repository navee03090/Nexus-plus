"""
Manual Ingestion Adapter for user-submitted announcements and administrator submissions (Section 82).
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from app.services.ingestion.base import BaseSourceAdapter, RawEvidenceItem, RawEvidenceMedia
from app.core.security import sanitize_text


class ManualSubmissionAdapter(BaseSourceAdapter):
    """Adapter for processing user and administrator direct form submissions."""

    def __init__(self, source_id: str, payload: Optional[Dict[str, Any]] = None):
        super().__init__(source_id, source_url=payload.get("url", "") if payload else "", parser_key="manual")
        self.payload = payload or {}

    async def test_connection(self) -> Dict[str, Any]:
        return {"status_code": 200, "is_reachable": True, "parser": "manual"}

    async def fetch_items(self) -> List[RawEvidenceItem]:
        title = self.payload.get("title", "Submitted Announcement")
        description = self.payload.get("description", "")
        url = self.payload.get("url", "")
        flyer_url = self.payload.get("flyer_url")

        media_list = []
        if flyer_url:
            media_list.append(RawEvidenceMedia(media_type="flyer", url=flyer_url))

        item = RawEvidenceItem(
            source_id=self.source_id,
            external_id=f"manual-{datetime.now(timezone.utc).timestamp()}",
            canonical_url=url,
            title_raw=title,
            caption_raw=sanitize_text(description)[:500],
            body_raw=sanitize_text(description),
            published_at=datetime.now(timezone.utc),
            raw_payload=self.payload,
            content_type="mixed" if media_list else "text",
            media_items=media_list
        )
        return [item]
