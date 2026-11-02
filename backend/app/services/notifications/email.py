"""
Email Notification Channel.
Delivers personalized alerts and deadline reminders via SMTP / transactional email.
"""
from typing import Dict, Any, Optional
from app.services.notifications.base import BaseNotificationChannel
from app.core.config import settings
from app.core.logging import logger


class EmailNotificationChannel(BaseNotificationChannel):
    """Email delivery adapter."""

    async def send(
        self,
        recipient: str,
        title: str,
        message: str,
        action_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        logger.info(f"Dispatching Email alert to {recipient}: '{title}'")
        # In test/dev mode without configured SMTP credentials, simulate clean dispatch
        if not settings.SMTP_HOST or not settings.SMTP_USER:
            return {
                "channel": "email",
                "status": "sent",
                "provider_message_id": f"sim-email-{metadata.get('opp_id', '0')[:8] if metadata else 'msg'}",
                "simulated": True
            }

        # Real SMTP delivery logic
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            msg = MIMEMultipart("alternative")
            msg["Subject"] = title
            msg["From"] = settings.SMTP_FROM
            msg["To"] = recipient

            html_content = f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a;">{title}</h2>
                <p style="color: #334155; font-size: 16px; line-height: 1.5;">{message}</p>
                {f'<a href="{action_url}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 15px;">View Opportunity on NEXUS PULSE</a>' if action_url else ''}
                <hr style="margin-top: 30px; border: none; border-top: 1px solid #e2e8f0;" />
                <p style="color: #64748b; font-size: 12px;">NEXUS PULSE — Never Miss the Opportunity That Matters.</p>
            </div>
            """
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
                server.sendmail(settings.SMTP_FROM, [recipient], msg.as_string())

            return {"channel": "email", "status": "sent", "provider_message_id": "smtp-delivered"}
        except Exception as e:
            logger.error(f"Email delivery failed: {e}")
            return {"channel": "email", "status": "failed", "error": str(e)}
