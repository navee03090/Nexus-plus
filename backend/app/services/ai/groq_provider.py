"""
Groq LLM AI Provider.
Provides high-speed opportunity intelligence extraction, structured JSON enforcement,
automatic key rotation, and model fallback for Groq-hosted open weights models.
"""
import json
import re
from typing import List, Optional, Dict, Any

from app.services.ai.base import AIProvider
from app.schemas.opportunity import GeminiExtractionOutput
from app.services.ai.key_pool import KeyRotator
from app.core.config import settings
from app.core.logging import logger

GROQ_SYSTEM_EXTRACTION_PROMPT = """You are NEXUS PULSE's Opportunity Intelligence Extractor.
Tagline: "Never Miss the Opportunity That Matters."

CRITICAL ZERO-HALLUCINATION RULES:
1. Extract ONLY information explicitly supported by the announcement text, OCR text, or QR URLs.
2. NEVER invent, guess, or hallucinate registration links, application portals, dates, or emails.
3. If information is not explicitly mentioned, return null (or an empty array for lists).
4. Distinguish clearly between EVENT DATE (when the event takes place) and REGISTRATION DEADLINE (last day to apply).
5. Distinguish ANNOUNCEMENT DATE from EVENT DATE.
6. If the source mentions relative dates (e.g., 'this Friday', 'next week'), resolve them relative to the provided Publication Timestamp.
7. Pakistani sources default to Asia/Karachi timezone (+05:00).
8. If the announcement represents a deadline extension, cancellation, or postponement, set 'possible_update': true and state what changed.
9. You MUST return ONLY a valid JSON object matching the requested schema.
"""


def is_rate_limit_or_quota(err: Exception) -> bool:
    msg = str(err).lower()
    return any(term in msg for term in [
        "429", "402", "rate_limit", "rate limit", "resource_exhausted",
        "quota", "tokens per minute", "requests per minute", "too many requests"
    ])


def is_model_unavailable(err: Exception) -> bool:
    msg = str(err).lower()
    return any(term in msg for term in [
        "503", "unavailable", "model_not_found", "model not found", "does not exist", "decommissioned"
    ])


