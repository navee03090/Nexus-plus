"""
Telegram Notification Channel.
Delivers instant alerts to subscribed Telegram chats via Bot API.
"""
from typing import Dict, Any, Optional
import httpx

from app.services.notifications.base import BaseNotificationChannel
from app.core.config import settings
from app.core.logging import logger


class TelegramNotificationChannel(BaseNotificationChannel):
    """Telegram Bot delivery adapter."""

    async def send(
        self,
        recipient: str,  # chat_id
        title: str,
        message: str,
        action_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        logger.info(f"Dispatching Telegram alert to chat {recipient}: '{title}'")
        if not settings.TELEGRAM_BOT_TOKEN:
            return {
                "channel": "telegram",
                "status": "sent",
                "provider_message_id": f"sim-tg-{metadata.get('opp_id', '0')[:8] if metadata else 'msg'}",
                "simulated": True
            }

        try:
            tg_text = f"🚨 *{title}*\n\n{message}"
            if action_url:
                tg_text += f"\n\n🔗 [Open on NEXUS PULSE]({action_url})"

            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                    json={
                        "chat_id": recipient,
                        "text": tg_text,
                        "parse_mode": "Markdown",
                    }
                )
                if res.status_code == 200:
                    return {"channel": "telegram", "status": "sent", "provider_message_id": str(res.json().get("result", {}).get("message_id"))}
                return {"channel": "telegram", "status": "failed", "error": res.text}
        except Exception as e:
            logger.error(f"Telegram alert delivery failed: {e}")
            return {"channel": "telegram", "status": "failed", "error": str(e)}
