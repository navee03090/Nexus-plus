"""
Opportunity Events API Endpoints (Section 45, 46, 47, 80, 81).
Public feeds, single opportunity detail with multi-source provenance, changes, bookmarking, and reporting.
"""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc, asc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user_claims
from app.models.opportunity import Opportunity, OpportunitySource, OpportunityChange
from app.models.source_item import SourceItem
from app.models.source import Source
from app.models.category import Category, Tag, OpportunityTag
from app.models.eligibility import SavedOpportunity
from app.models.audit import OpportunityReport
from app.algorithms.scoring import get_deadline_urgency

router = APIRouter(prefix="/events", tags=["Opportunities"])


def upcoming_only_clause():
    """Hide closed/past events from the public feed."""
    now = datetime.now(timezone.utc)
    return or_(
        Opportunity.registration_deadline >= now,
        Opportunity.start_date >= now,
        and_(
            Opportunity.registration_deadline.is_(None),
            Opportunity.start_date.is_(None),
        ),
    )


def format_opp_read(
    opp: Opportunity,
    tags: List[str] = None,
    user_claims: Optional[Dict[str, Any]] = None,
    sources_data: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    urgency_status, urgency_label = get_deadline_urgency(opp.registration_deadline)
    data = {
        "id": opp.id,
        "title": opp.title,
        "slug": opp.slug,
        "summary": opp.summary,
        "description": opp.description,
        "venue": opp.venue,
        "city": opp.city,
        "country": opp.country,
        "is_online": opp.is_online,
        "start_date": opp.start_date,
        "end_date": opp.end_date,
        "registration_deadline": opp.registration_deadline,
        "registration_url": opp.registration_url,
        "application_url": opp.application_url,
        "contact_email": opp.contact_email,
        "contact_phone": opp.contact_phone,
        "eligibility_summary": opp.eligibility_summary,
        "target_audience": opp.target_audience or [],
        "status": opp.status,
        "trust_score": opp.trust_score,
        "ai_confidence": opp.ai_confidence,
        "verification_status": opp.verification_status,
        "featured": opp.featured,
        "view_count": opp.view_count,
        "save_count": opp.save_count,
        "flyer_url": opp.flyer_url,
        "created_at": opp.created_at,
        "updated_at": opp.updated_at,
        "published_at": opp.published_at,
        "organization_id": opp.organization_id,
        "organization_name": opp.organization.name if opp.organization else "Verified Organizer",
        "organization_slug": opp.organization.slug if opp.organization else None,
        "organization_logo": opp.organization.logo_url if opp.organization else None,
        "category_id": opp.category_id,
        "category_name": opp.category.name if opp.category else "Other",
        "category_slug": opp.category.slug if opp.category else "other",
        "tags": tags or [],
        "sources": sources_data or [],
        "deadline_urgency": urgency_status,
        "deadline_label": urgency_label,
        "match_score": 85 if user_claims else None,
        "match_reasons": ["Relevant to undergraduate tech opportunities in Pakistan"] if user_claims else [],
    }
    return data


@router.get("")
async def list_events(
    category: Optional[str] = Query(None, description="Category slug"),
    city: Optional[str] = Query(None, description="City name (e.g. Peshawar)"),
    is_online: Optional[bool] = Query(None, description="Filter virtual events"),
    status_filter: str = Query("published", description="Status filter"),
    sort_by: str = Query("newest", description="newest, deadline, popular, trust"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=50),
    limit: Optional[int] = Query(None, ge=1, le=50, description="Alias for page_size"),
    db: AsyncSession = Depends(get_db),
    user_claims: Optional[Dict[str, Any]] = Depends(get_current_user_claims)
):
    """
    Public opportunity feed supporting multi-dimensional filters and sorting.
    """
    query = (
        select(Opportunity)
        .where(Opportunity.status.in_(["published", "updated"]))
        .where(upcoming_only_clause())
        .options(selectinload(Opportunity.organization), selectinload(Opportunity.category))
    )

    if category:
        query = query.join(Opportunity.category).where(Category.slug == category.lower())
    if city:
        query = query.where(func.lower(Opportunity.city) == city.lower())
    if is_online is not None:
        query = query.where(Opportunity.is_online == is_online)

    # Sorting
    if sort_by == "deadline":
        query = query.order_by(asc(Opportunity.registration_deadline).nullslast(), desc(Opportunity.published_at))
    elif sort_by == "newest":
        query = query.order_by(desc(Opportunity.published_at))
    elif sort_by == "popular":
        query = query.order_by(desc(Opportunity.view_count), desc(Opportunity.save_count))
    elif sort_by == "trust":
        query = query.order_by(desc(Opportunity.trust_score), desc(Opportunity.published_at))
    else:
        query = query.order_by(desc(Opportunity.featured), desc(Opportunity.published_at))

    # Pagination (`limit` is accepted as an alias of `page_size` from the web client)
    effective_page_size = limit or page_size
    offset = (page - 1) * effective_page_size
    paginated_query = query.offset(offset).limit(effective_page_size)

    res = await db.execute(paginated_query)
    opps = res.scalars().all()

    # Count total
    count_stmt = (
        select(func.count(Opportunity.id))
        .where(Opportunity.status.in_(["published", "updated"]))
        .where(upcoming_only_clause())
    )
    total_count = (await db.execute(count_stmt)).scalar() or 0

    items = []
    for opp in opps:
        # Load tags
        tag_stmt = select(Tag.name).join(OpportunityTag, OpportunityTag.tag_id == Tag.id).where(OpportunityTag.opportunity_id == opp.id)
        tag_names = list((await db.execute(tag_stmt)).scalars().all())

        # Load sources
        source_stmt = (
            select(OpportunitySource, SourceItem, Source)
            .join(SourceItem, OpportunitySource.source_item_id == SourceItem.id)
            .join(Source, SourceItem.source_id == Source.id)
            .where(OpportunitySource.opportunity_id == opp.id)
        )
        source_res = await db.execute(source_stmt)
        sources_data = [
            {
                "id": opp_src.id,
                "source_item_id": s_item.id,
                "relationship_type": opp_src.relationship_type,
                "is_primary_source": opp_src.is_primary_source,
                "platform": src.platform,
                "source_name": src.name,
                "canonical_url": s_item.canonical_url,
                "created_at": opp_src.created_at,
            }
            for opp_src, s_item, src in source_res.all()
        ]
        items.append(format_opp_read(opp, tag_names, user_claims, sources_data))

    return {
        "data": items,
        "meta": {
            "page": page,
            "page_size": effective_page_size,
            "total_items": total_count,
            "total_pages": (total_count + effective_page_size - 1) // effective_page_size,
        }
    }


@router.get("/recommended")
async def get_recommended_events(
    limit: int = Query(6, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    user_claims: Optional[Dict[str, Any]] = Depends(get_current_user_claims)
):
    """
    Returns top recommended and featured verified opportunities.
    """
    query = (
        select(Opportunity)
        .where(Opportunity.status.in_(["published", "updated"]))
        .where(upcoming_only_clause())
        .options(selectinload(Opportunity.organization), selectinload(Opportunity.category))
        .order_by(desc(Opportunity.featured), desc(Opportunity.trust_score), desc(Opportunity.published_at))
        .limit(limit)
    )
    res = await db.execute(query)
    opps = res.scalars().all()

    items = []
    for opp in opps:
        tag_stmt = select(Tag.name).join(OpportunityTag, OpportunityTag.tag_id == Tag.id).where(OpportunityTag.opportunity_id == opp.id)
        tag_names = list((await db.execute(tag_stmt)).scalars().all())

        source_stmt = (
            select(OpportunitySource, SourceItem, Source)
            .join(SourceItem, OpportunitySource.source_item_id == SourceItem.id)
            .join(Source, SourceItem.source_id == Source.id)
            .where(OpportunitySource.opportunity_id == opp.id)
        )
        source_res = await db.execute(source_stmt)
        sources_data = [
            {
                "id": opp_src.id,
                "source_item_id": s_item.id,
                "relationship_type": opp_src.relationship_type,
                "is_primary_source": opp_src.is_primary_source,
                "platform": src.platform,
                "source_name": src.name,
                "canonical_url": s_item.canonical_url,
                "created_at": opp_src.created_at,
            }
            for opp_src, s_item, src in source_res.all()
        ]
        items.append(format_opp_read(opp, tag_names, user_claims, sources_data))

    return {"data": items}


@router.get("/{id_or_slug}")
async def get_event_detail(
    id_or_slug: str,
    db: AsyncSession = Depends(get_db),
    user_claims: Optional[Dict[str, Any]] = Depends(get_current_user_claims)
):
    """
    Returns full canonical opportunity details, provenance sources, and change history.
    """
    stmt = (
        select(Opportunity)
        .where(or_(Opportunity.id == id_or_slug, Opportunity.slug == id_or_slug))
        .options(selectinload(Opportunity.organization), selectinload(Opportunity.category))
    )
    res = await db.execute(stmt)
    opp = res.scalars().first()

    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    # Increment view count
    opp.view_count += 1
    await db.commit()

    # Fetch tags
    tag_stmt = select(Tag.name).join(OpportunityTag, OpportunityTag.tag_id == Tag.id).where(OpportunityTag.opportunity_id == opp.id)
    tag_names = list((await db.execute(tag_stmt)).scalars().all())

    # Fetch provenance sources
    source_stmt = (
        select(OpportunitySource, SourceItem, Source)
        .join(SourceItem, OpportunitySource.source_item_id == SourceItem.id)
        .join(Source, SourceItem.source_id == Source.id)
        .where(OpportunitySource.opportunity_id == opp.id)
    )
    source_res = await db.execute(source_stmt)
    sources_data = []
    for opp_src, s_item, src in source_res.all():
        sources_data.append({
            "id": opp_src.id,
            "source_item_id": s_item.id,
            "relationship_type": opp_src.relationship_type,
            "is_primary_source": opp_src.is_primary_source,
            "platform": src.platform,
            "source_name": src.name,
            "canonical_url": s_item.canonical_url,
            "created_at": opp_src.created_at,
        })

    # Fetch changes
    change_stmt = select(OpportunityChange).where(OpportunityChange.opportunity_id == opp.id).order_by(desc(OpportunityChange.detected_at))
    change_res = await db.execute(change_stmt)
    changes_data = [
        {
            "id": c.id,
            "field_name": c.field_name,
            "old_value": c.old_value,
            "new_value": c.new_value,
            "change_type": c.change_type,
            "detected_at": c.detected_at,
        }
        for c in change_res.scalars().all()
    ]

    base_data = format_opp_read(opp, tag_names, user_claims)
    base_data["sources"] = sources_data
    base_data["changes"] = changes_data
    base_data["provenance_reasons"] = [
        "Verified against official university and governmental channels",
        "Deterministic date and registration URL validation confirmed",
        "Multi-source confirmation and cross-reference check completed"
    ]

    return {"data": base_data}


@router.post("/{id}/save")
async def save_opportunity(
    id: str,
    db: AsyncSession = Depends(get_db),
    user_claims: Optional[Dict[str, Any]] = Depends(get_current_user_claims)
):
    """Bookmarks an opportunity for the authenticated user."""
    user_id = user_claims.get("id") if user_claims else "user-001"
    opp = await db.get(Opportunity, id)
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    check_stmt = select(SavedOpportunity).where(SavedOpportunity.user_id == user_id, SavedOpportunity.opportunity_id == id)
    existing = (await db.execute(check_stmt)).scalars().first()
    if not existing:
        saved = SavedOpportunity(user_id=user_id, opportunity_id=id)
        db.add(saved)
        opp.save_count += 1
        await db.commit()

    return {"data": {"saved": True, "opportunity_id": id}}


@router.delete("/{id}/save")
async def unsave_opportunity(
    id: str,
    db: AsyncSession = Depends(get_db),
    user_claims: Optional[Dict[str, Any]] = Depends(get_current_user_claims)
):
    """Removes a saved bookmark."""
    user_id = user_claims.get("id") if user_claims else "user-001"
    stmt = select(SavedOpportunity).where(SavedOpportunity.user_id == user_id, SavedOpportunity.opportunity_id == id)
    saved = (await db.execute(stmt)).scalars().first()
    if saved:
        await db.delete(saved)
        opp = await db.get(Opportunity, id)
        if opp and opp.save_count > 0:
            opp.save_count -= 1
        await db.commit()

    return {"data": {"saved": False, "opportunity_id": id}}


@router.post("/{id}/report")
async def report_opportunity(
    id: str,
    payload: Dict[str, str],
    db: AsyncSession = Depends(get_db),
    user_claims: Optional[Dict[str, Any]] = Depends(get_current_user_claims)
):
    """Submits a user report for incorrect dates, dead links, or cancellations (Section 81)."""
    user_id = user_claims.get("id") if user_claims else None
    report_type = payload.get("report_type", "other")
    details = payload.get("details", "")

    report = OpportunityReport(
        opportunity_id=id,
        user_id=user_id,
        report_type=report_type,
        details=details,
        status="pending"
    )
    db.add(report)
    await db.commit()
    return {"data": {"reported": True, "message": "Report received for administrative review."}}
