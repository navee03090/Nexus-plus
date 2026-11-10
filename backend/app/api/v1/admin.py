"""
Admin Control Plane Endpoints (Section 37, 56, 57, 58, 59, 60, 63, 84).
Provides verification queue, published opportunity catalog, source administration,
live ingestion monitoring, system diagnostics, safe source testing, and audit logging.
"""
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, text
from sqlalchemy.orm import selectinload
import uuid

def is_valid_uuid(val: Any) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False

async def get_valid_admin_user_id(db: AsyncSession, admin_claims: Optional[Dict[str, Any]]) -> Optional[str]:
    if not admin_claims:
        return None
    raw_id = admin_claims.get("id")
    if not is_valid_uuid(raw_id):
        return None
    try:
        res = await db.execute(text("SELECT id FROM auth.users WHERE id = :uid"), {"uid": str(raw_id)})
        if res.scalar():
            return str(raw_id)
    except Exception:
        pass
    return None

from app.core.database import get_db
from app.core.config import settings
from app.core.security import require_admin
from app.models.opportunity import Opportunity, OpportunitySource
from app.models.category import Category
from app.models.source import Source
from app.models.source_item import SourceItem
from app.models.audit import VerificationQueue, AuditLog, IngestionRun
from app.services.ingestion import get_adapter_for_source
from app.services.opportunities.admin_editor import (
    LIVE_STATUSES,
    ReviewCorrection,
    OpportunityCorrection,
    apply_corrections,
    attach_flyer,
    load_opportunity,
    opportunity_payload,
    publish_problems,
    reject_fields,
    reload_opportunity,
    snapshot,
    write_audit,
)
from app.schemas.source import SourceCreate, SourceTestRequest

router = APIRouter(prefix="/admin", tags=["Admin Control Plane"])


async def _load_pending_review(db: AsyncSession, queue_id: str):
    if not is_valid_uuid(queue_id):
        raise HTTPException(status_code=404, detail="Queue item not found")
    q_item = await db.get(VerificationQueue, queue_id)
    if not q_item or q_item.status != "pending":
        raise HTTPException(status_code=404, detail="Queue item not found")
    if not q_item.opportunity_id or not is_valid_uuid(q_item.opportunity_id):
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return q_item, await load_opportunity(db, q_item.opportunity_id)


@router.get("/stats")
async def get_admin_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin),
):
    """Aggregated operational metrics for admin overview (Section 57)."""
    total_sources = (await db.execute(select(func.count(Source.id)))).scalar() or 0
    active_sources = (await db.execute(select(func.count(Source.id)).where(Source.is_active.is_(True)))).scalar() or 0
    failing_sources = (await db.execute(select(func.count(Source.id)).where(Source.status == "failing"))).scalar() or 0

    total_opps = (await db.execute(select(func.count(Opportunity.id)))).scalar() or 0
    published_opps = (await db.execute(select(func.count(Opportunity.id)).where(Opportunity.status.in_(["published", "updated"])))).scalar() or 0
    pending_review = (await db.execute(select(func.count(VerificationQueue.id)).where(VerificationQueue.status == "pending"))).scalar() or 0

    total_source_items = (await db.execute(select(func.count(SourceItem.id)))).scalar() or 0
    total_sources_linked = (await db.execute(select(func.count(OpportunitySource.id)))).scalar() or 0
    duplicates_resolved = max(0, total_sources_linked - total_opps)

    runs_ok = (await db.execute(select(func.count(IngestionRun.id)).where(IngestionRun.status == "success"))).scalar() or 0
    runs_all = (await db.execute(select(func.count(IngestionRun.id)))).scalar() or 0
    extraction_rate = (runs_ok / runs_all) if runs_all else 0.0

    return {
        "data": {
            "sources_monitored": total_sources,
            "active_sources": active_sources,
            "failed_sources": failing_sources,
            "opportunities_discovered": total_opps,
            "opportunities_published": published_opps,
            "pending_verification": pending_review,
            "duplicates_resolved": duplicates_resolved,
            "ai_extraction_success_rate": round(extraction_rate, 3),
            "ingestion_runs": runs_all,
            "auto_crawl": settings.ENABLE_AUTO_CRAWL,
            "system_health": "Healthy" if failing_sources == 0 else "Warning",
        }
    }


