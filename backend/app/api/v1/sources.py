"""
Public Sources, Categories, and Organizations Endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.source import Source
from app.models.category import Category, Tag
from app.models.organization import Organization

router = APIRouter(tags=["Metadata & Taxonomies"])


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Returns active taxonomy categories."""
    stmt = select(Category).where(Category.is_active.is_(True)).order_by(Category.display_order)
    res = await db.execute(stmt)
    return {"data": res.scalars().all()}


@router.get("/tags")
async def list_tags(db: AsyncSession = Depends(get_db)):
    """Returns all opportunity tags."""
    stmt = select(Tag).order_by(Tag.name)
    res = await db.execute(stmt)
    return {"data": res.scalars().all()}


@router.get("/organizations")
async def list_organizations(db: AsyncSession = Depends(get_db)):
    """Returns registered organizations (Universities, Government bodies, etc.)."""
    stmt = select(Organization).order_by(Organization.name)
    res = await db.execute(stmt)
    return {"data": res.scalars().all()}


@router.get("/sources")
async def list_public_sources(db: AsyncSession = Depends(get_db)):
    """Returns list of monitored channels and provenance sources."""
    stmt = select(Source).options(selectinload(Source.organization)).order_by(desc(Source.trust_score))
    res = await db.execute(stmt)
    sources = res.scalars().all()
    data = []
    for s in sources:
        data.append({
            "id": s.id,
            "name": s.name,
            "source_type": s.source_type,
            "platform": s.platform,
            "url": s.url,
            "status": s.status,
            "trust_score": s.trust_score,
            "organization_name": s.organization.name if s.organization else None,
            "last_checked_at": s.last_checked_at,
        })
    return {"data": data}
