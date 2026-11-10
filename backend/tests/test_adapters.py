"""
Unit tests for Ingestion Adapters (Section 91).
"""
import pytest
from unittest.mock import patch
from app.services.ingestion.website import WebsiteAdapter
from app.services.ingestion.api import ApiAdapter
from app.services.ingestion.manual import ManualSubmissionAdapter


@pytest.mark.asyncio
async def test_manual_submission_adapter():
    payload = {
        "title": "Hackathon 2026",
        "description": "Annual student competition at UET Peshawar",
        "url": "https://uetpeshawar.edu.pk/hackathon",
        "flyer_url": "https://uetpeshawar.edu.pk/poster.jpg",
    }
    adapter = ManualSubmissionAdapter(source_id="src-manual-01", payload=payload)
    items = await adapter.fetch_items()

    assert len(items) == 1
    item = items[0]
    assert item.title_raw == "Hackathon 2026"
    assert item.canonical_url == "https://uetpeshawar.edu.pk/hackathon"
    assert len(item.media_items) == 1
    assert item.media_items[0].url == "https://uetpeshawar.edu.pk/poster.jpg"
    assert len(item.content_hash) == 64


@pytest.mark.asyncio
async def test_website_adapter_parsing():
    sample_html = """
    <html>
        <head><title>UET Peshawar Events</title></head>
        <body>
            <div class="news-item">
                <h2>Cybersecurity Workshop 2026</h2>
                <a href="/events/cyber-sec">Read More</a>
                <p>Learn ethical hacking in Peshawar.</p>
                <img src="/images/poster.png" />
            </div>
        </body>
    </html>
    """
    adapter = WebsiteAdapter(source_id="src-uet", source_url="https://www.uetpeshawar.edu.pk")
    with patch.object(adapter, "_fetch_html", return_value=(sample_html, 200)):
        items = await adapter.fetch_items()
        assert len(items) >= 1
        assert "Cybersecurity Workshop" in items[0].title_raw
        assert items[0].canonical_url == "https://www.uetpeshawar.edu.pk/events/cyber-sec"
        assert len(items[0].media_items) == 1


@pytest.mark.asyncio
async def test_website_adapter_prefers_program_courses_over_faq_cards():
    """PSEB-style course cards must be crawled even when FAQ blocks also match."""
    sample_html = """
    <html><body>
        <div class="faq-item">
            <h3>Is there any fee to join?</h3>
            <a href="/register">Register</a>
            <p>No fee for this training program.</p>
        </div>
        <div class="faq-item">
            <h3>What is this program?</h3>
            <p>A funded training course for graduates.</p>
        </div>
        <article class="prog">
            <h3>Artificial Intelligence</h3>
            <p>A 12-week bootcamp.</p>
            <span class="pdate">Apply by <b>15 Nov 2026</b></span>
            <a href="https://bootcamps.techdestination.com/programs/AI">View details</a>
        </article>
        <article class="prog">
            <h3>UI/UX</h3>
            <p>A 12-week design bootcamp.</p>
            <span class="pdate">Apply by <b>15 Nov 2026</b></span>
            <a href="https://bootcamps.techdestination.com/programs/UIUX">View details</a>
        </article>
    </body></html>
    """
    adapter = WebsiteAdapter(source_id="src-pseb", source_url="https://bootcamps.techdestination.com/")
    with patch.object(adapter, "_fetch_html", return_value=(sample_html, 200, {})):
        items = await adapter.fetch_items()

    titles = [item.title_raw for item in items]
    assert titles == ["Artificial Intelligence", "UI/UX"]
    assert items[0].canonical_url.endswith("/programs/AI")
    assert "Registration deadline: 15 Nov 2026" in items[0].body_raw
    assert items[0].published_at is not None
    assert items[0].published_at.year == 2026
    assert items[0].published_at.month == 11
    assert items[0].published_at.day == 15


@pytest.mark.asyncio
async def test_api_adapter_parsing():
    sample_json = [
        {
            "id": "e-101",
            "title": "Robotics Conference 2026",
            "description": "IEEE Robotics Summit at GIKI",
            "url": "https://giki.edu.pk/robotics",
            "date": "2026-11-20T09:00:00Z"
        }
    ]
    adapter = ApiAdapter(source_id="src-api", source_url="https://api.giki.edu.pk/events")
    with patch.object(adapter, "_fetch_json", return_value=(sample_json, 200)):
        items = await adapter.fetch_items()
        assert len(items) == 1
        assert items[0].title_raw == "Robotics Conference 2026"
        assert items[0].external_id == "e-101"
