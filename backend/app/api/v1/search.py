"""
Hybrid Search Endpoints (Section 42 & 76).
Combines PostgreSQL full-text search with vector semantic similarity.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.opportunity import Opportunity
from app.models.category import Tag, OpportunityTag
from app.algorithms.similarity import cosine_vector_similarity, tokenize, jaccard_similarity
from app.algorithms.scoring import get_deadline_urgency
from app.services.ai import get_ai_provider

router = APIRouter(prefix="/events", tags=["Search"])


@router.get("/search")
async def search_opportunities(
    q: str = Query(..., min_length=2, description="Natural language search query"),
    category: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    is_online: Optional[bool] = Query(None),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """
    Executes hybrid search:
    Keyword relevance + Semantic embedding similarity + Structured filters.
    """
    ai_provider = get_ai_provider()
    query_vector = await ai_provider.generate_embedding(q)
    query_tokens = tokenize(q)

    # Base query for active opportunities
    stmt = (
        select(Opportunity)
        .where(Opportunity.status.in_(["published", "updated"]))
        .options(
            selectinload(Opportunity.organization),
            selectinload(Opportunity.category),
            selectinload(Opportunity.embedding)
        )
    )

    if city:
        stmt = stmt.where(func.lower(Opportunity.city) == city.lower())
    if is_online is not None:
        stmt = stmt.where(Opportunity.is_online == is_online)

    res = await db.execute(stmt)
    opps = res.scalars().all()

    scored_results = []
    for opp in opps:
        # 1. Text keyword score
        combined_text = f"{opp.title} {opp.summary} {opp.description} {opp.city}"
        opp_tokens = tokenize(combined_text)
        keyword_score = jaccard_similarity(query_tokens, opp_tokens)

        # 2. Exact substring bonus
        if q.lower() in opp.title.lower():
            keyword_score += 0.5
        elif q.lower() in combined_text.lower():
            keyword_score += 0.25

        # 3. Vector semantic similarity
        vector_score = 0.0
        if opp.embedding and opp.embedding.vector_data and query_vector:
            vector_score = cosine_vector_similarity(query_vector, opp.embedding.vector_data)

        # Hybrid composite ranking: 50% semantic vector, 50% keyword match
        hybrid_score = (vector_score * 0.50) + (min(1.0, keyword_score) * 0.50)

        urgency_status, urgency_label = get_deadline_urgency(opp.registration_deadline)

        # Load tags
        tag_stmt = select(Tag.name).join(OpportunityTag, OpportunityTag.tag_id == Tag.id).where(OpportunityTag.opportunity_id == opp.id)
        tag_names = list((await db.execute(tag_stmt)).scalars().all())

        scored_results.append({
            "id": opp.id,
            "title": opp.title,
            "slug": opp.slug,
            "summary": opp.summary,
            "venue": opp.venue,
            "city": opp.city,
            "country": opp.country,
            "is_online": opp.is_online,
            "registration_deadline": opp.registration_deadline,
            "status": opp.status,
            "trust_score": opp.trust_score,
            "flyer_url": opp.flyer_url,
            "organization_name": opp.organization.name if opp.organization else "Organizer",
            "category_name": opp.category.name if opp.category else "Other",
            "tags": tag_names,
            "deadline_urgency": urgency_status,
            "deadline_label": urgency_label,
            "search_score": round(hybrid_score, 4),
        })

    # Sort descending by hybrid score
    scored_results.sort(key=lambda x: x["search_score"], reverse=True)
    filtered = [r for r in scored_results if r["search_score"] > 0.05][:limit]

    return {
        "data": filtered,
        "meta": {
            "query": q,
            "results_count": len(filtered),
        }
    }
