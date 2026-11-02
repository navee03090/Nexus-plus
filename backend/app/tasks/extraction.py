"""
Extraction Celery Tasks.
Processes raw source items through QR decoding, OCR, Gemini extraction, and deterministic validation.
"""
import asyncio

from app.tasks.celery_app import celery
from app.core.database import AsyncSessionLocal
from app.models.source_item import SourceItem
from app.models.source import Source
from app.models.extraction import Extraction
from app.services.ingestion.base import RawEvidenceItem, RawEvidenceMedia
from app.services.extraction.extractor import ExtractionPipeline
from app.services.opportunities.resolver import OpportunityResolver


@celery.task(bind=True, max_retries=2)
def process_source_item_task(self, source_item_id: str):
    """Executes multimodal extraction and resolution for a source item."""
    async def _async_run():
        async with AsyncSessionLocal() as db:
            s_item = await db.get(SourceItem, source_item_id)
            if not s_item:
                return {"status": "not_found"}

            source = await db.get(Source, s_item.source_id)
            source_trust = source.trust_score if source else 0.85

            raw_item = RawEvidenceItem(
                source_id=s_item.source_id,
                external_id=s_item.external_id,
                canonical_url=s_item.canonical_url,
                title_raw=s_item.title_raw,
                caption_raw=s_item.caption_raw,
                body_raw=s_item.body_raw,
                published_at=s_item.published_at,
                raw_payload=s_item.raw_payload or {},
                content_type=s_item.content_type,
                media_items=[RawEvidenceMedia(media_type=m.media_type, url=m.original_url) for m in s_item.media]
            )

            pipeline = ExtractionPipeline()
            extraction_output, val_result, qr_codes, ocr_text = await pipeline.process_raw_evidence(raw_item)

            # Store extraction audit record
            ext_record = Extraction(
                source_item_id=s_item.id,
                model_name=pipeline.ai_provider.model_name,
                prompt_version="v1.0-pakistan-flash",
                raw_response={"status": extraction_output.status},
                structured_output=val_result.validated_data,
                confidence_score=extraction_output.confidence_score,
                validation_status=val_result.status,
                validation_warnings=val_result.warnings
            )
            db.add(ext_record)
            s_item.status = "extracted"
            await db.commit()

            # Trigger resolution
            flyer_url = s_item.media[0].original_url if s_item.media else None
            opp, is_new, changes = await OpportunityResolver.resolve(
                db=db,
                source_item_id=s_item.id,
                source_id=s_item.source_id,
                source_trust=source_trust,
                validation_result=val_result,
                ai_confidence=extraction_output.confidence_score,
                flyer_url=flyer_url
            )

            return {
                "source_item_id": source_item_id,
                "opportunity_id": opp.id,
                "is_new": is_new,
                "changes_count": len(changes),
            }

    return asyncio.run(_async_run())