class GroqProvider(AIProvider):
    """Production Groq implementation supporting key rotation and multi-model fallback."""

    def __init__(
        self,
        api_keys: Optional[List[str]] = None,
        models: Optional[List[str]] = None,
        single_key: Optional[str] = None,
        single_model: Optional[str] = None
    ):
        raw_keys = api_keys or settings.groq_api_keys_list
        if single_key and single_key not in raw_keys:
            raw_keys = [single_key] + raw_keys
        self.api_keys = [k.strip() for k in raw_keys if k and len(k.strip()) > 8]

        raw_models = models or settings.groq_models_list
        if single_model and single_model not in raw_models:
            raw_models = [single_model] + raw_models
        self.models = [m.strip() for m in raw_models if m.strip()] or ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]

        self.key_rotator = KeyRotator("Groq", self.api_keys)
        self.last_used_model: Optional[str] = None
        self.last_used_key_prefix: Optional[str] = None

    @property
    def model_name(self) -> str:
        return self.last_used_model or (self.models[0] if self.models else "openai/gpt-oss-120b")

    @property
    def has_valid_api_key(self) -> bool:
        return self.key_rotator.has_keys

    async def extract_opportunity(
        self,
        raw_text: str,
        caption: Optional[str] = None,
        ocr_text: Optional[str] = None,
        qr_urls: Optional[List[str]] = None,
        image_bytes: Optional[bytes] = None,
        publication_timestamp: Optional[str] = None,
        source_timezone: str = "Asia/Karachi",
        raise_on_exhaustion: bool = False,
    ) -> GeminiExtractionOutput:
        """
        Extracts structured opportunity details via Groq chat completion with automatic
        key rotation on rate limits and model fallback.
        """
        if not self.has_valid_api_key:
            if raise_on_exhaustion:
                raise RuntimeError("No Groq API keys configured.")
            return self._fallback_deterministic_extraction(raw_text, caption, ocr_text, qr_urls, publication_timestamp)

        schema_json = json.dumps(GeminiExtractionOutput.model_json_schema())
        user_prompt = (
            f"You MUST return a JSON object strictly adhering to this schema:\n{schema_json}\n\n"
            f"EVIDENCE CONTEXT:\n"
            f"TITLE/TEXT:\n{raw_text}\n\n"
            f"CAPTION:\n{caption or ''}\n\n"
            f"OCR TEXT FROM POSTER:\n{ocr_text or ''}\n\n"
            f"QR CODES DETECTED:\n{', '.join(qr_urls or [])}\n\n"
            f"PUBLICATION TIMESTAMP: {publication_timestamp or 'Now'}\n"
            f"SOURCE TIMEZONE: {source_timezone}"
        )

        import groq

        last_exception = None

        # Iterate through models in priority order
        for model in self.models:
            candidate_keys = self.key_rotator.get_candidate_keys()
            for key in candidate_keys:
                try:
                    client = groq.Groq(api_key=key, timeout=25.0)
                    response = client.chat.completions.create(
                        model=model,
                        messages=[
                            {"role": "system", "content": GROQ_SYSTEM_EXTRACTION_PROMPT},
                            {"role": "user", "content": user_prompt},
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.1,
                    )

                    content = response.choices[0].message.content
                    if content:
                        parsed_dict = json.loads(content)
                        extracted = GeminiExtractionOutput.model_validate(parsed_dict)
                        self.key_rotator.mark_success(key)
                        self.last_used_model = model
                        self.last_used_key_prefix = key[:10]
                        logger.info(f"[Groq] Successfully extracted using model={model} key={key[:10]}...")
                        return extracted
                except Exception as e:
                    last_exception = e
                    if is_rate_limit_or_quota(e):
                        self.key_rotator.mark_rate_limited(key, cooldown_seconds=60.0, reason=str(e))
                        continue  # Try next key
                    elif is_model_unavailable(e):
                        logger.warning(f"[Groq] Model {model} unavailable ({e}). Falling back to next model...")
                        break  # Fallback to next model
                    else:
                        self.key_rotator.mark_error(key, cooldown_seconds=15.0, error_msg=str(e))
                        continue

        logger.error(f"[Groq] All keys/models failed. Last error: {last_exception}")
        if raise_on_exhaustion:
            raise RuntimeError(f"All Groq keys and models exhausted: {last_exception}")

        return self._fallback_deterministic_extraction(raw_text, caption, ocr_text, qr_urls, publication_timestamp)

    def _fallback_deterministic_extraction(
        self,
        raw_text: str, 
        caption: Optional[str],
        ocr_text: Optional[str],
        qr_urls: Optional[List[str]],
        publication_timestamp: Optional[str]
    ) -> GeminiExtractionOutput:
        from app.services.ai.gemini import GeminiProvider
        fallback = GeminiProvider(api_key="fallback", model_name="fallback")
        return fallback._fallback_deterministic_extraction(
            raw_text, caption, ocr_text, qr_urls, publication_timestamp
        )

    async def classify_content(self, text: str) -> Dict[str, Any]:
        """Classifies content via Groq with fallback."""
        if self.has_valid_api_key:
            import groq
            for model in self.models:
                for key in self.key_rotator.get_candidate_keys():
                    try:
                        client = groq.Groq(api_key=key, timeout=15.0)
                        resp = client.chat.completions.create(
                            model=model,
                            messages=[
                                {
                                    "role": "system",
                                    "content": "Return valid JSON with keys: category (string) and is_opportunity (boolean)."
                                },
                                {"role": "user", "content": text[:1000]}
                            ],
                            response_format={"type": "json_object"},
                            temperature=0.1
                        )
                        parsed = json.loads(resp.choices[0].message.content)
                        self.key_rotator.mark_success(key)
                        return parsed
                    except Exception as e:
                        if is_rate_limit_or_quota(e):
                            self.key_rotator.mark_rate_limited(key, cooldown_seconds=60.0, reason=str(e))
                        continue
        return {"category": "Technology Event", "is_opportunity": True}

    async def summarize_opportunity(self, title: str, description: str) -> str:
        """Generates executive summary via Groq with fallback."""
        if self.has_valid_api_key:
            import groq
            for model in self.models:
                for key in self.key_rotator.get_candidate_keys():
                    try:
                        client = groq.Groq(api_key=key, timeout=15.0)
                        resp = client.chat.completions.create(
                            model=model,
                            messages=[
                                {
                                    "role": "system",
                                    "content": "Summarize this university or technology opportunity in 1 concise sentence."
                                },
                                {"role": "user", "content": f"Title: {title}\nDescription: {description[:1000]}"}
                            ],
                            temperature=0.2
                        )
                        self.key_rotator.mark_success(key)
                        return resp.choices[0].message.content.strip()
                    except Exception as e:
                        if is_rate_limit_or_quota(e):
                            self.key_rotator.mark_rate_limited(key, cooldown_seconds=60.0, reason=str(e))
                        continue
        return f"{title}: {description[:120]}..."

    async def detect_changes(self, old_data: Dict[str, Any], new_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        changes = []
        for field in ["registration_deadline", "start_date", "venue", "registration_url"]:
            old_val = str(old_data.get(field) or "")
            new_val = str(new_data.get(field) or "")
            if old_val and new_val and old_val != new_val:
                changes.append({
                    "field_name": field,
                    "old_value": old_val,
                    "new_value": new_val,
                    "change_type": f"{field}_change"
                })
        return changes

    async def generate_embedding(self, text: str) -> List[float]:
        """Deterministic 768-dim hash vector fallback since Groq is focused on inference."""
        import hashlib
        import math
        vec = [0.0] * settings.EMBEDDING_DIMENSION
        tokens = text.lower().split()
        for idx, token in enumerate(tokens):
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
            pos = h % settings.EMBEDDING_DIMENSION
            vec[pos] += 1.0 / (idx + 1)
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [round(x / norm, 6) for x in vec]
    
    
