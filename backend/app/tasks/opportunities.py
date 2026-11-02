"""
Opportunity Management Celery Tasks.
Periodically expires outdated opportunities and refreshes embeddings.
"""
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select

from app.tasks.celery_app import celery
from app.core.database import AsyncSessionLocal
from app.models.opportunity import Opportunity
from app.core.logging import logger


@celery.task
def expire_outdated_opportunities_task():
    """Marks passed events or opportunities with expired deadlines as expired."""
    async def _async_run():
        async with AsyncSessionLocal() as db:
            now = datetime.now(timezone.utc)
            stmt = select(Opportunity).where(
                Opportunity.status.in_(["published", "updated"]),
                Opportunity.registration_deadline < now
            )
            res = await db.execute(stmt)
            expired_opps = res.scalars().all()
            for opp in expired_opps:
                # If start_date has also passed, mark expired
                if opp.start_date and opp.start_date < now:
                    opp.status = "expired"
            await db.commit()
            logger.info(f"Evaluated expired opportunities. Updated count: {len(expired_opps)}")
    asyncio.run(_async_run())
