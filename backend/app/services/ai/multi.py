"""
Multi-Provider AI Orchestrator for NEXUS PULSE.
Supports automatic provider selection (LLM_PROVIDER=auto | gemini | groq),
cross-provider failover, key rotation, and zero-hallucination deterministic fallback.
"""
from typing import List, Optional, Dict, Any

from app.services.ai.base import AIProvider
from app.schemas.opportunity import GeminiExtractionOutput
from app.services.ai.gemini import GeminiProvider
from app.services.ai.groq_provider import GroqProvider
from app.services.ai.local_provider import LocalAIProvider
from app.core.config import settings
from app.core.logging import logger


class MultiAIProvider(AIProvider):
    """
    Unified AI Provider with intelligent multi-model routing, key rotation,
    and automatic failover between Local AI (Ollama/LM Studio), Google Gemini, and Groq.
    """

    def __init__(
        self,
        provider_preference: Optional[str] = None,
        gemini_provider: Optional[GeminiProvider] = None,
        groq_provider: Optional[GroqProvider] = None,
        local_provider: Optional[LocalAIProvider] = None,
    ):
        self.provider_preference = (provider_preference or settings.LLM_PROVIDER or "auto").lower()
        self.gemini = gemini_provider or GeminiProvider()
        self.groq = groq_provider or GroqProvider()
        self.local = local_provider or LocalAIProvider()

        self._active_provider: str = self._determine_initial_provider()
        self._last_used_model: Optional[str] = None

    def _determine_initial_provider(self) -> str:
        pref = self.provider_preference
        if pref == "local":
            return "local"
        if pref == "groq":
            return "groq"
        if pref == "gemini":
            return "gemini"
        # In auto mode: prefer local model if configured, otherwise Gemini, otherwise Groq
        if self.local.is_configured:
            return "local"
        if self.gemini.has_valid_api_key:
            return "gemini"
        if self.groq.has_valid_api_key:
            return "groq"
        return "gemini"

    @property
    def model_name(self) -> str:
        """Returns the active or last successfully used model name."""
        if self._last_used_model:
            return self._last_used_model
        if self._active_provider == "local":
            return self.local.model_name
        if self._active_provider == "groq":
            return self.groq.model_name
        return self.gemini.model_name

    @property
    def active_provider(self) -> str:
        return self._active_provider

    async def extract_opportunity(
        self,
        raw_text: str,
        caption: Optional[str] = None,
        ocr_text: Optional[str] = None,
        qr_urls: Optional[List[str]] = None,
        image_bytes: Optional[bytes] = None,
        publication_timestamp: Optional[str] = None,
        source_timezone: str = "Asia/Karachi",
    ) -> GeminiExtractionOutput:
        """
        Extracts structured opportunity details with automatic cross-provider failover.
        """
        mode = self.provider_preference

        # Mode: Explicit Local (Ollama / LM Studio)
        if mode == "local":
            try:
                res = await self.local.extract_opportunity(
                    raw_text=raw_text,
                    caption=caption,
                    ocr_text=ocr_text,
                    qr_urls=qr_urls,
                    image_bytes=image_bytes,
                    publication_timestamp=publication_timestamp,
                    source_timezone=source_timezone,
                    raise_on_exhaustion=False
                )
                self._last_used_model = self.local.model_name
                self._active_provider = "local"
                return res
            except Exception as e:
                logger.error(f"[MultiAIProvider] Local AI failed: {e}. Falling back to deterministic.")
                self._active_provider = "deterministic_fallback"
                return self.local._fallback_deterministic_extraction(
                    raw_text, caption, ocr_text, qr_urls, publication_timestamp
                )

        # Mode: Explicit Gemini
        if mode == "gemini":
            try:
                res = await self.gemini.extract_opportunity(
                    raw_text=raw_text,
                    caption=caption,
                    ocr_text=ocr_text,
                    qr_urls=qr_urls,
                    image_bytes=image_bytes,
                    publication_timestamp=publication_timestamp,
                    source_timezone=source_timezone,
                    raise_on_exhaustion=False
                )
                self._last_used_model = self.gemini.model_name
                self._active_provider = "gemini"
                return res
            except Exception as e:
                logger.error(f"[MultiAIProvider] Gemini failed: {e}. Falling back to deterministic.")
                self._active_provider = "deterministic_fallback"
                return self.gemini._fallback_deterministic_extraction(
                    raw_text, caption, ocr_text, qr_urls, publication_timestamp
                )

        # Mode: Explicit Groq
        if mode == "groq":
            try:
                res = await self.groq.extract_opportunity(
                    raw_text=raw_text,
                    caption=caption,
                    ocr_text=ocr_text,
                    qr_urls=qr_urls,
                    image_bytes=image_bytes,
                    publication_timestamp=publication_timestamp,
                    source_timezone=source_timezone,
                    raise_on_exhaustion=False
                )
                self._last_used_model = self.groq.model_name
                self._active_provider = "groq"
                return res
            except Exception as e:
                logger.error(f"[MultiAIProvider] Groq failed: {e}. Falling back to deterministic.")
                self._active_provider = "deterministic_fallback"
                return self.groq._fallback_deterministic_extraction(
                    raw_text, caption, ocr_text, qr_urls, publication_timestamp
                )

        # Mode: Auto (Local Model -> Gemini -> Groq -> Deterministic)
        # 1. Try Local Model if configured
        if self.local.is_configured:
            try:
                res = await self.local.extract_opportunity(
                    raw_text=raw_text,
                    caption=caption,
                    ocr_text=ocr_text,
                    qr_urls=qr_urls,
                    image_bytes=image_bytes,
                    publication_timestamp=publication_timestamp,
                    source_timezone=source_timezone,
                    raise_on_exhaustion=True
                )
                self._last_used_model = self.local.model_name
                self._active_provider = "local"
                return res
            except Exception as local_err:
                logger.warning(f"[MultiAIProvider] Local AI model failed or unreachable: {local_err}. Trying cloud providers...")

        # 2. Try Gemini
        if self.gemini.has_valid_api_key:
            try:
                res = await self.gemini.extract_opportunity(
                    raw_text=raw_text,
                    caption=caption,
                    ocr_text=ocr_text,
                    qr_urls=qr_urls,
                    image_bytes=image_bytes,
                    publication_timestamp=publication_timestamp,
                    source_timezone=source_timezone,
                    raise_on_exhaustion=True
                )
                self._last_used_model = self.gemini.model_name
                self._active_provider = "gemini"
                return res
            except Exception as gemini_err:
                logger.warning(
                    f"[MultiAIProvider] Gemini keys/models exhausted or failed: {gemini_err}. "
                    f"Failing over to Groq provider..."
                )

        # 3. Try Groq
        if self.groq.has_valid_api_key:
            try:
                res = await self.groq.extract_opportunity(
                    raw_text=raw_text,
                    caption=caption,
                    ocr_text=ocr_text,
                    qr_urls=qr_urls,
                    image_bytes=image_bytes,
                    publication_timestamp=publication_timestamp,
                    source_timezone=source_timezone,
                    raise_on_exhaustion=True
                )
                self._last_used_model = self.groq.model_name
                self._active_provider = "groq"
                return res
            except Exception as groq_err:
                logger.warning(
                    f"[MultiAIProvider] Groq keys/models exhausted or failed: {groq_err}. "
                    f"Falling back to high-fidelity deterministic extractor..."
                )

        # 4. Deterministic rule-based fallback
        self._active_provider = "deterministic_fallback"
        return self.gemini._fallback_deterministic_extraction(
            raw_text, caption, ocr_text, qr_urls, publication_timestamp
        )

    async def classify_content(self, text: str) -> Dict[str, Any]:
        """Classifies content using active provider with failover."""
        if self._active_provider == "groq" and self.groq.has_valid_api_key:
            return await self.groq.classify_content(text)
        return await self.gemini.classify_content(text)

    async def summarize_opportunity(self, title: str, description: str) -> str:
        """Summarizes opportunity using active provider with failover."""
        if self._active_provider == "groq" and self.groq.has_valid_api_key:
            return await self.groq.summarize_opportunity(title, description)
        return await self.gemini.summarize_opportunity(title, description)

    async def detect_changes(self, old_data: Dict[str, Any], new_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        return await self.gemini.detect_changes(old_data, new_data)

    async def generate_embedding(self, text: str) -> List[float]:
        """Generates embedding using Gemini vector endpoint or deterministic embedding fallback."""
        return await self.gemini.generate_embedding(text)

    def get_diagnostics(self) -> Dict[str, Any]:
        """Returns detailed system diagnostics for health and telemetry checks."""
        return {
            "mode": self.provider_preference,
            "active_provider": self._active_provider,
            "active_model": self.model_name,
            "local": {
                "base_url": self.local.base_url,
                "configured_model": self.local.model,
                "is_configured": self.local.is_configured,
                "last_model": self.local.last_used_model,
            },
            "gemini": {
                "configured_models": self.gemini.models,
                "key_diagnostics": self.gemini.key_rotator.get_status_diagnostics(),
                "last_model": self.gemini.last_used_model,
            },
            "groq": {
                "configured_models": self.groq.models,
                "key_diagnostics": self.groq.key_rotator.get_status_diagnostics(),
                "last_model": self.groq.last_used_model,
            }
        }
