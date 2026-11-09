"""Shared admin opportunity edit helpers for verification queue and published catalog."""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import dateutil.parser
from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit import AuditLog
from app.models.category import Category
from app.models.opportunity import Opportunity
from app.models.organization import Organization
from app.services.opportunities.resolver import slugify
from app.services.storage import store_flyer_image

WEAK_TITLE = re.compile(r"notice board|untitled", re.IGNORECASE)
FLYER_MAX_BYTES = 5 * 1024 * 1024
LIVE_STATUSES = ("published", "updated")

# Editorial word caps for admin/curator text fields.
WORD_LIMITS = {
    "title": 25,
    "summary": 60,
    "description": 500,
    "eligibility_summary": 120,
    "admin_note": 80,
}


class OpportunityCorrection(BaseModel):
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
    featured: Optional[bool] = None
    admin_note: Optional[str] = None


# Backward-compatible alias used by the verification queue endpoints.
ReviewCorrection = OpportunityCorrection


def reject_fields(message: str, fields: list[str], opportunity: Optional[dict] = None) -> None:
    detail: Dict[str, Any] = {"message": message, "fields": fields}
    if opportunity is not None:
        detail["opportunity"] = opportunity
    raise HTTPException(status_code=422, detail=detail)


def blank(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def word_count(value: Optional[str]) -> int:
    text = (value or "").strip()
    if not text:
        return 0
    return len(re.findall(r"\S+", text))


def enforce_word_limit(field: str, value: Optional[str]) -> None:
    limit = WORD_LIMITS.get(field)
    if not limit:
        return
    count = word_count(value)
    if count > limit:
        reject_fields(
            f"{field.replace('_', ' ').title()} must be {limit} words or fewer (now {count}).",
            [field],
        )


def parse_optional_dt(value: Optional[str], field: str) -> Optional[datetime]:
    text = blank(value)
    if not text:
        return None
    try:
        parsed = dateutil.parser.parse(text)
    except (ValueError, TypeError, OverflowError):
        reject_fields("Use a real date.", [field])
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def snapshot(opp: Opportunity) -> Dict[str, Any]:
    return {
        "title": opp.title,
        "summary": opp.summary,
        "description": opp.description,
        "category_name": opp.category.name if opp.category else None,
        "organization_name": opp.organization.name if opp.organization else None,
        "city": opp.city,
        "venue": opp.venue,
        "is_online": bool(opp.is_online),
        "start_date": iso(opp.start_date),
        "registration_deadline": iso(opp.registration_deadline),
        "registration_url": opp.registration_url,
        "eligibility_summary": opp.eligibility_summary,
        "contact_email": opp.contact_email,
        "flyer_url": opp.flyer_url,
        "featured": bool(opp.featured),
        "status": opp.status,
        "verification_status": opp.verification_status,
        "slug": opp.slug,
        "published_at": iso(opp.published_at),
        "updated_at": iso(opp.updated_at),
    }


def opportunity_payload(opp: Opportunity) -> Dict[str, Any]:
    snap = snapshot(opp)
    snap["id"] = opp.id
    snap["ai_confidence"] = opp.ai_confidence
    snap["trust_score"] = opp.trust_score
    return snap


def title_is_real(title: Optional[str]) -> bool:
    text = (title or "").strip()
    if len(text) < 8:
        return False
    if WEAK_TITLE.search(text):
        return False
    return True


def publish_problems(opp: Opportunity) -> list[str]:
    fields: list[str] = []
    if not title_is_real(opp.title):
        fields.append("title")
    link = (opp.registration_url or opp.application_url or "").strip()
    if not opp.registration_deadline and not link:
        fields.extend(["registration_deadline", "registration_url"])
    return fields


def image_extension(content_type: str, data: bytes) -> Optional[str]:
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


async def unique_slug(db: AsyncSession, title: str) -> str:
    base = slugify(title)[:110]
    for _ in range(5):
        candidate = f"{base}-{uuid.uuid4().hex[:6]}"
        exists = (await db.execute(select(Opportunity.id).where(Opportunity.slug == candidate))).scalar()
        if not exists:
            return candidate
    return f"{base}-{uuid.uuid4().hex}"


async def reload_opportunity(db: AsyncSession, opportunity_id: str) -> Opportunity:
    stmt = (
        select(Opportunity)
        .where(Opportunity.id == opportunity_id)
        .options(selectinload(Opportunity.organization), selectinload(Opportunity.category))
    )
    return (await db.execute(stmt)).scalar_one()


async def load_opportunity(db: AsyncSession, opportunity_id: str) -> Opportunity:
    if not opportunity_id:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    try:
        uuid.UUID(str(opportunity_id))
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(status_code=404, detail="Opportunity not found")
    stmt = (
        select(Opportunity)
        .where(Opportunity.id == opportunity_id)
        .options(selectinload(Opportunity.organization), selectinload(Opportunity.category))
    )
    opp = (await db.execute(stmt)).scalar_one_or_none()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opp


async def apply_corrections(
    db: AsyncSession,
    opp: Opportunity,
    payload: OpportunityCorrection,
) -> Dict[str, Any]:
    data = payload.model_dump(exclude_unset=True)
    admin_note = blank(data.pop("admin_note", None)) if "admin_note" in data else None
    after = snapshot(opp)
    if admin_note:
        after["admin_note"] = admin_note
    if not data and not admin_note:
        return after

    if "title" in data:
        title = (data["title"] or "").strip()
        if not title:
            reject_fields("Title cannot be empty.", ["title"])
        if len(title) > 500:
            reject_fields("Title is too long.", ["title"])
        enforce_word_limit("title", title)
        if title != opp.title:
            opp.slug = await unique_slug(db, title)
        opp.title = title
        after["title"] = title
        after["slug"] = opp.slug

    if "summary" in data:
        summary = (data["summary"] or "").strip()
        enforce_word_limit("summary", summary)
        opp.summary = summary
        after["summary"] = summary

    if "description" in data:
        description = (data["description"] or "").strip()
        enforce_word_limit("description", description)
        opp.description = description
        after["description"] = description

    if "category_name" in data:
        name = blank(data["category_name"])
        if not name:
            opp.category_id = None
            after["category_name"] = None
        else:
            cat = (await db.execute(select(Category).where(Category.name.ilike(name)))).scalars().first()
            if cat is None:
                reject_fields("Pick a category from the list.", ["category_name"])
                return after
            opp.category_id = cat.id
            after["category_name"] = cat.name

    if "organization_name" in data:
        name = blank(data["organization_name"])
        if not name:
            opp.organization_id = None
            after["organization_name"] = None
        else:
            if len(name) > 255:
                reject_fields("Organization name is too long.", ["organization_name"])
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
        city = blank(data["city"])
        if city and len(city) > 100:
            reject_fields("City is too long.", ["city"])
        opp.city = city
        after["city"] = city

    if "venue" in data:
        venue = blank(data["venue"])
        if venue and len(venue) > 500:
            reject_fields("Venue is too long.", ["venue"])
        opp.venue = venue
        after["venue"] = venue

    if "is_online" in data:
        opp.is_online = bool(data["is_online"])
        after["is_online"] = opp.is_online

    if "start_date" in data:
        opp.start_date = parse_optional_dt(data["start_date"], "start_date")
        after["start_date"] = iso(opp.start_date)

    if "registration_deadline" in data:
        opp.registration_deadline = parse_optional_dt(data["registration_deadline"], "registration_deadline")
        after["registration_deadline"] = iso(opp.registration_deadline)

    if "registration_url" in data:
        url = blank(data["registration_url"])
        if url and not url.lower().startswith(("http://", "https://")):
            reject_fields("Apply link must start with http:// or https://.", ["registration_url"])
        if url and len(url) > 2048:
            reject_fields("Apply link is too long.", ["registration_url"])
        opp.registration_url = url
        after["registration_url"] = url

    if "eligibility_summary" in data:
        eligibility = blank(data["eligibility_summary"])
        enforce_word_limit("eligibility_summary", eligibility)
        opp.eligibility_summary = eligibility
        after["eligibility_summary"] = eligibility

    if "contact_email" in data:
        email = blank(data["contact_email"])
        if email and ("@" not in email or len(email) > 255):
            reject_fields("Enter a valid contact email.", ["contact_email"])
        opp.contact_email = email
        after["contact_email"] = email

    if "featured" in data:
        opp.featured = bool(data["featured"])
        after["featured"] = opp.featured

    if admin_note:
        enforce_word_limit("admin_note", admin_note)

    opp.updated_at = datetime.now(timezone.utc)
    after["updated_at"] = iso(opp.updated_at)
    return after


def write_audit(
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


async def attach_flyer(
    db: AsyncSession,
    opp: Opportunity,
    data: bytes,
    content_type: str,
    admin_id: Optional[str],
    prefix: str = "admin",
) -> Dict[str, Any]:
    if len(data) > FLYER_MAX_BYTES:
        reject_fields("Image must be under 5 MB.", ["flyer"])
    ext = image_extension(content_type, data)
    if not data or not ext:
        reject_fields("Use a JPEG, PNG, or WebP image.", ["flyer"])

    before = snapshot(opp)
    opp.flyer_url = await store_flyer_image(data, content_type, ext, prefix=prefix)
    opp.updated_at = datetime.now(timezone.utc)
    after = snapshot(opp)
    after["flyer_url"] = opp.flyer_url
    write_audit(db, admin_id, "EDIT_EVENT", opp.id, before, after)
    return after
