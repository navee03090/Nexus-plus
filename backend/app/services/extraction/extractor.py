"""
Multimodal Extraction Pipeline Orchestrator (Section 22 & 31).
Coordinates Media Processing -> QR Decoding -> OCR -> Gemini Extraction -> Deterministic Validation.
"""
from typing import Dict, Any, Optional, List, Tuple
import httpx

from app.services.ingestion.base import RawEvidenceItem
from app.services.extraction.qr import QRCodeProcessor
from app.services.extraction.ocr import OCRProcessor
from app.services.extraction.validator import DeterministicValidator, ValidationResult
from app.services.ai.base import AIProvider
from app.services.ai import get_ai_provider
from app.schemas.opportunity import GeminiExtractionOutput
from app.core.config import settings
from app.core.logging import logger


class ExtractionPipeline:
    """Orchestrates extraction from raw evidence into validated structured data."""

    def __init__(self, ai_provider: Optional[AIProvider] = None):
        self.ai_provider = ai_provider or get_ai_provider()

    async def process_raw_evidence(self, item: RawEvidenceItem) -> Tuple[GeminiExtractionOutput, ValidationResult, List[Dict[str, Any]], str]:
        """
        Processes a raw evidence item end-to-end:
        1. Download media bytes if flyer attached
        2. Detect and decode QR codes (extracting registration URLs)
        3. OCR text from poster
        4. Pass multimodal context to Gemini
        5. Run deterministic validation
        Returns: (extraction_output, validation_result, qr_codes, ocr_text)
        """
        qr_codes: List[Dict[str, Any]] = []
        ocr_text = ""
        image_bytes: Optional[bytes] = None

        # Inspect media if flyer exists
        if item.media_items:
            primary_media = item.media_items[0]
            if primary_media.bytes_data:
                image_bytes = primary_media.bytes_data
            elif primary_media.url and primary_media.url.startswith("http"):
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        resp = await client.get(primary_media.url)
                        if resp.status_code == 200:
                            image_bytes = resp.content
                except Exception as e:
                    logger.warning(f"Could not download media {primary_media.url}: {e}")

        # Step 2: QR Code extraction
        if image_bytes:
            qr_codes = QRCodeProcessor.decode_from_bytes(image_bytes)
            # Step 3: OCR
            ocr_text = OCRProcessor.extract_text(image_bytes)

        qr_urls = [q["data"] for q in qr_codes if q.get("is_url")]

        # Step 4: AI Extraction with Gemini
        pub_iso = item.published_at.isoformat() if item.published_at else None
        combined_raw = f"{item.title_raw or ''}\n{item.body_raw or ''}".strip()
        extraction_output = await self.ai_provider.extract_opportunity(
            raw_text=combined_raw,
            caption=item.caption_raw,
            ocr_text=ocr_text,
            qr_urls=qr_urls,
            image_bytes=image_bytes,
            publication_timestamp=pub_iso,
            source_timezone=settings.DEFAULT_TIMEZONE,
        )

        # Step 5: Deterministic Validation
        val_result = DeterministicValidator.validate(extraction_output)

        return extraction_output, val_result, qr_codes, ocr_text