@router.get("/review")
async def list_verification_queue(
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin)
):
    """
    Returns split-screen human verification queue:
    Left: Original source announcement / flyer
    Right: Extracted structured data & AI confidence
    """
    stmt = (
        select(VerificationQueue, Opportunity, SourceItem)
        .outerjoin(Opportunity, VerificationQueue.opportunity_id == Opportunity.id)
        .outerjoin(SourceItem, VerificationQueue.source_item_id == SourceItem.id)
        .options(selectinload(Opportunity.organization), selectinload(Opportunity.category))
        .where(VerificationQueue.status == "pending")
        .order_by(desc(VerificationQueue.created_at))
    )
    res = await db.execute(stmt)
    items = []
    for q_item, opp, s_item in res.all():
        opp_data = {
            "id": opp.id if opp else q_item.opportunity_id,
            "title": opp.title if opp else (s_item.title_raw if s_item else "Opportunity Pending Verification"),
            "summary": opp.summary if opp else (s_item.body_raw[:150] if s_item and s_item.body_raw else ""),
            "description": opp.description if opp else (s_item.body_raw if s_item else ""),
            "venue": opp.venue if opp else "Main Campus",
            "city": opp.city if opp else "Peshawar",
            "registration_deadline": opp.registration_deadline if opp else None,
            "start_date": opp.start_date if opp else None,
            "registration_url": opp.registration_url if opp else (s_item.canonical_url if s_item else None),
            "eligibility_summary": opp.eligibility_summary if opp else None,
            "contact_email": opp.contact_email if opp else None,
            "is_online": bool(opp.is_online) if opp else False,
            "category_name": opp.category.name if opp and opp.category else None,
            "organization_name": opp.organization.name if opp and opp.organization else None,
            "trust_score": opp.trust_score if opp else None,
            "ai_confidence": opp.ai_confidence if opp else None,
            "verification_status": opp.verification_status if opp else "needs_review",
            "flyer_url": opp.flyer_url if opp else None,
        }

        source_data = {
            "source_item_id": s_item.id if s_item else q_item.source_item_id,
            "title_raw": s_item.title_raw if s_item else (opp.title if opp else ""),
            "body_raw": s_item.body_raw if s_item else (opp.description if opp else ""),
            "canonical_url": s_item.canonical_url if s_item else (opp.registration_url if opp else None),
            "published_at": s_item.published_at if s_item else (opp.published_at if opp else None),
        }

        items.append({
            "queue_id": q_item.id,
            "reason": q_item.reason,
            "created_at": q_item.created_at,
            "opportunity": opp_data,
            "source_evidence": source_data,
        })
    return {"data": items}


@router.patch("/review/{queue_id}")
async def update_queue_item(
    queue_id: str,
    payload: ReviewCorrection,
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin),
):
    """Save admin corrections while the item stays in the pending queue."""
    q_item, opp = await _load_pending_review(db, queue_id)
    before = snapshot(opp)
    after = await apply_corrections(db, opp, payload)
    q_admin_id = await get_valid_admin_user_id(db, admin_claims)
    if before != after:
        write_audit(db, q_admin_id, "EDIT_EVENT", opp.id, before, after)
    await db.commit()
    opp = await reload_opportunity(db, opp.id)
    return {"data": {"saved": True, "queue_id": q_item.id, "opportunity": opportunity_payload(opp)}}


@router.post("/review/{queue_id}/flyer")
async def upload_queue_flyer(
    queue_id: str,
    flyer_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin),
):
    """Store a JPEG, PNG, or WebP flyer and attach it to the pending opportunity."""
    q_item, opp = await _load_pending_review(db, queue_id)
    content_type = (flyer_file.content_type or "").split(";")[0].strip().lower()
    data = await flyer_file.read()
    q_admin_id = await get_valid_admin_user_id(db, admin_claims)
    await attach_flyer(db, opp, data, content_type, q_admin_id, prefix="review")
    await db.commit()
    return {"data": {"flyer_url": opp.flyer_url, "queue_id": q_item.id, "opportunity_id": opp.id}}


