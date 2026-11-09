"""
Admin Control Plane Endpoints (Section 37, 56, 57, 58, 59, 60, 63, 84).
Provides verification queue, source administration, live ingestion monitoring,
system diagnostics, safe source testing, and administrative audit logging.
"""
import re
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, text
from sqlalchemy.orm import selectinload
import dateutil.parser
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
from app.models.organization import Organization
from app.models.source import Source
from app.models.source_item import SourceItem
from app.models.audit import VerificationQueue, AuditLog, IngestionRun
from app.services.ingestion import get_adapter_for_source
from app.services.opportunities.resolver import slugify
from app.services.storage import store_flyer_image
from app.schemas.source import SourceCreate, SourceTestRequest

router = APIRouter(prefix="/admin", tags=["Admin Control Plane"])

WEAK_TITLE = re.compile(r"notice board|untitled", re.IGNORECASE)
FLYER_MAX_BYTES = 5 * 1024 * 1024


class ReviewCorrection(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    category_name: Optional[str] = None
    organization_name: Optional[str] = None
    city: Optional[str] = None
    venue: Optional[str] = None
    is_online: Optional[bool] = None
    start_date: Optional[str] = None
    registration_deadline: Optional[str] = None
    registration_url: Optional[str] = None
    eligibility_summary: Optional[str] = None
    contact_email: Optional[str] = None


def _reject_fields(message: str, fields: list[str], opportunity: Optional[dict] = None) -> None:
    detail: Dict[str, Any] = {"message": message, "fields": fields}
    if opportunity is not None:
        detail["opportunity"] = opportunity
    raise HTTPException(status_code=422, detail=detail)


def _blank(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _parse_optional_dt(value: Optional[str], field: str) -> Optional[datetime]:
    text = _blank(value)
    if not text:
        return None
    try:
        parsed = dateutil.parser.parse(text)
    except (ValueError, TypeError, OverflowError):
        _reject_fields("Use a real date.", [field])
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _snapshot(opp: Opportunity) -> Dict[str, Any]:
    return {
        "title": opp.title,
        "summary": opp.summary,
        "description": opp.description,
        "category_name": opp.category.name if opp.category else None,
        "organization_name": opp.organization.name if opp.organization else None,
        "city": opp.city,
        "venue": opp.venue,
        "is_online": bool(opp.is_online),
        "start_date": _iso(opp.start_date),
        "registration_deadline": _iso(opp.registration_deadline),
        "registration_url": opp.registration_url,
        "eligibility_summary": opp.eligibility_summary,
        "contact_email": opp.contact_email,
        "flyer_url": opp.flyer_url,
        "status": opp.status,
        "verification_status": opp.verification_status,
    }


def _opportunity_payload(opp: Opportunity) -> Dict[str, Any]:
    snap = _snapshot(opp)
    snap["id"] = opp.id
    snap["ai_confidence"] = opp.ai_confidence
    snap["trust_score"] = opp.trust_score
    return snap


def _title_is_real(title: Optional[str]) -> bool:
    text = (title or "").strip()
    if len(text) < 8:
        return False
    if WEAK_TITLE.search(text):
        return False
    return True


def _publish_problems(opp: Opportunity) -> list[str]:
    fields: list[str] = []
    if not _title_is_real(opp.title):
        fields.append("title")
    link = (opp.registration_url or opp.application_url or "").strip()
    if not opp.registration_deadline and not link:
        fields.extend(["registration_deadline", "registration_url"])
    return fields


def _image_extension(content_type: str, data: bytes) -> Optional[str]:
    kind = None
    if data.startswith(b"\xff\xd8\xff"):
        kind = ".jpg"
    elif data.startswith(b"\x89PNG\r\n\x1a\n"):
        kind = ".png"
    elif len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        kind = ".webp"
    if not kind:
        return None
    allowed = {
        ".jpg": {"image/jpeg", "image/jpg", "image/pjpeg"},
        ".png": {"image/png"},
        ".webp": {"image/webp"},
    }
    if content_type not in allowed[kind]:
        return None
    return kind


async def _unique_slug(db: AsyncSession, title: str) -> str:
    base = slugify(title)[:110]
    for _ in range(5):
        candidate = f"{base}-{uuid.uuid4().hex[:6]}"
        exists = (await db.execute(select(Opportunity.id).where(Opportunity.slug == candidate))).scalar()
        if not exists:
            return candidate
    return f"{base}-{uuid.uuid4().hex}"


async def _load_pending_review(db: AsyncSession, queue_id: str):
    if not is_valid_uuid(queue_id):
        raise HTTPException(status_code=404, detail="Queue item not found")
    q_item = await db.get(VerificationQueue, queue_id)
    if not q_item or q_item.status != "pending":
        raise HTTPException(status_code=404, detail="Queue item not found")
    if not q_item.opportunity_id or not is_valid_uuid(q_item.opportunity_id):
        raise HTTPException(status_code=404, detail="Opportunity not found")
    stmt = (
        select(Opportunity)
        .where(Opportunity.id == q_item.opportunity_id)
        .options(selectinload(Opportunity.organization), selectinload(Opportunity.category))
    )
    opp = (await db.execute(stmt)).scalar_one_or_none()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return q_item, opp


async def _reload_opportunity(db: AsyncSession, opportunity_id: str) -> Opportunity:
    stmt = (
        select(Opportunity)
        .where(Opportunity.id == opportunity_id)
        .options(selectinload(Opportunity.organization), selectinload(Opportunity.category))
    )
    return (await db.execute(stmt)).scalar_one()


async def _apply_corrections(db: AsyncSession, opp: Opportunity, payload: ReviewCorrection) -> Dict[str, Any]:
    data = payload.model_dump(exclude_unset=True)
    after = _snapshot(opp)
    if not data:
        return after

    if "title" in data:
        title = (data["title"] or "").strip()
        if not title:
            _reject_fields("Title cannot be empty.", ["title"])
        if len(title) > 500:
            _reject_fields("Title is too long.", ["title"])
        if title != opp.title:
            opp.slug = await _unique_slug(db, title)
        opp.title = title
        after["title"] = title

    if "summary" in data:
        summary = (data["summary"] or "").strip()
        opp.summary = summary
        after["summary"] = summary

    if "description" in data:
        description = (data["description"] or "").strip()
        opp.description = description
        after["description"] = description

    if "category_name" in data:
        name = _blank(data["category_name"])
        if not name:
            opp.category_id = None
            after["category_name"] = None
        else:
            cat = (await db.execute(select(Category).where(Category.name.ilike(name)))).scalars().first()
            if cat is None:
                _reject_fields("Pick a category from the list.", ["category_name"])
                return after
            opp.category_id = cat.id
            after["category_name"] = cat.name

    if "organization_name" in data:
        name = _blank(data["organization_name"])
        if not name:
            opp.organization_id = None
            after["organization_name"] = None
        else:
            if len(name) > 255:
                _reject_fields("Organization name is too long.", ["organization_name"])
            org = (await db.execute(select(Organization).where(Organization.name.ilike(name)))).scalars().first()
            if not org:
                org = Organization(
                    name=name,
                    slug=f"{slugify(name)[:110]}-{uuid.uuid4().hex[:6]}",
                    organization_type="Other",
                )
                db.add(org)
                await db.flush()
            opp.organization_id = org.id
            after["organization_name"] = org.name

    if "city" in data:
        city = _blank(data["city"])
        if city and len(city) > 100:
            _reject_fields("City is too long.", ["city"])
        opp.city = city
        after["city"] = city

    if "venue" in data:
        venue = _blank(data["venue"])
        if venue and len(venue) > 500:
            _reject_fields("Venue is too long.", ["venue"])
        opp.venue = venue
        after["venue"] = venue

    if "is_online" in data:
        opp.is_online = bool(data["is_online"])
        after["is_online"] = opp.is_online

    if "start_date" in data:
        opp.start_date = _parse_optional_dt(data["start_date"], "start_date")
        after["start_date"] = _iso(opp.start_date)

    if "registration_deadline" in data:
        opp.registration_deadline = _parse_optional_dt(data["registration_deadline"], "registration_deadline")
        after["registration_deadline"] = _iso(opp.registration_deadline)

    if "registration_url" in data:
        url = _blank(data["registration_url"])
        if url and not url.lower().startswith(("http://", "https://")):
            _reject_fields("Apply link must start with http:// or https://.", ["registration_url"])
        if url and len(url) > 2048:
            _reject_fields("Apply link is too long.", ["registration_url"])
        opp.registration_url = url
        after["registration_url"] = url

    if "eligibility_summary" in data:
        eligibility = _blank(data["eligibility_summary"])
        opp.eligibility_summary = eligibility
        after["eligibility_summary"] = eligibility

    if "contact_email" in data:
        email = _blank(data["contact_email"])
        if email and ("@" not in email or len(email) > 255):
            _reject_fields("Enter a valid contact email.", ["contact_email"])
        opp.contact_email = email
        after["contact_email"] = email

    opp.updated_at = datetime.now(timezone.utc)
    return after


def _write_audit(
    db: AsyncSession,
    admin_id: Optional[str],
    action: str,
    entity_id: str,
    before_state: Dict[str, Any],
    after_state: Dict[str, Any],
) -> None:
    db.add(AuditLog(
        admin_user_id=admin_id,
        action=action,
        entity_type="opportunity",
        entity_id=str(entity_id),
        before_state=before_state,
        after_state=after_state,
    ))


@router.get("/stats")
async def get_admin_dashboard_stats(
    db: AsyncSession = Depends(get_db),
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
    before = _snapshot(opp)
    after = await _apply_corrections(db, opp, payload)
    q_admin_id = await get_valid_admin_user_id(db, admin_claims)
    if before != after:
        _write_audit(db, q_admin_id, "EDIT_EVENT", opp.id, before, after)
    await db.commit()
    opp = await _reload_opportunity(db, opp.id)
    return {"data": {"saved": True, "queue_id": q_item.id, "opportunity": _opportunity_payload(opp)}}


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
    if len(data) > FLYER_MAX_BYTES:
        _reject_fields("Image must be under 5 MB.", ["flyer"])
    ext = _image_extension(content_type, data)
    if not data or not ext:
        _reject_fields("Use a JPEG, PNG, or WebP image.", ["flyer"])

    before = _snapshot(opp)
    opp.flyer_url = await store_flyer_image(data, content_type, ext, prefix="review")
    opp.updated_at = datetime.now(timezone.utc)
    after = _snapshot(opp)
    after["flyer_url"] = opp.flyer_url
    q_admin_id = await get_valid_admin_user_id(db, admin_claims)
    _write_audit(db, q_admin_id, "EDIT_EVENT", opp.id, before, after)
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
    before = _snapshot(opp)
    kept_confidence = opp.ai_confidence
    after = before
    if payload is not None:
        after = await _apply_corrections(db, opp, payload)

    problems = _publish_problems(opp)
    q_admin_id = await get_valid_admin_user_id(db, admin_claims)
    if problems:
        if before != after:
            _write_audit(db, q_admin_id, "EDIT_EVENT", opp.id, before, after)
            await db.commit()
            opp = await _reload_opportunity(db, opp.id)
        _reject_fields(
            "Add a real title and a deadline or apply link before publishing.",
            problems,
            _opportunity_payload(opp),
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
    _write_audit(db, q_admin_id, "APPROVE_EVENT", opp.id, before, published)
    await db.commit()
    opp = await _reload_opportunity(db, opp.id)
    return {"data": {"approved": True, "opportunity_id": opp.id, "opportunity": _opportunity_payload(opp)}}


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
