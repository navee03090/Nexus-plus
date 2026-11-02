"""
Tests for Dual-Engine Social Media Ingestion:
1. Meta Official Webhook (Facebook & Instagram)
2. Apify Cloud Scraper Webhook (Facebook & Instagram)
"""
import hmac
import hashlib
import json
import pytest
import httpx
from app.main import app
from app.core.config import settings
from app.core.database import init_db


@pytest.mark.asyncio
async def test_meta_webhook_verification_handshake():
    """Verifies that Meta GET challenge handshake succeeds with valid verify_token."""
    await init_db()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Valid challenge
        params = {
            "hub.mode": "subscribe",
            "hub.verify_token": settings.META_VERIFY_TOKEN,
            "hub.challenge": "1158201444"
        }
        res = await client.get("/api/v1/ingestion/social/meta", params=params)
        assert res.status_code == 200
        assert res.text == "1158201444"

        # Invalid token rejection
        bad_params = {
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong_token",
            "hub.challenge": "1158201444"
        }
        bad_res = await client.get("/api/v1/ingestion/social/meta", params=bad_params)
        assert bad_res.status_code == 403


@pytest.mark.asyncio
async def test_meta_webhook_signed_post_ingestion():
    """Verifies incoming Meta Page feed event with HMAC-SHA256 signature."""
    await init_db()

    event_payload = {
        "object": "page",
        "entry": [
            {
                "id": "10023456789",
                "time": 1728345600,
                "changes": [
                    {
                        "field": "feed",
                        "value": {
                            "item": "status",
                            "verb": "add",
                            "post_id": "10023456789_5544332211",
                            "message": "Official Call: KP National AI Hackathon 2026. Register by November 15 at https://kpitb.gov.pk",
                            "link": "https://www.facebook.com/kpitbgov/posts/5544332211",
                            "photos": ["https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200"]
                        }
                    }
                ]
            }
        ]
    }
    raw_body = json.dumps(event_payload).encode("utf-8")

    # Generate valid Meta HMAC-SHA256 signature
    sig = hmac.new(
        settings.META_APP_SECRET.encode("utf-8"),
        msg=raw_body,
        digestmod=hashlib.sha256
    ).hexdigest()

    headers = {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": f"sha256={sig}"
    }

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/api/v1/ingestion/social/meta", content=raw_body, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["events_processed"] >= 1
        assert "KP National AI Hackathon" in data["details"][0]["title"]


@pytest.mark.asyncio
async def test_apify_facebook_webhook_ingestion():
    """Verifies Apify Facebook Scraper payload normalization and pipeline ingestion."""
    await init_db()

    apify_facebook_items = [
        {
            "id": "fb_post_998877",
            "pageName": "NIC Peshawar",
            "url": "https://www.facebook.com/nicpeshawar/posts/pfbid02xY98877",
            "postText": "Incubation Cohort 12 Applications Open! Calling all tech startups in Khyber Pakhtunkhwa. Deadline: December 01, 2026.",
            "images": ["https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200"],
            "date": "2026-10-08T09:00:00Z"
        }
    ]

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/ingestion/social/apify",
            params={"platform": "Facebook"},
            json=apify_facebook_items
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["items_received"] == 1
        assert data["items_published"] == 1

        # Second submission of identical post should be detected as duplicate
        res_dup = await client.post(
            "/api/v1/ingestion/social/apify",
            params={"platform": "Facebook"},
            json=apify_facebook_items
        )
        assert res_dup.status_code == 200
        data_dup = res_dup.json()
        assert data_dup["items_duplicated"] == 1


@pytest.mark.asyncio
async def test_apify_instagram_webhook_ingestion():
    """Verifies Apify Instagram Scraper payload normalization and pipeline ingestion."""
    await init_db()

    apify_instagram_items = [
        {
            "id": "ig_33445566",
            "shortCode": "C9xYzAbC1",
            "ownerUsername": "gdgpeshawar",
            "url": "https://www.instagram.com/p/C9xYzAbC1/",
            "caption": "DevFest Peshawar 2026! Join us for a full day of AI, Cloud, and Web technologies on November 20. Tickets available now.",
            "displayUrl": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200",
            "timestamp": "2026-10-08T08:30:00Z"
        }
    ]

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/ingestion/social/apify",
            params={"platform": "Instagram"},
            json=apify_instagram_items
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["items_received"] == 1
        assert data["items_published"] == 1
