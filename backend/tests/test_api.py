"""
Integration tests for FastAPI REST Endpoints (Section 64 & 91).
"""
import pytest
import httpx
from sqlalchemy import select
from app.main import app
from app.core.database import init_db, AsyncSessionLocal
from app.models.category import Category
from app.models.organization import Organization
from app.models.source import Source


async def seed_test_metadata():
    await init_db()
    async with AsyncSessionLocal() as session:
        cat = (await session.execute(select(Category))).scalars().first()
        if not cat:
            cat = Category(name="Hackathon", slug="hackathon", is_active=True)
            org = Organization(name="UET Peshawar", slug="uet-peshawar", organization_type="University")
            session.add_all([cat, org])
            await session.flush()
            src = Source(
                organization_id=org.id,
                name="UET Portal",
                source_type="Website",
                platform="University Portal",
                url="https://uetpeshawar.edu.pk",
                parser_key="uet",
                is_active=True
            )
            session.add(src)
            await session.commit()


@pytest.mark.asyncio
async def test_health_endpoints():
    await seed_test_metadata()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/health")
        assert res.status_code == 200
        data = res.json()
        assert data["data"]["status"] == "healthy"
        assert data["data"]["service"] == "NEXUS PULSE"


@pytest.mark.asyncio
async def test_events_feed_and_detail():
    await seed_test_metadata()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/events")
        assert res.status_code == 200
        data = res.json()
        assert "data" in data
        assert "meta" in data


@pytest.mark.asyncio
async def test_search_endpoint():
    await seed_test_metadata()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/events/search?q=Hackathon")
        assert res.status_code == 200
        data = res.json()
        assert "data" in data
        assert "meta" in data


@pytest.mark.asyncio
async def test_taxonomies_endpoints():
    await seed_test_metadata()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/categories")
        assert res.status_code == 200
        assert len(res.json()["data"]) >= 1

        res = await client.get("/api/v1/organizations")
        assert res.status_code == 200

        res = await client.get("/api/v1/sources")
        assert res.status_code == 200
