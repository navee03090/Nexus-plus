"""
End-to-End Acceptance Test (Section 115).
Demonstrates the full pipeline:
1. First source ingests event -> Canonical opportunity created.
2. Second source ingests same event -> Deduplicated into SAME canonical event with two sources.
3. Source announces deadline change -> Change detected, opportunity updated, opportunity_changes recorded.
"""
import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy import select, delete

from app.core.database import AsyncSessionLocal, init_db
from app.models.source import Source
from app.models.source_item import SourceItem
from app.models.opportunity import Opportunity, OpportunitySource, OpportunityChange, OpportunityEmbedding
from app.services.extraction.extractor import ExtractionPipeline
from app.services.opportunities.resolver import OpportunityResolver
from app.services.ingestion.base import RawEvidenceItem
from app.services.notifications.dispatcher import NotificationDispatcher


@pytest.mark.asyncio
async def test_end_to_end_acceptance_flow():
    await init_db()

    run_id = uuid.uuid4().hex[:6]
    test_event_title = f"KP AI & Cyber Hackathon Series {run_id}"
    src1_id = f"src-uet-{run_id}"
    src2_id = f"src-kpitb-{run_id}"

    async with AsyncSessionLocal() as db:
        # Reset test-specific opportunities
        await db.execute(delete(Opportunity).where(Opportunity.title.like("KP AI & Cyber Hackathon%")))
        await db.commit()

        # Register Source 1: University Website
        src1 = Source(
            id=src1_id,
            name="UET Peshawar Website",
            source_type="Website",
            platform="University Portal",
            url=f"https://uetpeshawar.edu.pk/events-{run_id}",
            parser_key="uet_events",
            trust_score=0.98,
            is_active=True
        )
        # Register Source 2: Government Portal
        src2 = Source(
            id=src2_id,
            name="KPITB Announcements",
            source_type="Website",
            platform="Government Portal",
            url=f"https://kpitb.gov.pk/announcements-{run_id}",
            parser_key="kpitb_news",
            trust_score=0.99,
            is_active=True
        )
        db.add_all([src1, src2])
        await db.commit()

        # STEP 1: Process Announcement 1 from UET
        evidence_item_1 = RawEvidenceItem(
            source_id=src1_id,
            external_id=f"uet-post-{run_id}-1",
            canonical_url=f"https://uetpeshawar.edu.pk/events/hackathon-{run_id}",
            title_raw=test_event_title,
            caption_raw="Join us at UET Peshawar for 48 hours of competitive hacking.",
            body_raw=f"Event on 24 Oct 2026 at UET Peshawar Main Campus. Registration closes 18 Oct 2026. Details for {test_event_title}. Visit https://kpitb.gov.pk/register to apply.",
            published_at=datetime(2026, 10, 1, 10, 0, tzinfo=timezone.utc),
            content_type="html"
        )

        pipeline = ExtractionPipeline()
        ext_out_1, val_res_1, qr_1, ocr_1 = await pipeline.process_raw_evidence(evidence_item_1)

        s_item_1 = SourceItem(
            id=f"item-uet-1-{run_id}",
            source_id=src1_id,
            external_id=evidence_item_1.external_id,
            canonical_url=evidence_item_1.canonical_url,
            content_hash=evidence_item_1.content_hash,
            title_raw=evidence_item_1.title_raw,
            body_raw=evidence_item_1.body_raw,
            published_at=evidence_item_1.published_at,
            status="extracted"
        )
        db.add(s_item_1)
        await db.flush()

        opp_1, is_new_1, changes_1 = await OpportunityResolver.resolve(
            db=db,
            source_item_id=s_item_1.id,
            source_id=src1_id,
            source_trust=0.98,
            validation_result=val_res_1,
            ai_confidence=0.95
        )

        assert is_new_1 is True
        assert opp_1 is not None
        assert "Hackathon" in opp_1.title
        canonical_opp_id = opp_1.id

        # STEP 2: Process Announcement 2 from KPITB (Duplicate Cross-Source Confirmation)
        evidence_item_2 = RawEvidenceItem(
            source_id=src2_id,
            external_id=f"kpitb-press-{run_id}-2",
            canonical_url=f"https://kpitb.gov.pk/announcements/hackathon-{run_id}",
            title_raw=f"{test_event_title} - Registration Open",
            caption_raw="KPITB and UET Peshawar announce provincial hackathon.",
            body_raw=f"Event date 24 Oct 2026 at UET Peshawar. Registration deadline 18 Oct 2026 for {test_event_title}. Register at https://kpitb.gov.pk/register",
            published_at=datetime(2026, 10, 2, 14, 0, tzinfo=timezone.utc),
            content_type="html"
        )

        s_item_2 = SourceItem(
            id=f"item-kpitb-2-{run_id}",
            source_id=src2_id,
            external_id=evidence_item_2.external_id,
            canonical_url=evidence_item_2.canonical_url,
            content_hash=evidence_item_2.content_hash,
            title_raw=evidence_item_2.title_raw,
            body_raw=evidence_item_2.body_raw,
            published_at=evidence_item_2.published_at,
            status="extracted"
        )
        db.add(s_item_2)
        await db.flush()

        ext_out_2, val_res_2, qr_2, ocr_2 = await pipeline.process_raw_evidence(evidence_item_2)

        opp_2, is_new_2, changes_2 = await OpportunityResolver.resolve(
            db=db,
            source_item_id=s_item_2.id,
            source_id=src2_id,
            source_trust=0.99,
            validation_result=val_res_2,
            ai_confidence=0.96
        )

        # Verification of Acceptance Criteria:
        # NO duplicate opportunity created! Merged into same canonical opportunity
        assert is_new_2 is False
        assert opp_2.id == canonical_opp_id

        # Check provenance: exactly ONE canonical opportunity with TWO source references!
        sources_stmt = select(OpportunitySource).where(OpportunitySource.opportunity_id == canonical_opp_id)
        sources_linked = (await db.execute(sources_stmt)).scalars().all()
        assert len(sources_linked) == 2

        # STEP 3: Process Deadline Extension Announcement (Change Detection)
        evidence_item_3 = RawEvidenceItem(
            source_id=src1_id,
            external_id=f"uet-update-{run_id}-3",
            canonical_url=f"https://uetpeshawar.edu.pk/events/hackathon-extension-{run_id}",
            title_raw=f"{test_event_title} - Deadline Extended",
            caption_raw="Registration deadline extended due to high student demand.",
            body_raw=f"Deadline extended to 22 Oct 2026 for the Hackathon taking place on 24 Oct 2026 at UET Peshawar. Event: {test_event_title}. Register: https://kpitb.gov.pk/register",
            published_at=datetime(2026, 10, 15, 12, 0, tzinfo=timezone.utc),
            content_type="html"
        )

        s_item_3 = SourceItem(
            id=f"item-uet-3-{run_id}",
            source_id=src1_id,
            external_id=evidence_item_3.external_id,
            canonical_url=evidence_item_3.canonical_url,
            content_hash=evidence_item_3.content_hash,
            title_raw=evidence_item_3.title_raw,
            body_raw=evidence_item_3.body_raw,
            published_at=evidence_item_3.published_at,
            status="extracted"
        )
        db.add(s_item_3)
        await db.flush()

        ext_out_3, val_res_3, qr_3, ocr_3 = await pipeline.process_raw_evidence(evidence_item_3)

        opp_3, is_new_3, changes_3 = await OpportunityResolver.resolve(
            db=db,
            source_item_id=s_item_3.id,
            source_id=src1_id,
            source_trust=0.98,
            validation_result=val_res_3,
            ai_confidence=0.95
        )

        # Verification: Opportunity was updated, change record was generated
        assert is_new_3 is False
        assert opp_3.id == canonical_opp_id
        assert len(changes_3) >= 1
        assert changes_3[0]["field_name"] == "registration_deadline"
        assert changes_3[0]["change_type"] == "deadline_extension"

        # Check opportunity_changes table in DB
        changes_stmt = select(OpportunityChange).where(OpportunityChange.opportunity_id == canonical_opp_id)
        db_changes = (await db.execute(changes_stmt)).scalars().all()
        assert len(db_changes) >= 1
        assert any(c.change_type == "deadline_extension" for c in db_changes)

        # Verification of Notification Dispatch on Update
        deliveries = await NotificationDispatcher.dispatch_opportunity_alert(
            db=db,
            user_id=f"test-student-{run_id}",
            opportunity=opp_3,
            notification_type="OPPORTUNITY_UPDATED",
            reason="Deadline extended to 22 Oct 2026"
        )
        assert len(deliveries) >= 1
        assert deliveries[0].notification_type == "OPPORTUNITY_UPDATED"

        # Clean up test artifacts
        await db.execute(delete(OpportunityChange).where(OpportunityChange.opportunity_id == canonical_opp_id))
        await db.execute(delete(OpportunitySource).where(OpportunitySource.opportunity_id == canonical_opp_id))
        await db.execute(delete(OpportunityEmbedding).where(OpportunityEmbedding.opportunity_id == canonical_opp_id))
        await db.execute(delete(Opportunity).where(Opportunity.id == canonical_opp_id))
        await db.commit()
