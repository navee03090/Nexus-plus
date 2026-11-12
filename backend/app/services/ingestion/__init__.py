"""
Ingestion adapter factory and registration registry.
Instantiates the appropriate BaseSourceAdapter strategy based on source_type and parser_key.
"""
from typing import Dict, Any, Optional
from app.services.ingestion.base import BaseSourceAdapter, RawEvidenceItem, RawEvidenceMedia
from app.services.ingestion.website import WebsiteAdapter
from app.services.ingestion.nccs import NccsChallengeAdapter
from app.services.ingestion.rss import RSSAdapter
from app.services.ingestion.sitemap import SitemapAdapter
from app.services.ingestion.api import ApiAdapter
from app.services.ingestion.social import SocialAdapter
from app.services.ingestion.pdf import PdfAdapter
from app.services.ingestion.manual import ManualSubmissionAdapter


def _is_nccs_challenge(source_url: str, parser_key: str) -> bool:
    key = (parser_key or "").lower()
    url = (source_url or "").lower()
    return (
        "nccs_cybersecurity_challenge" in key
        or "pakistancybersecuritychallenge.nccs.pk" in url
    )


def get_adapter_for_source(
    source_id: str,
    source_type: str,
    source_url: str,
    parser_key: str = "generic",
    extra_payload: Optional[Dict[str, Any]] = None
) -> BaseSourceAdapter:
    """
    Factory creating configured adapter instance for a source.
    """
    st_upper = (source_type or "").upper()

    if _is_nccs_challenge(source_url, parser_key):
        return NccsChallengeAdapter(source_id=source_id, source_url=source_url, parser_key=parser_key)

    if st_upper in ("WEBSITE", "HTML", "PORTAL"):
        return WebsiteAdapter(source_id=source_id, source_url=source_url, parser_key=parser_key)
    elif st_upper in ("RSS", "ATOM", "FEED"):
        return RSSAdapter(source_id=source_id, source_url=source_url, parser_key=parser_key)
    elif st_upper == "SITEMAP":
        return SitemapAdapter(source_id=source_id, source_url=source_url, parser_key=parser_key)
    elif st_upper == "API":
        return ApiAdapter(source_id=source_id, source_url=source_url, parser_key=parser_key)
    elif st_upper in ("SOCIAL", "INSTAGRAM", "FACEBOOK", "LINKEDIN"):
        return SocialAdapter(source_id=source_id, source_url=source_url, parser_key=parser_key)
    elif st_upper == "PDF":
        return PdfAdapter(source_id=source_id, source_url=source_url, parser_key=parser_key)
    elif st_upper == "MANUAL":
        return ManualSubmissionAdapter(source_id=source_id, payload=extra_payload)
    else:
        # Default to website adapter
        return WebsiteAdapter(source_id=source_id, source_url=source_url, parser_key=parser_key)


__all__ = [
    "BaseSourceAdapter",
    "RawEvidenceItem",
    "RawEvidenceMedia",
    "WebsiteAdapter",
    "NccsChallengeAdapter",
    "RSSAdapter",
    "SitemapAdapter",
    "ApiAdapter",
    "SocialAdapter",
    "PdfAdapter",
    "ManualSubmissionAdapter",
    "get_adapter_for_source",
]
