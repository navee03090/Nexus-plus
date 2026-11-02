"""
Base Source Adapter and Raw Evidence abstractions (Section 11).
Enforces Strategy pattern for all ingestion mechanisms.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
import hashlib
from typing import List, Optional, Dict, Any


@dataclass
class RawEvidenceMedia:
    media_type: str  # flyer, poster, document, photo
    url: str
    mime_type: Optional[str] = None
    bytes_data: Optional[bytes] = None


@dataclass
class RawEvidenceItem:
    """
    Standard normalized container produced by any adapter.
    Preserves provenance and original announcements verbatim.
    """
    source_id: str
    external_id: Optional[str] = None
    canonical_url: Optional[str] = None
    title_raw: Optional[str] = None
    caption_raw: Optional[str] = None
    body_raw: Optional[str] = None
    published_at: Optional[datetime] = None
    discovered_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    raw_payload: Dict[str, Any] = field(default_factory=dict)
    content_type: str = "html"  # text, image, pdf, html, mixed
    language: str = "en"
    media_items: List[RawEvidenceMedia] = field(default_factory=list)

    @property
    def content_hash(self) -> str:
        """Calculates deterministic SHA-256 hash of the evidence content."""
        h = hashlib.sha256()
        h.update((self.canonical_url or "").encode("utf-8"))
        h.update((self.title_raw or "").encode("utf-8"))
        h.update((self.body_raw or "").encode("utf-8")[:5000])
        return h.hexdigest()


class BaseSourceAdapter(ABC):
    """Abstract base class for all pluggable source ingestion adapters."""

    def __init__(self, source_id: str, source_url: str, parser_key: str = "generic"):
        self.source_id = source_id
        self.source_url = source_url
        self.parser_key = parser_key

    @abstractmethod
    async def fetch_items(self) -> List[RawEvidenceItem]:
        """Fetches and normalizes announcements into raw evidence items."""
        pass

    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """Performs a safe dry-run test check for the source."""
        pass
