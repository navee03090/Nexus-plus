"""
Apify Cloud Ingestion Adapter & Normalizer.
Processes Facebook and Instagram posts collected via Apify cloud actors,
extracts high-res flyer images and captions, and maps them into RawEvidenceItems.
"""
import uuid
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import httpx
import dateutil.parser

from app.core.config import settings
from app.core.logging import logger
from app.services.ingestion.base import RawEvidenceItem, RawEvidenceMedia
from app.core.security import validate_target_url, sanitize_text


class ApifySocialNormalizer:
    """
    Normalizes diverse Apify Actor dataset outputs (Facebook & Instagram)
    into standard Nexus Pulse RawEvidenceItems.
    """

    @classmethod
    def normalize_facebook_item(cls, source_id: str, raw_item: Dict[str, Any]) -> Optional[RawEvidenceItem]:
        """
        Normalizes a post from Apify Facebook Scrapers (e.g., apify/facebook-posts-scraper).
        """
        # 1. Extract Post Text / Caption
        text = raw_item.get("text") or raw_item.get("postText") or raw_item.get("message") or ""
        text = sanitize_text(text)

        # 2. Extract Canonical URL
        url = raw_item.get("url") or raw_item.get("postUrl") or raw_item.get("canonicalUrl") or ""
        if not url:
            post_id = raw_item.get("id") or raw_item.get("postId") or uuid.uuid4().hex[:12]
            page_id = raw_item.get("pageId") or "facebook"
            url = f"https://www.facebook.com/{page_id}/posts/{post_id}"

        # 3. Extract Attached Images (Flyers)
        media_list: List[RawEvidenceMedia] = []
        raw_images = []

        if raw_item.get("imageUrl"):
            raw_images.append(raw_item.get("imageUrl"))
        if raw_item.get("images") and isinstance(raw_item.get("images"), list):
            raw_images.extend(raw_item.get("images"))
        if raw_item.get("media") and isinstance(raw_item.get("media"), list):
            for m in raw_item.get("media"):
                if isinstance(m, dict) and m.get("url"):
                    raw_images.append(m.get("url"))
                elif isinstance(m, str):
                    raw_images.append(m)

        for img_url in raw_images:
            if img_url and isinstance(img_url, str) and img_url.startswith("http"):
                media_list.append(RawEvidenceMedia(media_type="flyer", url=img_url))

        # Must have at least some text or an image
        if not text and not media_list:
            return None

        # 4. Extract Title Preview
        page_name = raw_item.get("pageName") or raw_item.get("user", {}).get("name") if isinstance(raw_item.get("user"), dict) else None
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        if lines:
            title = lines[0][:150]
        else:
            title = f"{page_name or 'Facebook'} Announcement"

        # 5. Extract Timestamp
        pub_date = None
        time_raw = raw_item.get("time") or raw_item.get("date") or raw_item.get("timestamp")
        if time_raw:
            try:
                pub_date = dateutil.parser.parse(str(time_raw))
            except Exception:
                pass

        content_hash = hashlib.sha256(f"{url}:{text}:{len(media_list)}".encode("utf-8")).hexdigest()

        return RawEvidenceItem(
            source_id=source_id,
            external_id=str(raw_item.get("id") or raw_item.get("postId") or content_hash[:16]),
            canonical_url=url,
            title_raw=title,
            caption_raw=text[:500] if text else title,
            body_raw=text,
            published_at=pub_date or datetime.now(timezone.utc),
            content_type="mixed" if media_list else "text",
            raw_payload={"platform": "Facebook", "page_name": page_name, "raw": raw_item},
            media_items=media_list
        )

    @classmethod
    def normalize_instagram_item(cls, source_id: str, raw_item: Dict[str, Any]) -> Optional[RawEvidenceItem]:
        """
        Normalizes a post from Apify Instagram Scrapers (e.g., apify/instagram-scraper).
        """
        # 1. Extract Caption
        caption = raw_item.get("caption") or raw_item.get("text") or ""
        caption = sanitize_text(caption)

        # 2. Extract Permalink
        url = raw_item.get("url") or ""
        shortcode = raw_item.get("shortCode") or raw_item.get("code")
        if not url and shortcode:
            url = f"https://www.instagram.com/p/{shortcode}/"
        if not url:
            url = f"https://www.instagram.com/p/{uuid.uuid4().hex[:10]}/"

        # 3. Extract Attached Images / Posters
        media_list: List[RawEvidenceMedia] = []
        raw_images = []

        if raw_item.get("displayUrl"):
            raw_images.append(raw_item.get("displayUrl"))
        if raw_item.get("images") and isinstance(raw_item.get("images"), list):
            raw_images.extend(raw_item.get("images"))
        if raw_item.get("childPosts") and isinstance(raw_item.get("childPosts"), list):
            for cp in raw_item.get("childPosts"):
                if isinstance(cp, dict) and cp.get("displayUrl"):
                    raw_images.append(cp.get("displayUrl"))

        for img_url in raw_images:
            if img_url and isinstance(img_url, str) and img_url.startswith("http"):
                media_list.append(RawEvidenceMedia(media_type="flyer", url=img_url))

        if not caption and not media_list:
            return None

        # 4. Title from caption or profile handle
        owner = raw_item.get("ownerUsername") or raw_item.get("ownerFullName") or "Instagram"
        lines = [ln.strip() for ln in caption.splitlines() if ln.strip()]
        if lines:
            title = lines[0][:150]
        else:
            title = f"{owner} Flyer Announcement"

        # 5. Timestamp
        pub_date = None
        time_raw = raw_item.get("timestamp") or raw_item.get("date")
        if time_raw:
            try:
                pub_date = dateutil.parser.parse(str(time_raw))
            except Exception:
                pass

        content_hash = hashlib.sha256(f"{url}:{caption}:{len(media_list)}".encode("utf-8")).hexdigest()

        return RawEvidenceItem(
            source_id=source_id,
            external_id=str(raw_item.get("id") or shortcode or content_hash[:16]),
            canonical_url=url,
            title_raw=title,
            caption_raw=caption[:500] if caption else title,
            body_raw=caption,
            published_at=pub_date or datetime.now(timezone.utc),
            content_type="mixed" if media_list else "text",
            raw_payload={"platform": "Instagram", "owner": owner, "raw": raw_item},
            media_items=media_list
        )