@router.post("/review/{queue_id}/approve")
async def approve_queue_item(
    queue_id: str,
    payload: Optional[ReviewCorrection] = None,
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin)
):
    """Apply the review form, then publish when the title and a deadline or apply link are real."""
    q_item, opp = await _load_pending_review(db, queue_id)
    before = snapshot(opp)
    kept_confidence = opp.ai_confidence
    after = before
    if payload is not None:
        after = await apply_corrections(db, opp, payload)

    problems = publish_problems(opp)
    q_admin_id = await get_valid_admin_user_id(db, admin_claims)
    if problems:
        if before != after:
            write_audit(db, q_admin_id, "EDIT_EVENT", opp.id, before, after)
            await db.commit()
            opp = await reload_opportunity(db, opp.id)
        reject_fields(
            "Add a real title and a deadline or apply link before publishing.",
            problems,
            opportunity_payload(opp),
        )

    opp.status = "published"
    opp.verification_status = "human_verified"
    opp.ai_confidence = kept_confidence
    opp.published_at = datetime.now(timezone.utc)
    opp.updated_at = datetime.now(timezone.utc)
    q_item.status = "approved"
    q_item.reviewed_at = datetime.now(timezone.utc)
    q_item.assigned_admin_id = q_admin_id

    published = dict(after)
    published["status"] = "published"
    published["verification_status"] = "human_verified"
    published["flyer_url"] = opp.flyer_url
    write_audit(db, q_admin_id, "APPROVE_EVENT", opp.id, before, published)
    await db.commit()
    opp = await reload_opportunity(db, opp.id)
    return {"data": {"approved": True, "opportunity_id": opp.id, "opportunity": opportunity_payload(opp)}}


@router.post("/review/{queue_id}/reject")
async def reject_queue_item(
    queue_id: str,
    payload: Optional[Dict[str, str]] = None,
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin)
):
    """Admin rejects low-quality or irrelevant announcement."""
    if not is_valid_uuid(queue_id):
        raise HTTPException(status_code=404, detail="Queue item not found")

    q_item = await db.get(VerificationQueue, queue_id)
    if not q_item:
        raise HTTPException(status_code=404, detail="Queue item not found")

    opp = None
    if q_item.opportunity_id and is_valid_uuid(q_item.opportunity_id):
        opp = await db.get(Opportunity, q_item.opportunity_id)

    if opp:
        opp.status = "rejected"
        opp.verification_status = "rejected"
        opp.updated_at = datetime.now(timezone.utc)

    q_admin_id = await get_valid_admin_user_id(db, admin_claims)
    q_item.status = "rejected"
    q_item.reviewed_at = datetime.now(timezone.utc)
    q_item.assigned_admin_id = q_admin_id
    q_item.admin_notes = payload.get("reason", "Rejected by admin") if payload else "Rejected"

    audit = AuditLog(
        admin_user_id=q_admin_id,
        action="REJECT_EVENT",
        entity_type="opportunity",
        entity_id=str(opp.id) if opp else str(queue_id)
    )
    db.add(audit)
    await db.commit()
    return {"data": {"rejected": True}}


def _list_row(opp: Opportunity) -> Dict[str, Any]:
    payload = opportunity_payload(opp)
    payload["slug"] = opp.slug
    payload["featured"] = bool(opp.featured)
    payload["published_at"] = opp.published_at.isoformat() if opp.published_at else None
    payload["updated_at"] = opp.updated_at.isoformat() if opp.updated_at else None
    return payload


