"""
NEXUS PULSE AI Services Package.
Exposes get_ai_provider(), MultiAIProvider, GeminiProvider, and GroqProvider.
"""
from typing import Optional
from app.services.ai.base import AIProvider
from app.services.ai.gemini import GeminiProvider
from app.services.ai.groq_provider import GroqProvider
from app.services.ai.local_provider import LocalAIProvider
from app.services.ai.multi import MultiAIProvider

_default_ai_provider: Optional[MultiAIProvider] = None


def get_ai_provider() -> MultiAIProvider:
    """Returns the singleton or configured multi-provider AI instance."""
    global _default_ai_provider
    if _default_ai_provider is None:
        _default_ai_provider = MultiAIProvider()
    return _default_ai_provider


__all__ = [
    "AIProvider",
    "GeminiProvider",
    "GroqProvider",
    "LocalAIProvider",
    "MultiAIProvider",
    "get_ai_provider",
]