class ApifyClient:
    """
    Client for triggering and fetching runs from the Apify Cloud API.
    """

    def __init__(self, api_token: Optional[str] = None):
        self.api_token = api_token or settings.APIFY_API_TOKEN
        self.base_url = "https://api.apify.com/v2"

    async def run_actor(self, actor_id: str, run_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Starts an Apify Actor execution asynchronously.
        """
        if not self.api_token:
            raise ValueError("APIFY_API_TOKEN is not configured.")

        safe_actor_id = actor_id.replace("/", "~")
        url = f"{self.base_url}/acts/{safe_actor_id}/runs?token={self.api_token}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=run_input)
            resp.raise_for_status()
            return resp.json().get("data", {})

    async def fetch_dataset_items(self, dataset_id: str, limit: int = 25) -> List[Dict[str, Any]]:
        """
        Fetches scraped items from an Apify dataset.
        """
        if not self.api_token:
            raise ValueError("APIFY_API_TOKEN is not configured.")

        url = f"{self.base_url}/datasets/{dataset_id}/items?token={self.api_token}&limit={limit}&clean=true"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.json()

    async def get_run_status(self, run_id: str) -> Dict[str, Any]:
        """
        Checks current status and dataset ID of an Apify actor run.
        """
        if not self.api_token:
            raise ValueError("APIFY_API_TOKEN is not configured.")

        url = f"{self.base_url}/actor-runs/{run_id}?token={self.api_token}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.json().get("data", {})
