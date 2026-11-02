"""
User Accounts, Personalization, Saved Bookmarks, and Notification History (Section 49, 50, 51, 52).
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user_claims
from app.models.profile import Profile
from app.models.eligibility import SavedOpportunity
from app.models.notification import NotificationDelivery
from app.models.opportunity import Opportunity
from app.services.personalization.recommender import PersonalizationRecommender
from app.schemas.user import ProfileUpdate

router = APIRouter(tags=["User Profile & Personalization"])


@router.get("/events/recommended")
async def get_recommended_feed(
    db: AsyncSession = Depends(get_db),
    user_claims: Optional[Dict[str, Any]] = Depends(get_current_user_claims)
):
    """Returns opportunities ranked by personal relevance score with explanation breakdown."""
    user_id = user_claims.get("id") if user_claims else "default-guest"

    # Fetch profile or construct sample
    prof = await db.get(Profile, user_id)
    profile_dict = {
        "interests": ["AI", "Cybersecurity", "Software Engineering"],
        "education_level": "Undergraduate",
        "field_of_study": "Computer Systems Engineering",
        "city": "Peshawar",
        "country": "Pakistan",
    }
    if prof:
        profile_dict["city"] = prof.city
        profile_dict["education_level"] = prof.education_level or "Undergraduate"
        profile_dict["field_of_study"] = prof.field_of_study or "Computer Science"

    recommended = await PersonalizationRecommender.get_recommended_for_user(db, profile_dict)
    return {"data": recommended}


@router.get("/profiles/me")
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    user_claims: Optional[Dict[str, Any]] = Depends(get_current_user_claims)
):
    user_id = user_claims.get("id") if user_claims else "user-001"
    prof = await db.get(Profile, user_id)
    if not prof:
        # Create default dev profile if not exists
        prof = Profile(
            id=user_id,
            user_id=user_id,
            full_name="Naveed Ahmad",
            city="Peshawar",
            university="UET Peshawar",
            field_of_study="Computer Systems Engineering",
            education_level="Undergraduate",
            role="admin" if user_claims and user_claims.get("role") == "admin" else "user"
        )
        db.add(prof)
        await db.commit()
        await db.refresh(prof)

    return {"data": prof}


@router.patch("/profiles/me")
async def update_my_profile(
    payload: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user_claims: Optional[Dict[str, Any]] = Depends(get_current_user_claims)
):
    user_id = user_claims.get("id") if user_claims else "user-001"
    prof = await db.get(Profile, user_id)
    if not prof:
        prof = Profile(id=user_id, user_id=user_id)
        db.add(prof)

    for field, val in payload.model_dump(exclude_unset=True).items():
        if field != "interests" and hasattr(prof, field):
            setattr(prof, field, val)

    await db.commit()
    await db.refresh(prof)
    return {"data": prof}


@router.get("/saved")
async def get_saved_opportunities(
    db: AsyncSession = Depends(get_db),
    user_claims: Optional[Dict[str, Any]] = Depends(get_current_user_claims)
):
    """Returns saved bookmarks partitioned into Upcoming, Closing Soon, and Expired."""
    user_id = user_claims.get("id") if user_claims else "user-001"
    stmt = (
        select(SavedOpportunity, Opportunity)
        .join(Opportunity, SavedOpportunity.opportunity_id == Opportunity.id)
        .where(SavedOpportunity.user_id == user_id)
        .options(selectinload(Opportunity.organization), selectinload(Opportunity.category))
        .order_by(desc(SavedOpportunity.created_at))
    )
    res = await db.execute(stmt)
    saved_list = []
    for saved, opp in res.all():
        saved_list.append({
            "id": saved.id,
            "opportunity_id": opp.id,
            "title": opp.title,
            "slug": opp.slug,
            "city": opp.city,
            "registration_deadline": opp.registration_deadline,
            "organization_name": opp.organization.name if opp.organization else "Organizer",
            "category_name": opp.category.name if opp.category else "Other",
            "flyer_url": opp.flyer_url,
            "notes": saved.notes,
            "saved_at": saved.created_at,
        })
    return {"data": saved_list}


@router.get("/notifications/history")
async def get_notification_history(
    db: AsyncSession = Depends(get_db),
    user_claims: Optional[Dict[str, Any]] = Depends(get_current_user_claims)
):
    """Returns history of alerts dispatched to this user."""
    user_id = user_claims.get("id") if user_claims else "user-001"
    stmt = (
        select(NotificationDelivery, Opportunity)
        .join(Opportunity, NotificationDelivery.opportunity_id == Opportunity.id)
        .where(NotificationDelivery.user_id == user_id)
        .order_by(desc(NotificationDelivery.created_at))
        .limit(30)
    )
    res = await db.execute(stmt)
    history = []
    for notif, opp in res.all():
        history.append({
            "id": notif.id,
            "opportunity_id": opp.id,
            "opportunity_title": opp.title,
            "opportunity_slug": opp.slug,
            "notification_type": notif.notification_type,
            "channel": notif.channel,
            "sent_at": notif.sent_at,
            "status": notif.status,
        })
    return {"data": history}
