"""
NCCS Pakistan Cybersecurity Challenge reader.

That site is a React shell: every page returns <div id="root"></div>.
The real 2026 events live inside the main JavaScript bundle. This adapter
reads that bundle only for the NCCS source and leaves other websites alone.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin

import dateutil.parser
import httpx

from app.core.config import settings
from app.core.logging import logger
from app.core.security import validate_target_url, sanitize_text
from app.services.ingestion.base import BaseSourceAdapter, RawEvidenceItem


def _field(block: str, key: str) -> Optional[str]:
    match = re.search(rf"{re.escape(key)}:`((?:\\`|[^`])*)`", block)
    if not match:
        return None
    return match.group(1).replace("\\`", "`").strip()


def _extract_object_at(js: str, start: int) -> Optional[str]:
    if start < 0 or start >= len(js) or js[start] != "{":
        return None
    depth = 0
    in_string = False
    quote = ""
    escaped = False
    for i in range(start, len(js)):
        ch = js[i]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                in_string = False
            continue
        if ch in ("`", "'", '"'):
            in_string = True
            quote = ch
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return js[start : i + 1]
    return None


def parse_nccs_events_from_js(js: str, year: int = 2026) -> List[Dict[str, str]]:
    """Pull PCC event objects for one year out of the bundled site script."""
    events: List[Dict[str, str]] = []
    seen = set()
    for match in re.finditer(rf"\{{slug:`([^`]+)`,year:{year}\b", js):
        block = _extract_object_at(js, match.start())
        if not block:
            continue
        slug = match.group(1)
        if slug in seen:
            continue
        title = _field(block, "title")
        if not title:
            continue
        seen.add(slug)
        events.append({
            "slug": slug,
            "title": title,
            "summary": _field(block, "summary") or "",
            "track": _field(block, "track") or "",
            "start_date": _field(block, "startDate") or "",
            "end_date": _field(block, "endDate") or "",
            "registration_closes": _field(block, "registrationCloses") or "",
            "registration_url": _field(block, "registrationUrl") or "",
        })
    return events


class NccsChallengeAdapter(BaseSourceAdapter):
    """Reads PCC events from the NCCS JavaScript bundle."""

    def _report(self, label: str, done: bool = False) -> None:
        report = getattr(self, "report_progress", None)
        if report:
            report(label, done)

    async def _get(self, url: str) -> Tuple[str, int]:
        clean = validate_target_url(url)
        headers = {
            "User-Agent": settings.CRAWLER_USER_AGENT,
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
        }
        async with httpx.AsyncClient(
            timeout=settings.REQUEST_TIMEOUT_SECONDS,
            follow_redirects=True,
            verify=False,
        ) as client:
            resp = await client.get(clean, headers=headers)
            resp.raise_for_status()
            return resp.text, resp.status_code

    def _script_url(self, html: str) -> Optional[str]:
        match = re.search(
            r'<script[^>]+src=["\']([^"\']*assets/index-[^"\']+\.js)["\']',
            html,
            re.I,
        )
        if not match:
            return None
        return urljoin(self.source_url.rstrip("/") + "/", match.group(1).lstrip("/"))

    def _to_item(self, event: Dict[str, str], idx: int) -> RawEvidenceItem:
        slug = event["slug"]
        title = event["title"]
        canonical = urljoin(self.source_url.rstrip("/") + "/", f"events/{slug}")
        parts = [
            f"Title: {title}.",
            "Organization: National Centre for Cyber Security (NCCS).",
            "Programme: Pakistan Cybersecurity Challenge (PCC) 2026.",
            "Venue: Air University, Islamabad, Pakistan.",
        ]
        if event.get("track"):
            parts.append(f"Track: {event['track']}.")
        if event.get("start_date"):
            parts.append(f"Starts: {event['start_date']}.")
        if event.get("end_date"):
            parts.append(f"Ends: {event['end_date']}.")
        if event.get("registration_closes"):
            parts.append(f"Registration deadline: {event['registration_closes']}.")
        if event.get("registration_url"):
            parts.append(f"Apply: {event['registration_url']}.")
        if event.get("summary"):
            parts.append(event["summary"])
        body = sanitize_text(" ".join(parts))

        # Use the event dates for freshness, not the registration close date.
        # Some PCC registration dates are from an earlier year and would be
        # dropped by the stale-announcement filter before the AI can read them.
        pub_date = None
        for raw in (event.get("start_date"), event.get("end_date")):
            if not raw:
                continue
            try:
                pub_date = dateutil.parser.parse(raw)
                break
            except Exception:
                continue
        if pub_date is None:
            pub_date = datetime.now(timezone.utc)

        return RawEvidenceItem(
            source_id=self.source_id,
            external_id=f"nccs-{slug}",
            canonical_url=canonical,
            title_raw=title,
            caption_raw=(event.get("summary") or title)[:500],
            body_raw=body,
            published_at=pub_date,
            raw_payload={"parser": "nccs_js_bundle", "event": event},
            content_type="html",
            media_items=[],
        )

    async def test_connection(self) -> Dict[str, Any]:
        try:
            items = await self.fetch_items()
            return {
                "status_code": 200,
                "is_reachable": True,
                "items_count": len(items),
                "discovered_items": len(items),
                "sample_titles": [item.title_raw for item in items[:5]],
                "sample_links": [item.canonical_url for item in items[:5]],
                "sample_images": [],
            }
        except Exception as e:
            logger.warning(f"NCCS test_connection failed: {e}")
            return {
                "status_code": 500,
                "is_reachable": False,
                "error": str(e),
                "sample_titles": [],
                "sample_images": [],
            }

    async def fetch_items(self) -> List[RawEvidenceItem]:
        self._report("Reading the NCCS website shell")
        html, _ = await self._get(self.source_url)
        script_url = self._script_url(html)
        if not script_url:
            self._report("NCCS JavaScript bundle not found", done=True)
            logger.warning(f"NCCS adapter could not find the JS bundle on {self.source_url}")
            return []

        self._report("Reading the NCCS event list from JavaScript")
        js, _ = await self._get(script_url)
        events = parse_nccs_events_from_js(js, year=2026)
        self._report(f"Found {len(events)} NCCS events in JavaScript", done=True)

        items: List[RawEvidenceItem] = []
        max_items = max(1, settings.CRAWL_MAX_ITEMS)
        for idx, event in enumerate(events[:max_items]):
            items.append(self._to_item(event, idx))
        return items
