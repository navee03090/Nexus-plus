"""
Push Notification Channel for Web and Mobile.
"""
from typing import Dict, Any, Optional
from app.services.notifications.base import BaseNotificationChannel
from app.core.logging import logger


class PushNotificationChannel(BaseNotificationChannel):
    """Web push / mobile push delivery adapter."""

    async def send(
        self,
        recipient: str,
        title: str,
        message: str,
        action_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        logger.info(f"Dispatching Web/Mobile Push notification to {recipient}: '{title}'")
        return {
            "channel": "push",
            "status": "sent",
            "provider_message_id": f"push-{metadata.get('opp_id', '0')[:8] if metadata else 'push'}",
            "simulated": True
        }