@router.get("/opportunities")
async def list_admin_opportunities(
    q: Optional[str] = Query(None),
    status: str = Query("live"),
    category: Optional[str] = Query(None),
    sort: str = Query("published_at"),
    limit: int = Query(40, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin),
):
    """Paginated catalog of opportunities for the admin Published tab."""
    stmt = select(Opportunity).options(
        selectinload(Opportunity.organization),
        selectinload(Opportunity.category),
    )
    count_stmt = select(func.count(Opportunity.id))

    status_key = (status or "live").strip().lower()
    if status_key in ("live", "published"):
        status_filter = Opportunity.status.in_(LIVE_STATUSES)
    elif status_key == "unpublished":
        status_filter = Opportunity.status == "pending_review"
    elif status_key == "rejected":
        status_filter = Opportunity.status == "rejected"
    elif status_key == "expired":
        status_filter = Opportunity.status == "expired"
    elif status_key == "all":
        status_filter = None
    else:
        status_filter = Opportunity.status == status_key

    if status_filter is not None:
        stmt = stmt.where(status_filter)
        count_stmt = count_stmt.where(status_filter)

    needle = (q or "").strip()
    if needle:
        like = f"%{needle}%"
        search_filter = or_(
            Opportunity.title.ilike(like),
            Opportunity.summary.ilike(like),
            Opportunity.city.ilike(like),
            Opportunity.registration_url.ilike(like),
        )
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)

    cat_name = (category or "").strip()
    if cat_name:
        stmt = stmt.join(Category, Opportunity.category_id == Category.id).where(Category.name.ilike(cat_name))
        count_stmt = count_stmt.join(Category, Opportunity.category_id == Category.id).where(Category.name.ilike(cat_name))

    sort_key = (sort or "published_at").strip().lower()
    if sort_key == "updated_at":
        order_col = Opportunity.updated_at
    elif sort_key in ("deadline", "registration_deadline"):
        order_col = Opportunity.registration_deadline
    elif sort_key == "title":
        order_col = Opportunity.title
    else:
        order_col = Opportunity.published_at

    total = (await db.execute(count_stmt)).scalar() or 0
    live_count = (
        await db.execute(
            select(func.count(Opportunity.id)).where(Opportunity.status.in_(LIVE_STATUSES))
        )
    ).scalar() or 0

    rows = (
        await db.execute(
            stmt.order_by(desc(order_col).nullslast(), desc(Opportunity.updated_at)).offset(offset).limit(limit)
        )
    ).scalars().all()

    return {
        "data": {
            "items": [_list_row(opp) for opp in rows],
            "total": total,
            "live_count": live_count,
            "limit": limit,
            "offset": offset,
        }
    }


@router.get("/opportunities/{opportunity_id}")
async def get_admin_opportunity(
    opportunity_id: str,
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin),
):
    """Full editable opportunity plus linked source evidence when available."""
    opp = await load_opportunity(db, opportunity_id)
    source_evidence = None
    src_stmt = (
        select(OpportunitySource, SourceItem)
        .outerjoin(SourceItem, OpportunitySource.source_item_id == SourceItem.id)
        .where(OpportunitySource.opportunity_id == opp.id)
        .order_by(desc(OpportunitySource.is_primary_source), desc(OpportunitySource.created_at))
        .limit(1)
    )
    pair = (await db.execute(src_stmt)).first()
    if pair:
        link, s_item = pair
        if s_item:
            source_evidence = {
                "source_item_id": s_item.id,
                "title_raw": s_item.title_raw,
                "body_raw": s_item.body_raw,
                "canonical_url": s_item.canonical_url,
                "published_at": s_item.published_at,
                "relationship_type": link.relationship_type,
            }
    return {"data": {"opportunity": _list_row(opp), "source_evidence": source_evidence}}


@router.patch("/opportunities/{opportunity_id}")
async def update_admin_opportunity(
    opportunity_id: str,
    payload: OpportunityCorrection,
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin),
):
    """Edit a live or unpublished opportunity; public listings update immediately."""
    opp = await load_opportunity(db, opportunity_id)
    before = snapshot(opp)
    after = await apply_corrections(db, opp, payload)
    admin_id = await get_valid_admin_user_id(db, admin_claims)
    if before != after:
        write_audit(db, admin_id, "EDIT_EVENT", opp.id, before, after)
    await db.commit()
    opp = await reload_opportunity(db, opp.id)
    return {"data": {"saved": True, "opportunity": _list_row(opp)}}


@router.post("/opportunities/{opportunity_id}/flyer")
async def upload_admin_opportunity_flyer(
    opportunity_id: str,
    flyer_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin),
):
    """Attach or replace the flyer for a catalog opportunity."""
    opp = await load_opportunity(db, opportunity_id)
    content_type = (flyer_file.content_type or "").split(";")[0].strip().lower()
    data = await flyer_file.read()
    admin_id = await get_valid_admin_user_id(db, admin_claims)
    await attach_flyer(db, opp, data, content_type, admin_id, prefix="catalog")
    await db.commit()
    return {"data": {"flyer_url": opp.flyer_url, "opportunity_id": opp.id}}


