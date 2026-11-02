"""
Pytest configuration and test database isolation fixture.
Ensures automated tests execute against an isolated test database (test_nexus_pulse.db)
and NEVER overwrite or wipe real data in the application database (nexus_pulse.db).
"""
import os
import sys

# CRITICAL: Force test database environment BEFORE any app modules are imported
TEST_DB_URL = "sqlite+aiosqlite:///./test_nexus_pulse.db"
os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["APP_ENV"] = "testing"

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.database import get_db, Base
import app.core.database as db_mod
from app.core.config import settings

@pytest.fixture(scope="session", autouse=True)
async def configure_test_db():
    import os
    if os.path.exists("test_nexus_pulse.db"):
        try:
            os.remove("test_nexus_pulse.db")
        except Exception:
            pass

    from app.main import app as main_app

    settings.DATABASE_URL = TEST_DB_URL
    test_engine = create_async_engine(
        TEST_DB_URL,
        echo=False,
        future=True,
        connect_args={"check_same_thread": False},
    )
    test_sessionmaker = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    db_mod.engine = test_engine
    db_mod.AsyncSessionLocal = test_sessionmaker

    async def override_get_db():
        async with test_sessionmaker() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    main_app.dependency_overrides[get_db] = override_get_db

    # Initialize test tables
    async with test_engine.begin() as conn:
        import app.models  # noqa
        await conn.run_sync(Base.metadata.create_all)

    # Seed test categories in test database safely
    from app.models.category import Category
    from sqlalchemy import select
    async with test_sessionmaker() as session:
        existing = (await session.execute(select(Category).where(Category.slug == "hackathon"))).scalars().first()
        if not existing:
            cat = Category(id="cat-test-01", name="Hackathon", slug="hackathon", is_active=True, display_order=1)
            session.add(cat)
            await session.commit()

    yield

    main_app.dependency_overrides.clear()
