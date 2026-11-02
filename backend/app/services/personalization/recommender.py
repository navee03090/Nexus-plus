"""
Personalization & Recommendation Service (Section 19 & 20).
Ranks opportunities for user profile with explainability.
"""
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.opportunity import Opportunity
from app.models.category import Tag, OpportunityTag
from app.algorithms.scoring import calculate_relevance, get_deadline_urgency
from app.services.personalization.eligibility import EligibilityEngine


class PersonalizationRecommender:
    """Computes personalized opportunity rankings."""

    @classmethod
    async def get_recommended_for_user(
        cls,
        db: AsyncSession,
        user_profile: Dict[str, Any],
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        # Fetch active published opportunities with category and tags
        stmt = (
            select(Opportunity)
            .where(Opportunity.status.in_(["published", "updated"]))
            .options(selectinload(Opportunity.category), selectinload(Opportunity.organization))
        )
        res = await db.execute(stmt)
        opps = res.scalars().all()

        scored_opps = []
        for opp in opps:
            # Fetch tags
            tag_stmt = (
                select(Tag.name)
                .join(OpportunityTag, OpportunityTag.tag_id == Tag.id)
                .where(OpportunityTag.opportunity_id == opp.id)
            )
            tag_res = await db.execute(tag_stmt)
            tag_names = list(tag_res.scalars().all())

            opp_dict = {
                "id": opp.id,
                "title": opp.title,
                "slug": opp.slug,
                "summary": opp.summary,
                "description": opp.description,
                "city": opp.city,
                "country": opp.country,
                "is_online": opp.is_online,
                "venue": opp.venue,
                "start_date": opp.start_date.isoformat() if opp.start_date else None,
                "registration_deadline": opp.registration_deadline.isoformat() if opp.registration_deadline else None,
                "registration_url": opp.registration_url,
                "application_url": opp.application_url,
                "target_audience": opp.target_audience or [],
                "eligibility_summary": opp.eligibility_summary,
                "status": opp.status,
                "trust_score": opp.trust_score,
                "verification_status": opp.verification_status,
                "featured": opp.featured,
                "flyer_url": opp.flyer_url,
                "category_name": opp.category.name if opp.category else "Other",
                "category_slug": opp.category.slug if opp.category else "other",
                "organization_name": opp.organization.name if opp.organization else "Verified Organizer",
                "organization_logo": opp.organization.logo_url if opp.organization else None,
                "tags": tag_names,
            }

            match_score, match_reasons = calculate_relevance(user_profile, opp_dict, tag_names)
            elig_status, elig_reasons = EligibilityEngine.evaluate_eligibility(user_profile, opp_dict, [])
            urgency_status, urgency_label = get_deadline_urgency(opp.registration_deadline)

            opp_dict["match_score"] = match_score
            opp_dict["match_reasons"] = match_reasons
            opp_dict["eligibility_status"] = elig_status
            opp_dict["eligibility_reasons"] = elig_reasons
            opp_dict["deadline_urgency"] = urgency_status
            opp_dict["deadline_label"] = urgency_label

            scored_opps.append(opp_dict)

        # Sort by match_score descending, then trust_score descending
        scored_opps.sort(key=lambda x: (x["match_score"], x["trust_score"]), reverse=True)
        return scored_opps[:limit]