@router.post("/opportunities/{opportunity_id}/unpublish")
async def unpublish_admin_opportunity(
    opportunity_id: str,
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin),
):
    """Hide from the public portal while keeping the row for later republish."""
    opp = await load_opportunity(db, opportunity_id)
    before = snapshot(opp)
    opp.status = "pending_review"
    opp.updated_at = datetime.now(timezone.utc)
    after = snapshot(opp)
    admin_id = await get_valid_admin_user_id(db, admin_claims)
    write_audit(db, admin_id, "UNPUBLISH_EVENT", opp.id, before, after)
    await db.commit()
    opp = await reload_opportunity(db, opp.id)
    return {"data": {"unpublished": True, "opportunity": _list_row(opp)}}


@router.post("/opportunities/{opportunity_id}/reject")
async def reject_admin_opportunity(
    opportunity_id: str,
    payload: Optional[Dict[str, str]] = None,
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin),
):
    """Soft-delete: leave the public site and mark rejected."""
    opp = await load_opportunity(db, opportunity_id)
    before = snapshot(opp)
    opp.status = "rejected"
    opp.verification_status = "rejected"
    opp.featured = False
    opp.updated_at = datetime.now(timezone.utc)
    after = snapshot(opp)
    if payload and payload.get("reason"):
        after["admin_note"] = payload["reason"]
    admin_id = await get_valid_admin_user_id(db, admin_claims)
    write_audit(db, admin_id, "REJECT_EVENT", opp.id, before, after)
    await db.commit()
    opp = await reload_opportunity(db, opp.id)
    return {"data": {"rejected": True, "opportunity": _list_row(opp)}}


@router.post("/opportunities/{opportunity_id}/expire")
async def expire_admin_opportunity(
    opportunity_id: str,
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin),
):
    """Mark a past opportunity as expired so it leaves live listings."""
    opp = await load_opportunity(db, opportunity_id)
    before = snapshot(opp)
    opp.status = "expired"
    opp.featured = False
    opp.updated_at = datetime.now(timezone.utc)
    after = snapshot(opp)
    admin_id = await get_valid_admin_user_id(db, admin_claims)
    write_audit(db, admin_id, "EXPIRE_EVENT", opp.id, before, after)
    await db.commit()
    opp = await reload_opportunity(db, opp.id)
    return {"data": {"expired": True, "opportunity": _list_row(opp)}}


@router.post("/opportunities/{opportunity_id}/publish")
async def publish_admin_opportunity(
    opportunity_id: str,
    payload: Optional[OpportunityCorrection] = None,
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin),
):
    """Republish an unpublished or updated opportunity when publish rules pass."""
    opp = await load_opportunity(db, opportunity_id)
    before = snapshot(opp)
    after = before
    if payload is not None:
        after = await apply_corrections(db, opp, payload)

    problems = publish_problems(opp)
    admin_id = await get_valid_admin_user_id(db, admin_claims)
    if problems:
        if before != after:
            write_audit(db, admin_id, "EDIT_EVENT", opp.id, before, after)
            await db.commit()
            opp = await reload_opportunity(db, opp.id)
        reject_fields(
            "Add a real title and a deadline or apply link before publishing.",
            problems,
            opportunity_payload(opp),
        )

    opp.status = "published"
    opp.verification_status = "human_verified"
    opp.published_at = opp.published_at or datetime.now(timezone.utc)
    opp.updated_at = datetime.now(timezone.utc)
    published = dict(after)
    published["status"] = "published"
    published["verification_status"] = "human_verified"
    write_audit(db, admin_id, "PUBLISH_EVENT", opp.id, before, published)
    await db.commit()
    opp = await reload_opportunity(db, opp.id)
    return {"data": {"published": True, "opportunity": _list_row(opp)}}


def _serialize_source(s: Source) -> Dict[str, Any]:
    return {
        "id": s.id,
        "name": s.name,
        "source_type": s.source_type,
        "platform": s.platform,
        "url": s.url,
        "parser_key": s.parser_key,
        "crawl_frequency": s.crawl_frequency,
        "trust_score": s.trust_score,
        "status": s.status,
        "is_active": s.is_active,
        "consecutive_failures": s.consecutive_failures,
        "last_checked_at": s.last_checked_at,
        "last_success_at": s.last_success_at,
        "last_failure_at": s.last_failure_at,
    }


@router.get("/sources")
async def list_admin_sources(
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin)
):
    """Lists all monitored sources with operational stats for admin control plane."""
    stmt = select(Source).order_by(desc(Source.trust_score))
    res = await db.execute(stmt)
    return {"data": [_serialize_source(s) for s in res.scalars().all()]}


