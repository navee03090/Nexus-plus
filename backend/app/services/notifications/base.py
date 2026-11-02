"""
Base Notification Channel abstraction (Section 53).
Enforces channel-agnostic notification dispatching.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BaseNotificationChannel(ABC):
    """Abstract interface for a delivery channel."""

    @abstractmethod
    async def send(
        self,
        recipient: str,
        title: str,
        message: str,
        action_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Dispatches notification and returns status dict."""
        pass
