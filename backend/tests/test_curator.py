"""
Tests for Phase 1 Curator Ingestion Endpoint (POST /api/v1/ingestion/curator).
"""
import pytest
import httpx
from app.main import app
from app.core.database import init_db


@pytest.mark.asyncio
async def test_curator_endpoint_text_submission():
    await init_db()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "source_url": "https://www.linkedin.com/posts/kpitb_ai-summit-peshawar-2026",
            "platform": "LinkedIn",
            "raw_text": "Announcing the Khyber Pakhtunkhwa AI Summit 2026 at Peshawar on November 15, 2026. Register before November 01, 2026 at https://kpitb.gov.pk/summit",
            "tags": "AI, Summit, Peshawar",
        }
        res = await client.post("/api/v1/ingestion/curator", data=payload)
        assert res.status_code == 200
        json_data = res.json()
        assert json_data["success"] is True
        data = json_data["data"]
        assert "opportunity" in data
        assert data["opportunity"]["id"] is not None
        assert data["is_new"] is True


@pytest.mark.asyncio
async def test_curator_endpoint_with_image_file():
    await init_db()
    # 1x1 transparent PNG bytes for mock upload
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        files = {
            "flyer_file": ("test_poster.png", png_bytes, "image/png"),
        }
        data = {
            "source_url": "https://facebook.com/uetpeshawar/posts/hackathon-announcement-99",
            "platform": "Facebook",
            "raw_text": "UET Peshawar Annual Hackathon on December 10, 2026.",
        }
        res = await client.post("/api/v1/ingestion/curator", data=data, files=files)
        assert res.status_code == 200
        json_data = res.json()
        assert json_data["success"] is True
        opp = json_data["data"]["opportunity"]
        assert opp["flyer_url"] is not None
        assert opp["flyer_url"].startswith("/static/uploads/flyers/")


@pytest.mark.asyncio
async def test_curator_endpoint_rejects_ssrf():
    await init_db()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "source_url": "http://127.0.0.1:8000/internal-admin",
            "platform": "LinkedIn",
            "raw_text": "Suspicious internal post",
        }
        res = await client.post("/api/v1/ingestion/curator", data=payload)
        err_msg = res.json().get("detail") or res.json().get("error", {}).get("message", "")
        assert "Invalid or unsafe source URL" in err_msg