@router.post("/sources")
async def create_source(
    payload: SourceCreate,
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin)
):
    """Registers a new monitored channel."""
    source = Source(**payload.model_dump())
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return {"data": source}


@router.post("/sources/test")
async def test_source_ingestion(
    payload: SourceTestRequest,
    admin_claims: Dict[str, Any] = Depends(require_admin)
):
    """Safe test ingestion for admin verification (Section 84)."""
    t0 = time.time()
    adapter = get_adapter_for_source(
        source_id="test-source",
        source_type=payload.source_type,
        source_url=payload.url,
        parser_key=payload.parser_key
    )
    test_result = await adapter.test_connection()
    elapsed_ms = (time.time() - t0) * 1000.0

    return {
        "data": {
            "status_code": test_result.get("status_code", 200),
            "is_reachable": test_result.get("is_reachable", True),
            "content_length": test_result.get("content_length", 0),
            "discovered_items": test_result.get("items_count", len(test_result.get("sample_titles", []))),
            "sample_titles": test_result.get("sample_titles", []),
            "sample_images": test_result.get("sample_images", []),
            "execution_time_ms": round(elapsed_ms, 2),
            "warnings": [test_result.get("error")] if test_result.get("error") else [],
        }
    }


@router.post("/sources/{source_id}/crawl")
async def trigger_source_crawl(
    source_id: str,
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin)
):
    """Dispatches on-demand crawl task for a source."""
    source = None
    is_uuid = is_valid_uuid(source_id)
    if is_uuid:
        source = await db.get(Source, source_id)

    if not source:
        alias_map = {
            "src-02": "kpitb",
            "src-uet-01": "uet",
            "src-nccs-01": "nccs",
            "src-soc-01": "kpitb",
            "src-soc-02": "nic",
            "src-soc-03": "nic",
            "src-04": "giki",
            "src-05": "hec",
            "src-06": "fast",
        }
        clean_key = alias_map.get(source_id, source_id.replace("src-", "").replace("-01", "").replace("-web", ""))
        conditions = [
            (Source.parser_key.contains(clean_key)),
            (Source.name.ilike(f"%{clean_key}%")),
            (Source.url.ilike(f"%{clean_key}%"))
        ]
        if is_uuid:
            conditions.append(Source.id == source_id)
        stmt = select(Source).where(or_(*conditions))
        source = (await db.execute(stmt)).scalars().first()

    if not source:
        raise HTTPException(status_code=404, detail=f"Source '{source_id}' not found")

    from app.tasks.ingestion import execute_source_crawl
    try:
        res = await execute_source_crawl(str(source.id), db=db)
        return {"data": res}
    except Exception as e:
        return {"data": {"source_id": str(source.id), "status": "failed", "error": str(e)}}


@router.get("/ingestion/runs")
@router.get("/ingestions")
async def list_ingestion_runs(
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin)
):
    stmt = (
        select(IngestionRun, Source.name)
        .outerjoin(Source, IngestionRun.source_id == Source.id)
        .order_by(desc(IngestionRun.started_at))
        .limit(50)
    )
    res = await db.execute(stmt)
    rows = []
    for run, source_name in res.all():
        started = run.started_at
        completed = run.completed_at
        duration_s = None
        if started and completed:
            duration_s = round((completed - started).total_seconds(), 1)
        rows.append({
            "id": run.id,
            "source_id": run.source_id,
            "source": source_name or "Unknown source",
            "status": run.status,
            "items_found": run.items_found,
            "items_processed": run.items_processed,
            "items_duplicated": run.items_duplicated,
            "items_rejected": run.items_rejected,
            "error_message": run.error_message,
            "started_at": started,
            "completed_at": completed,
            "duration_seconds": duration_s,
        })
    return {"data": rows}


@router.get("/audit-logs")
@router.get("/audit")
async def list_audit_logs(
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin)
):
    stmt = select(AuditLog).order_by(desc(AuditLog.created_at)).limit(50)
    res = await db.execute(stmt)
    logs = []
    for log in res.scalars().all():
        logs.append({
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "admin_user_id": log.admin_user_id,
            "after_state": log.after_state,
            "created_at": log.created_at,
        })
    return {"data": logs}
