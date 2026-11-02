"""
Notification Dispatcher and Scheduler (Section 53, 54, 55).
Deduplicates deliveries, enforces user preferences, and schedules deadline alerts.
"""
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.notification import NotificationPreference, NotificationDelivery
from app.models.profile import Profile
from app.models.opportunity import Opportunity
from app.services.notifications.email import EmailNotificationChannel
from app.services.notifications.telegram import TelegramNotificationChannel
from app.services.notifications.push import PushNotificationChannel
from app.core.logging import logger


class NotificationDispatcher:
    """Manages multi-channel dispatch with deduplication."""

    email_channel = EmailNotificationChannel()
    telegram_channel = TelegramNotificationChannel()
    push_channel = PushNotificationChannel()

    @classmethod
    async def dispatch_opportunity_alert(
        cls,
        db: AsyncSession,
        user_id: str,
        opportunity: Opportunity,
        notification_type: str = "NEW_MATCH",
        reason: Optional[str] = None
    ) -> List[NotificationDelivery]:
        """
        Sends an opportunity alert across configured channels without duplicating past sends.
        """
        # Fetch user preferences
        p_stmt = select(NotificationPreference).where(NotificationPreference.user_id == user_id)
        p_res = await db.execute(p_stmt)
        prefs = p_res.scalars().first()

        # If user has no specific preferences yet, default to email and in-app
        email_enabled = prefs.email_enabled if prefs else True
        telegram_enabled = prefs.telegram_enabled if prefs else False
        telegram_chat_id = prefs.telegram_chat_id if prefs else None
        push_enabled = prefs.push_enabled if prefs else True

        # Fetch profile email
        prof = await db.get(Profile, user_id)
        user_email = (prof.full_name or "student").lower() + "@nexus-pulse.org" if prof else "user@nexus-pulse.org"

        title = f"Opportunity Alert: {opportunity.title}"
        if notification_type == "OPPORTUNITY_UPDATED":
            title = f"Updated: {opportunity.title}"
        elif notification_type == "DEADLINE_APPROACHING":
            title = f"Closing Soon: {opportunity.title}"

        message = opportunity.summary
        if reason:
            message += f"\n\nWhy this matches you: {reason}"

        action_url = f"https://nexus-pulse.org/opportunities/{opportunity.slug}"
        deliveries: List[NotificationDelivery] = []

        channels_to_send = []
        if email_enabled and user_email:
            channels_to_send.append(("email", user_email, cls.email_channel))
        if telegram_enabled and telegram_chat_id:
            channels_to_send.append(("telegram", telegram_chat_id, cls.telegram_channel))
        if push_enabled:
            channels_to_send.append(("push", user_id, cls.push_channel))
        # Always register in-app
        channels_to_send.append(("in_app", user_id, None))

        for channel_name, recipient_id, channel_obj in channels_to_send:
            # Check for existing delivery (Deduplication Check)
            dup_stmt = select(NotificationDelivery).where(
                NotificationDelivery.user_id == user_id,
                NotificationDelivery.opportunity_id == opportunity.id,
                NotificationDelivery.notification_type == notification_type,
                NotificationDelivery.channel == channel_name
            )
            dup_res = await db.execute(dup_stmt)
            if dup_res.scalars().first():
                logger.debug(f"Skipping duplicate notification for user {user_id}, opp {opportunity.id}, channel {channel_name}")
                continue

            status = "sent"
            msg_id = None
            err_msg = None

            if channel_obj:
                res = await channel_obj.send(
                    recipient=recipient_id,
                    title=title,
                    message=message,
                    action_url=action_url,
                    metadata={"opp_id": opportunity.id}
                )
                status = res.get("status", "sent")
                msg_id = res.get("provider_message_id")
                err_msg = res.get("error")

            delivery = NotificationDelivery(
                user_id=user_id,
                opportunity_id=opportunity.id,
                notification_type=notification_type,
                channel=channel_name,
                scheduled_at=datetime.now(timezone.utc),
                sent_at=datetime.now(timezone.utc) if status == "sent" else None,
                status=status,
                provider_message_id=msg_id,
                error_message=err_msg
            )
            db.add(delivery)
            deliveries.append(delivery)

        await db.commit()
        return deliveries
