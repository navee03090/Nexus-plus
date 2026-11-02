"""
Notification Celery Tasks.
Periodically audits approaching deadlines (7d, 3d, 24h, 6h) for saved opportunities.
"""
import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

from app.tasks.celery_app import celery
from app.core.database import AsyncSessionLocal
from app.models.eligibility import SavedOpportunity
from app.models.opportunity import Opportunity
from app.services.notifications.dispatcher import NotificationDispatcher


@celery.task
def check_deadline_reminders_task():
    """Audits saved opportunities and dispatches approaching deadline alerts."""
    async def _async_run():
        async with AsyncSessionLocal() as db:
            now = datetime.now(timezone.utc)
            # Find saved opportunities with deadlines within the next 7 days
            stmt = (
                select(SavedOpportunity, Opportunity)
                .join(Opportunity, SavedOpportunity.opportunity_id == Opportunity.id)
                .where(
                    Opportunity.status.in_(["published", "updated"]),
                    Opportunity.registration_deadline > now,
                    Opportunity.registration_deadline <= now + timedelta(days=7)
                )
            )
            res = await db.execute(stmt)
            records = res.all()

            for saved, opp in records:
                deadline = opp.registration_deadline
                if deadline.tzinfo is None:
                    deadline = deadline.replace(tzinfo=timezone.utc)
                diff_hours = (deadline - now).total_seconds() / 3600.0

                reminder_type = None
                if diff_hours <= 6:
                    reminder_type = "DEADLINE_APPROACHING_6H"
                elif diff_hours <= 24:
                    reminder_type = "DEADLINE_APPROACHING_24H"
                elif diff_hours <= 72:
                    reminder_type = "DEADLINE_APPROACHING_3D"
                else:
                    reminder_type = "DEADLINE_APPROACHING_7D"

                await NotificationDispatcher.dispatch_opportunity_alert(
                    db=db,
                    user_id=saved.user_id,
                    opportunity=opp,
                    notification_type="DEADLINE_APPROACHING",
                    reason=f"Registration closes in {int(diff_hours)} hours"
                )

    asyncio.run(_async_run())
