"""
Canonical Opportunity Resolver (Section 39 & 112).
Resolves raw extractions against existing opportunities:
Merges duplicates into single canonical opportunities, maintains provenance,
detects and records field changes, and applies database transactions.
"""
import re
import uuid
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.opportunity import Opportunity, OpportunitySource, OpportunityChange, OpportunityEmbedding
from app.models.category import Category, Tag, OpportunityTag
from app.models.audit import VerificationQueue
from app.algorithms.deduplication import DeduplicationEngine
from app.services.opportunities.verifier import OpportunityVerifier
from app.services.opportunities.change_detector import ChangeDetector
from app.services.ai import get_ai_provider
from app.services.extraction.validator import ValidationResult
from app.core.logging import logger
import dateutil.parser


def slugify(text: Any) -> str:
    if not text:
        return "opportunity"
    s = str(text).lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s[:120] or "opportunity"


class OpportunityResolver:
    """Master event resolution service."""

    @classmethod
    async def resolve(
        cls,
        db: AsyncSession,
        source_item_id: str,
        source_id: str,
        source_trust: float,
        validation_result: ValidationResult,
        ai_confidence: float = 0.85,
        flyer_url: Optional[str] = None
    ) -> Tuple[Opportunity, bool, List[Dict[str, Any]]]:
        """
        Resolves incoming validated extraction against the database.
        Returns: (canonical_opportunity, is_newly_created, list_of_detected_changes)
        """
        data = validation_result.validated_data
        title = data.get("title") or "Untitled Opportunity"
        summary = data.get("summary") or title
        org_name = data.get("organization")

        # Parse dates
        start_dt = None
        if data.get("start_date"):
            try:
                start_dt = dateutil.parser.parse(str(data["start_date"]))
            except Exception:
                pass

        deadline_dt = None
        if data.get("registration_deadline"):
            try:
                deadline_dt = dateutil.parser.parse(str(data["registration_deadline"]))
            except Exception:
                pass

        # 1. Fetch active opportunities for deduplication matching
        stmt = (
            select(Opportunity)
            .where(Opportunity.status.in_(["published", "pending_review", "updated"]))
            .options(selectinload(Opportunity.embedding))
        )
        result = await db.execute(stmt)
        existing_list = result.scalars().all()

        existing_dicts = [
            {
                "id": opp.id,
                "title": opp.title,
                "summary": opp.summary,
                "organization_id": opp.organization_id,
                "start_date": opp.start_date,
                "registration_deadline": opp.registration_deadline,
                "vector": opp.embedding.vector_data if opp.embedding else None,
            }
            for opp in existing_list
        ]

        # 2. Generate candidate embedding vector for semantic comparison
        ai_provider = get_ai_provider()
        candidate_vector = await ai_provider.generate_embedding(f"{title} {summary}")

        # 3. Execute Multi-stage Deduplication
        dedup_res = DeduplicationEngine.find_duplicate(
            candidate_title=title,
            candidate_summary=summary,
            candidate_org_id=None,
            candidate_start_date=start_dt,
            candidate_deadline=deadline_dt,
            candidate_vector=candidate_vector,
            existing_opportunities=existing_dicts
        )

        detected_changes: List[Dict[str, Any]] = []

        # ========================================================
        # CASE A: DUPLICATE FOUND -> MERGE INTO EXISTING CANONICAL
        # ========================================================
        if dedup_res.is_duplicate and dedup_res.canonical_id:
            logger.info(f"Duplicate resolved! Attaching source to canonical opp {dedup_res.canonical_id} via {dedup_res.stage}")
            canonical_opp = await db.get(Opportunity, dedup_res.canonical_id)
            if canonical_opp:
                # Attach new source reference
                existing_source_stmt = select(OpportunitySource).where(
                    OpportunitySource.opportunity_id == canonical_opp.id,
                    OpportunitySource.source_item_id == source_item_id
                )
                source_check = await db.execute(existing_source_stmt)
                if not source_check.scalars().first():
                    rel_type = "update" if data.get("possible_update") else "confirmation"
                    opp_source = OpportunitySource(
                        opportunity_id=canonical_opp.id,
                        source_item_id=source_item_id,
                        relationship_type=rel_type,
                        is_primary_source=False
                    )
                    db.add(opp_source)

                # Detect changes (e.g. deadline extension)
                raw_changes = ChangeDetector.detect_changes(canonical_opp, data, source_item_id)
                for c in raw_changes:
                    change_rec = OpportunityChange(
                        opportunity_id=canonical_opp.id,
                        field_name=c["field_name"],
                        old_value=c["old_value"],
                        new_value=c["new_value"],
                        source_item_id=source_item_id,
                        change_type=c["change_type"]
                    )
                    db.add(change_rec)
                    detected_changes.append(c)

                    # Update field on canonical event
                    if c["field_name"] == "registration_deadline" and deadline_dt:
                        canonical_opp.registration_deadline = deadline_dt
                        canonical_opp.status = "updated"
                    elif c["field_name"] == "venue":
                        canonical_opp.venue = c["new_value"]

                # Increase trust score with cross-source confirmation bonus
                canonical_opp.trust_score = min(1.0, canonical_opp.trust_score + 0.04)
                await db.commit()
                await db.refresh(canonical_opp)
                return canonical_opp, False, detected_changes

        # ========================================================
        # CASE B: NEW OPPORTUNITY -> CREATE CANONICAL EVENT
        # ========================================================
        trust_score, verif_status, life_status, needs_review = OpportunityVerifier.evaluate(
            source_trust=source_trust,
            ai_confidence=ai_confidence,
            validation_result=validation_result,
            cross_source_count=1
        )

        base_slug = slugify(title)
        unique_slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"

        # Resolve category if exists
        cat_id = None
        raw_cat = data.get("category")
        cat_name = str(raw_cat).strip() if raw_cat else "Other"
        if cat_name:
            cat_stmt = select(Category).where(Category.name.ilike(cat_name))
            cat_res = await db.execute(cat_stmt)
            cat_obj = cat_res.scalars().first()
            if cat_obj:
                cat_id = cat_obj.id

        new_opp = Opportunity(
            title=title,
            slug=unique_slug,
            summary=summary,
            description=data.get("description") or summary,
            category_id=cat_id,
            venue=data.get("venue"),
            city=data.get("city") or "Peshawar",
            country=data.get("country") or "Pakistan",
            is_online=data.get("is_online", False),
            start_date=start_dt,
            end_date=None,
            registration_deadline=deadline_dt,
            registration_url=data.get("registration_url"),
            application_url=data.get("application_url"),
            contact_email=data.get("contact_email"),
            eligibility_summary="; ".join(data.get("eligibility", [])) if data.get("eligibility") else None,
            target_audience=data.get("target_audience", []),
            status=life_status,
            trust_score=trust_score,
            ai_confidence=ai_confidence,
            verification_status=verif_status,
            flyer_url=flyer_url,
        )
        db.add(new_opp)
        await db.flush()

        # Link primary source
        opp_source = OpportunitySource(
            opportunity_id=new_opp.id,
            source_item_id=source_item_id,
            relationship_type="original",
            is_primary_source=True
        )
        db.add(opp_source)

        # Store vector embedding
        opp_embedding = OpportunityEmbedding(
            opportunity_id=new_opp.id,
            vector_data=candidate_vector,
            content_hash=f"vec-{new_opp.id[:8]}",
        )
        db.add(opp_embedding)

        # Link tags
        for tag_str in data.get("tags") or []:
            if not tag_str or not str(tag_str).strip():
                continue
            tag_slug = slugify(tag_str)
            t_stmt = select(Tag).where(Tag.slug == tag_slug)
            t_res = await db.execute(t_stmt)
            t_obj = t_res.scalars().first()
            if not t_obj:
                t_obj = Tag(name=tag_str, slug=tag_slug)
                db.add(t_obj)
                await db.flush()
            opp_tag = OpportunityTag(opportunity_id=new_opp.id, tag_id=t_obj.id)
            db.add(opp_tag)

        # If needs review, create verification queue entry
        if needs_review:
            queue_item = VerificationQueue(
                opportunity_id=new_opp.id,
                source_item_id=source_item_id,
                reason="; ".join(validation_result.warnings) if validation_result.warnings else "Low confidence extraction",
                status="pending"
            )
            db.add(queue_item)

        await db.commit()
        await db.refresh(new_opp)
        return new_opp, True, []
