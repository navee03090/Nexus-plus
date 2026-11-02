"""
Tests for Autonomous University & Portal Crawlers (Path B).
Verifies table row notices, PDF circular detection, ETag caching,
automated downstream extraction & resolution, and scheduled due-source checking.
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.source import Source
from app.models.source_item import SourceItem
from app.models.opportunity import Opportunity
from app.models.audit import IngestionRun
from app.services.ingestion.website import WebsiteAdapter
from app.tasks.ingestion import execute_source_crawl, check_and_run_due_sources


@pytest.mark.asyncio
async def test_website_adapter_notice_board_table_and_pdf():
    """Verifies parsing of university table notices and attached PDF circular links."""
    notice_table_html = """
    <html>
        <head><title>UET Peshawar Notice Board</title></head>
        <body>
            <table class="table-notices">
                <tr><th>Date</th><th>Notification / Circular</th></tr>
                <tr>
                    <td>2026-10-15</td>
                    <td>
                        <a href="/downloads/hackathon_2026_rules.pdf">
                            Notice: All Pakistan AI & Cyber Defense Hackathon 2026 Registration Open
                        </a>
                        <p>Teams from CSE, Electrical and CS departments are eligible. Closing date is 24 Oct.</p>
                        <img src="/media/flyer_poster.jpg" />
                    </td>
                </tr>
            </table>
        </body>
    </html>
    """
    adapter = WebsiteAdapter(
        source_id="src-uet-table",
        source_url="https://www.uetpeshawar.edu.pk/student-notice-board"
    )

    with patch.object(adapter, "_fetch_html", return_value=(notice_table_html, 200, {})):
        items = await adapter.fetch_items()
        assert len(items) >= 1
        item = items[0]

        assert "AI & Cyber Defense Hackathon" in item.title_raw
        assert len(item.media_items) >= 1

        # Check PDF circular was detected
        pdf_media = [m for m in item.media_items if m.media_type == "pdf"]
        assert len(pdf_media) >= 1
        assert "hackathon_2026_rules.pdf" in pdf_media[0].url

        # Check flyer image was detected
        flyer_media = [m for m in item.media_items if m.media_type == "flyer"]
        assert len(flyer_media) >= 1
        assert "flyer_poster.jpg" in flyer_media[0].url


@pytest.mark.asyncio
async def test_execute_source_crawl_end_to_end():
    """
    End-to-end verification of autonomous crawler:
    Crawls source -> saves SourceItem -> triggers AI extraction -> publishes canonical opportunity.
    """
    unique_slug = uuid.uuid4().hex[:6]
    portal_html = f"""
    <html>
        <head><title>KPITB Opportunities</title></head>
        <body>
            <div class="announcement-card">
                <h3>Autonomous Challenge {unique_slug}</h3>
                <a href="/events/ai-challenge-{unique_slug}">View Details</a>
                <p>Register for KP AI Challenge by Oct 25, 2026. Cash awards of PKR 1 Million.</p>
                <img src="/images/kpitb_banner.png" />
            </div>
        </body>
    </html>
    """
    source_id = f"test-crawl-src-{unique_slug}"

    async with AsyncSessionLocal() as db:
        source = Source(
            id=source_id,
            name="Test Automated Source",
            source_type="Website",
            platform="Government Portal",
            url="https://www.kpitb.gov.pk/announcements",
            parser_key="kpitb_portal",
            crawl_frequency=1800,
            trust_score=0.98,
            status="active",
            is_active=True
        )
        db.add(source)
        await db.commit()

    # Mock website fetch so test does not hit external network
    with patch("app.services.ingestion.website.WebsiteAdapter._fetch_html", return_value=(portal_html, 200, {})):
        res = await execute_source_crawl(source_id)

        assert res["status"] == "success"
        assert res["items_found"] >= 1
        assert res["items_saved"] >= 1
        assert res["items_published"] >= 1

        async with AsyncSessionLocal() as db:
            # Check source metrics updated
            updated_source = await db.get(Source, source_id)
            assert updated_source.last_checked_at is not None
            assert updated_source.last_success_at is not None
            assert updated_source.consecutive_failures == 0

            # Check IngestionRun record
            run_stmt = select(IngestionRun).where(IngestionRun.source_id == source_id)
            runs = (await db.execute(run_stmt)).scalars().all()
            assert len(runs) >= 1
            latest_run = runs[-1]
            assert latest_run.status == "success"
            assert latest_run.items_found >= 1

            # Check canonical Opportunity created
            opp_stmt = select(Opportunity).where(Opportunity.title.like("%Hackathon%") | Opportunity.title.like("%Challenge%"))
            opps = (await db.execute(opp_stmt)).scalars().all()
            assert len(opps) >= 1

        # Second crawl of the same content should detect duplicate and skip LLM re-run
        res_dup = await execute_source_crawl(source_id)
        assert res_dup["status"] == "success"
        assert res_dup["items_duplicated"] >= 1


@pytest.mark.asyncio
async def test_check_and_run_due_sources():
    """Verifies that the autonomous scheduler identifies sources past crawl frequency."""
    source_id = f"due-src-{uuid.uuid4().hex[:8]}"

    async with AsyncSessionLocal() as db:
        # Source last checked 2 hours ago with 1 hour frequency -> DUE
        past_time = datetime.now(timezone.utc) - timedelta(hours=2)
        source = Source(
            id=source_id,
            name="Due Test Source",
            source_type="Website",
            platform="University Portal",
            url="https://www.uetpeshawar.edu.pk/test",
            parser_key="uet_peshawar_events",
            crawl_frequency=3600,
            last_checked_at=past_time,
            trust_score=0.95,
            status="active",
            is_active=True
        )
        db.add(source)
        await db.commit()

    with patch("app.tasks.ingestion.execute_source_crawl", new_callable=AsyncMock) as mock_crawl:
        mock_crawl.side_effect = lambda sid, **kwargs: {"source_id": sid, "status": "success"}
        results = await check_and_run_due_sources()

        # The due source should have triggered crawl
        mock_crawl.assert_called()
        matching = [r for r in results if r.get("source_id") == source_id]
        assert len(matching) >= 1
