"""
Local AI Model Provider for NEXUS PULSE.
Enables running opportunity extraction, classification, and summarization against
local model runners (Ollama, LM Studio, vLLM, LocalAI) running on another machine or LAN.
"""
import json
import re
import math
import hashlib
import time
from typing import List, Optional, Dict, Any
import httpx

from app.services.ai.base import AIProvider
from app.schemas.opportunity import GeminiExtractionOutput
from app.core.config import settings
from app.core.logging import logger

LOCAL_SYSTEM_EXTRACTION_PROMPT = """You are NEXUS PULSE's Opportunity Intelligence Extractor.
CRITICAL ZERO-HALLUCINATION RULES:
1. Extract ONLY information explicitly supported by the announcement text, OCR text, or QR URLs.
2. NEVER invent, guess, or hallucinate registration links, application portals, dates, or emails.
3. If information is not explicitly mentioned, return null (or [] for empty lists).
4. Distinguish clearly between EVENT DATE (when event takes place) and REGISTRATION DEADLINE (last day to apply).
5. Pakistani sources default to Asia/Karachi timezone (+05:00).
6. You MUST return ONLY a valid JSON object matching the requested schema. Do not add conversational text.
"""


class LocalAIProvider(AIProvider):
    """
    Connects to an OpenAI-compatible local AI model server (Ollama, LM Studio, vLLM)
    running on another machine on LAN or bridged via a tunnel.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        model_name: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: Optional[float] = None
    ):
        raw_base = (base_url or settings.LOCAL_AI_BASE_URL or "").rstrip("/")
        # Ensure base URL has /v1 if missing and it's not already pointing to a custom endpoint
        if raw_base and not raw_base.endswith("/v1") and not raw_base.endswith("/api"):
            # If Ollama port 11434 without /v1, add /v1 for OpenAI compatibility
            if ":11434" in raw_base or ":1234" in raw_base or ":8000" in raw_base:
                raw_base = f"{raw_base}/v1"
        self.base_url = raw_base
        self.model = model_name or settings.LOCAL_AI_MODEL or "llama3.2"
        self.api_key = api_key or settings.LOCAL_AI_API_KEY or "not-needed"
        self.timeout = timeout or settings.LOCAL_AI_TIMEOUT or 120.0
        self.last_used_model: Optional[str] = None

    @property
    def model_name(self) -> str:
        return self.last_used_model or f"local/{self.model}"

    @property
    def is_configured(self) -> bool:
        return bool(self.base_url and len(self.base_url) > 5)

    async def test_connection(self) -> Dict[str, Any]:
        """Tests if the remote/local model runner is reachable."""
        if not self.is_configured:
            return {
                "success": False,
                "error": "LOCAL_AI_BASE_URL is not configured.",
                "hint": "Set LOCAL_AI_BASE_URL (e.g., http://192.168.18.48:11434/v1) in environment variables."
            }

        t0 = time.time()
        try:
            headers = {"Authorization": f"Bearer {self.api_key}"}
            async with httpx.AsyncClient(timeout=10.0) as client:
                models_url = f"{self.base_url}/models"
                res = await client.get(models_url, headers=headers)
                latency_ms = round((time.time() - t0) * 1000, 1)

                if res.status_code == 200:
                    data = res.json()
                    available_models = [m.get("id") or m.get("name") for m in data.get("data", [])]
                    return {
                        "success": True,
                        "status_code": 200,
                        "latency_ms": latency_ms,
                        "base_url": self.base_url,
                        "configured_model": self.model,
                        "available_models": available_models[:10],
                        "message": f"Connected to local model server at {self.base_url}"
                    }
                else:
                    return {
                        "success": False,
                        "status_code": res.status_code,
                        "latency_ms": latency_ms,
                        "error": f"Server returned HTTP {res.status_code}: {res.text[:200]}"
                    }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "hint": "Ensure the other machine has the model runner listening on 0.0.0.0 and firewall allows the port."
            }

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
        Extracts structured opportunity details via local model OpenAI chat completions endpoint.
        """
        if not self.is_configured:
            if raise_on_exhaustion:
                raise RuntimeError("LOCAL_AI_BASE_URL is not configured.")
            return self._fallback_deterministic_extraction(raw_text, caption, ocr_text, qr_urls, publication_timestamp)

        json_template = (
            '{\n'
            '  "is_opportunity": true,\n'
            '  "title": "Exact Title",\n'
            '  "category": "Hackathon | Competition | Workshop | Conference | Scholarship | Internship | Startup Program | Other",\n'
            '  "description": "1-2 sentence description",\n'
            '  "organization_name": "Host organization",\n'
            '  "city": "Peshawar or other city",\n'
            '  "venue": "Specific venue or Online",\n'
            '  "start_date": "YYYY-MM-DD or null",\n'
            '  "end_date": "YYYY-MM-DD or null",\n'
            '  "registration_deadline": "YYYY-MM-DD or null",\n'
            '  "registration_url": "URL or null",\n'
            '  "contact_email": "Email or null",\n'
            '  "target_audience": ["Students", "Developers"],\n'
            '  "tags": ["AI", "Software"],\n'
            '  "confidence_score": 0.95\n'
            '}'
        )

        user_prompt = (
            f"You MUST return ONLY a JSON object strictly adhering to this format:\n{json_template}\n\n"
            f"EVIDENCE CONTEXT:\n"
            f"TITLE/TEXT:\n{raw_text}\n\n"
            f"CAPTION:\n{caption or ''}\n\n"
            f"OCR TEXT FROM POSTER:\n{ocr_text or ''}\n\n"
            f"QR CODES DETECTED:\n{', '.join(qr_urls or [])}\n\n"
            f"PUBLICATION TIMESTAMP: {publication_timestamp or 'Now'}\n"
            f"SOURCE TIMEZONE: {source_timezone}"
        )

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": LOCAL_SYSTEM_EXTRACTION_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        }

        chat_url = f"{self.base_url}/chat/completions"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(chat_url, headers=headers, json=payload)
                res.raise_for_status()
                data = res.json()
                raw_content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()

                # Clean markdown fences if present
                clean_content = re.sub(r"^```(?:json)?\s*", "", raw_content, flags=re.MULTILINE)
                clean_content = re.sub(r"\s*```$", "", clean_content, flags=re.MULTILINE).strip()

                parsed_dict = json.loads(clean_content)
                extracted = GeminiExtractionOutput.model_validate(parsed_dict)
                self.last_used_model = f"local/{self.model}"
                logger.info(f"[LocalAI] Successfully extracted opportunity using local model={self.model}")
                return extracted
        except Exception as e:
            logger.error(f"[LocalAI] Extraction failed on {chat_url}: {e}")
            if raise_on_exhaustion:
                raise
            return self._fallback_deterministic_extraction(raw_text, caption, ocr_text, qr_urls, publication_timestamp)

    async def classify_content(self, text: str) -> Dict[str, Any]:
        """Classifies content using the local model."""
        if self.is_configured:
            try:
                headers = {"Authorization": f"Bearer {self.api_key}"}
                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "Classify this announcement into: category (Hackathon, Competition, Workshop, Conference, Scholarship, Internship, Startup Program), and is_opportunity (true/false). Return JSON only."},
                        {"role": "user", "content": text[:1500]},
                    ],
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"},
                }
                async with httpx.AsyncClient(timeout=15.0) as client:
                    res = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                    if res.status_code == 200:
                        content = res.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                        return json.loads(content)
            except Exception as e:
                logger.warning(f"[LocalAI] Classification fallback: {e}")
        return {"category": "Technology Event", "is_opportunity": True}

    async def summarize_opportunity(self, title: str, description: str) -> str:
        """Generates a concise 1-sentence summary."""
        if self.is_configured:
            try:
                headers = {"Authorization": f"Bearer {self.api_key}"}
                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "Summarize this technology/academic opportunity in 1 concise, engaging sentence."},
                        {"role": "user", "content": f"Title: {title}\nDescription: {description[:1000]}"},
                    ],
                    "temperature": 0.2,
                }
                async with httpx.AsyncClient(timeout=15.0) as client:
                    res = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                    if res.status_code == 200:
                        content = res.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                        if content:
                            return content
            except Exception as e:
                logger.warning(f"[LocalAI] Summarize fallback: {e}")
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
        """Generates deterministic vector embedding matching EMBEDDING_DIMENSION."""
        vec = [0.0] * settings.EMBEDDING_DIMENSION
        tokens = text.lower().split()
        for idx, token in enumerate(tokens):
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
            pos = h % settings.EMBEDDING_DIMENSION
            vec[pos] += 1.0 / (idx + 1)
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [round(x / norm, 6) for x in vec]

    def _fallback_deterministic_extraction(
        self,
        raw_text: str,
        caption: Optional[str],
        ocr_text: Optional[str],
        qr_urls: Optional[List[str]],
        publication_timestamp: Optional[str]
    ) -> GeminiExtractionOutput:
        """Deterministic rule-based backup if local server is unreachable."""
        full_corpus = f"{raw_text} {caption or ''} {ocr_text or ''}"
        full_lower = full_corpus.lower()

        lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
        title = lines[0] if lines else "University Announcement"

        reg_url = qr_urls[0] if qr_urls else None
        if not reg_url:
            urls = re.findall(r"https?://[^\s<>\"']+", full_corpus)
            reg_url = urls[0] if urls else None

        category = "Other"
        for kw in ["hackathon", "scholarship", "fellowship", "conference", "workshop", "seminar", "internship", "startup program"]:
            if kw in full_lower:
                category = kw.title()
                break

        return GeminiExtractionOutput(
            is_opportunity=True,
            title=title[:200],
            category=category,
            target_audience=["Students", "Developers"],
            registration_url=reg_url,
            confidence_score=0.85,
            verification_status="needs_review",
            warnings=["Extracted via Local AI Fallback Engine."]
        )
