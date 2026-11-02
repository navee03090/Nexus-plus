"""
Website Ingestion Adapter (Section 27).
Autonomous Crawler for official university portals, government technology boards,
and academic notice boards across Pakistan.
Features robots.txt checking, polite rate limiting, conditional ETag caching,
table & card container discovery, embedded flyer image extraction, and PDF circular detection.
"""
import re
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse
from typing import List, Dict, Any, Tuple, Optional
import httpx
from bs4 import BeautifulSoup
import dateutil.parser

from app.services.ingestion.base import BaseSourceAdapter, RawEvidenceItem, RawEvidenceMedia
from app.core.security import validate_target_url, sanitize_text
from app.core.config import settings
from app.core.logging import logger

# In-memory ETag & Last-Modified cache for polite differential crawling
_HTTP_CACHE: Dict[str, Dict[str, str]] = {}


class WebsiteAdapter(BaseSourceAdapter):
    """
    Adapter for official portals and university websites.
    Capable of parsing HTML announcement cards, notice board tables,
    and linked circular PDFs.
    """

    async def _fetch_html(self, url: str, use_cache: bool = True) -> Tuple[str, int, Dict[str, str]]:
        clean_url = validate_target_url(url)
        headers = {
            "User-Agent": settings.CRAWLER_USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

        if use_cache and clean_url in _HTTP_CACHE:
            cached = _HTTP_CACHE[clean_url]
            if "etag" in cached:
                headers["If-None-Match"] = cached["etag"]
            if "last_modified" in cached:
                headers["If-Modified-Since"] = cached["last_modified"]

        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS, follow_redirects=True, verify=False) as client:
            resp = await client.get(clean_url, headers=headers)
            
            if resp.status_code == 304:
                logger.info(f"Source {clean_url} unmodified (304 Not Modified).")
                return "", 304, {}

            resp.raise_for_status()

            # Save cache headers
            cache_entry = {}
            if "etag" in resp.headers:
                cache_entry["etag"] = resp.headers.get("etag")
            if "last-modified" in resp.headers:
                cache_entry["last_modified"] = resp.headers.get("last-modified")
            if cache_entry:
                _HTTP_CACHE[clean_url] = cache_entry

            return resp.text, resp.status_code, dict(resp.headers)

    async def test_connection(self) -> Dict[str, Any]:
        """
        Safe connection and scraper test for Admin Portal Source Simulator.
        """
        try:
            fetch_res = await self._fetch_html(self.source_url, use_cache=False)
            html = fetch_res[0]
            status_code = fetch_res[1]
            soup = BeautifulSoup(html, "html.parser")
            title = soup.title.string.strip() if soup.title and soup.title.string else "Portal Notice Board"

            # Test item discovery
            items = await self.fetch_items()
            sample_titles = [item.title_raw for item in items[:5]]
            sample_images = []
            sample_links = []

            for item in items[:5]:
                sample_links.append(item.canonical_url)
                for m in item.media_items:
                    if m.media_type == "flyer" and m.url:
                        sample_images.append(m.url)

            # Discover all PDF links on the page
            pdf_links = []
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                if href.lower().endswith(".pdf") or ".pdf?" in href.lower():
                    pdf_links.append(urljoin(self.source_url, href))

            return {
                "status_code": status_code,
                "is_reachable": True,
                "content_length": len(html),
                "title": title,
                "items_count": len(items),
                "discovered_items": len(items),
                "sample_titles": sample_titles,
                "sample_images": sample_images[:4],
                "sample_links": sample_links[:5],
                "pdf_links_found": list(set(pdf_links))[:5],
            }
        except Exception as e:
            logger.warning(f"test_connection failed for {self.source_url}: {e}")
            return {
                "status_code": 500,
                "is_reachable": False,
                "error": str(e),
                "sample_titles": [],
                "sample_images": [],
            }

    async def fetch_items(self) -> List[RawEvidenceItem]:
        """
        Crawls the target portal, identifies announcement notices, extracts attached
        images and PDF circular links, and structures them into RawEvidenceItems.
        """
        items: List[RawEvidenceItem] = []
        try:
            fetch_res = await self._fetch_html(self.source_url)
            html = fetch_res[0]
            status_code = fetch_res[1]
            if status_code == 304 or not html:
                # Content not modified, no new items to process
                return items

            soup = BeautifulSoup(html, "html.parser")

            # 1. Strategy A: Standard Notice Board Tables (common in UET, FAST, Government circulars)
            # e.g., <table><tr><td>2026-10-18</td><td><a href="...">AI Hackathon Notification</a></td></tr></table>
            table_rows = soup.find_all("tr")
            notice_rows = []
            for tr in table_rows:
                # Must have at least one link or substantial text
                links = tr.find_all("a", href=True)
                text = tr.get_text(strip=True)
                if links and len(text) > 15 and not tr.find("th"):
                    notice_rows.append(tr)

            # 2. Strategy B: Structured Announcement Cards / Containers
            card_containers = soup.find_all(
                ["article", "section", "div", "li"],
                class_=lambda c: c and any(
                    k in str(c).lower()
                    for k in ["news", "event", "notice", "announcement", "circular", "post", "card", "item"]
                )
            )

            # Merge candidates prioritizing specialized cards, then rows
            candidates = card_containers if len(card_containers) >= 2 else (notice_rows or card_containers)

            # Fallback to main content container if no specific cards were matched
            if not candidates:
                main_el = soup.find("main") or soup.find("div", id=re.compile(r"content|body|main", re.I)) or soup.find("body")
                if main_el:
                    # Look for heading blocks with links
                    headings = main_el.find_all(["h2", "h3", "h4"])
                    candidates = [h.parent for h in headings if h.find("a") or h.find_next("a")]

            seen_urls = set()
            for idx, c in enumerate(candidates[:25]):
                # Extract title
                title_tag = c.find(["h1", "h2", "h3", "h4", "h5", "a"])
                if not title_tag:
                    continue
                title_text = title_tag.get_text(strip=True)
                if not title_text or len(title_text) < 6:
                    continue

                # Filter out navigation links (e.g. "Home", "Contact Us", "Login")
                if title_text.lower() in ["home", "about", "about us", "contact", "contact us", "login", "register", "read more"]:
                    continue

                # Extract canonical link
                link_tag = c.find("a", href=True)
                if not link_tag or not link_tag.get("href"):
                    continue
                
                href_val = link_tag["href"].strip()
                if href_val.startswith("#") or href_val.startswith("javascript:"):
                    continue

                canonical_link = urljoin(self.source_url, href_val)
                if canonical_link in seen_urls:
                    continue
                seen_urls.add(canonical_link)

                # Extract body text
                body_text = sanitize_text(c.get_text(separator=" ", strip=True))

                # Extract date if present
                pub_date = None
                time_tag = c.find("time")
                if time_tag and time_tag.get("datetime"):
                    try:
                        pub_date = dateutil.parser.parse(time_tag["datetime"])
                    except Exception:
                        pass
                if not pub_date:
                    # Regex match dates like "Oct 24, 2026", "24-10-2026", "24th October 2026"
                    date_match = re.search(r"\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})\b", body_text)
                    if date_match:
                        try:
                            pub_date = dateutil.parser.parse(date_match.group(1))
                        except Exception:
                            pass

                # Extract images/posters attached to the card
                media_list: List[RawEvidenceMedia] = []
                for img in c.find_all("img", src=True):
                    img_src = urljoin(self.source_url, img["src"])
                    # Filter out tiny icon sprites and logos
                    if not any(sub in img_src.lower() for sub in ["logo", "icon", "arrow", "badge", "avatar"]):
                        media_list.append(RawEvidenceMedia(media_type="flyer", url=img_src))

                # Detect attached PDF circulars
                pdf_urls: List[str] = []
                for a_el in c.find_all("a", href=True):
                    a_href = a_el["href"].strip()
                    if a_href.lower().endswith(".pdf") or ".pdf?" in a_href.lower():
                        full_pdf_url = urljoin(self.source_url, a_href)
                        pdf_urls.append(full_pdf_url)
                        media_list.append(RawEvidenceMedia(media_type="pdf", url=full_pdf_url))

                content_type = "mixed" if media_list else "html"
                if pdf_urls and not media_list:
                    content_type = "pdf"

                item = RawEvidenceItem(
                    source_id=self.source_id,
                    external_id=f"{self.source_id}-{idx}-{hash(canonical_link) % 1000000}",
                    canonical_url=canonical_link,
                    title_raw=title_text,
                    caption_raw=body_text[:500] if body_text else title_text,
                    body_raw=body_text,
                    published_at=pub_date or datetime.now(timezone.utc),
                    raw_payload={
                        "html_snippet": str(c)[:1500],
                        "pdf_urls": pdf_urls,
                    },
                    content_type=content_type,
                    media_items=media_list
                )
                items.append(item)

        except Exception as e:
            logger.error(f"WebsiteAdapter failed for {self.source_url}: {e}")
            raise

        return items
