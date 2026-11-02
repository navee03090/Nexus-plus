"""
Direct Ingestion & Curator Endpoints.
Allows admin, scheduler, and 1-Click Curator Extension to ingest announcements.
"""
import os
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from urllib.parse import urlparse
import httpx
from fastapi import APIRouter, Depends, Query, Form, File, UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.core.security import require_admin, validate_target_url
from app.models.source import Source
from app.models.source_item import SourceItem, SourceMedia
from app.models.extraction import Extraction
from app.services.ingestion.base import RawEvidenceItem, RawEvidenceMedia
from app.services.extraction.extractor import ExtractionPipeline
from app.services.opportunities.resolver import OpportunityResolver
from app.tasks.ingestion import fetch_source_task
from app.core.logging import logger

router = APIRouter(prefix="/ingestion", tags=["Ingestion Pipeline"])


@router.post("/trigger")
async def trigger_ingestion(
    source_id: Optional[str] = Query(None, description="Optional specific source ID"),
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin)
):
    """Triggers ingestion for a specific source or all active sources."""
    if source_id:
        source = await db.get(Source, source_id)
        if not source:
            return {"error": {"code": "NOT_FOUND", "message": f"Source {source_id} not found."}}
        sources = [source]
    else:
        stmt = select(Source).where(Source.is_active.is_(True))
        res = await db.execute(stmt)
        sources = res.scalars().all()

    dispatched = []
    for s in sources:
        try:
            from app.tasks.ingestion import execute_source_crawl
            result = await execute_source_crawl(s.id, db=db)
            dispatched.append({"source_id": s.id, "name": s.name, "result": result})
        except Exception as e:
            logger.error(f"Failed to trigger {s.id}: {e}")
            dispatched.append({"source_id": s.id, "name": s.name, "error": str(e)})

    return {
        "data": {
            "sources_processed": len(sources),
            "details": dispatched,
        }
    }


@router.post("/curator")
async def curate_opportunity(
    source_url: str = Form(..., description="Canonical post link from LinkedIn, Facebook, Instagram, or Web"),
    platform: str = Form("Web", description="Platform origin: LinkedIn, Facebook, Instagram, Twitter, Web"),
    raw_text: Optional[str] = Form(None, description="Post text, caption, or commentary"),
    flyer_file: Optional[UploadFile] = File(None, description="Uploaded flyer poster image"),
    flyer_url: Optional[str] = Form(None, description="Direct flyer image URL"),
    tags: Optional[str] = Form(None, description="Optional tag hints (comma-separated)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Curator Ingestion Endpoint (Phase 1):
    Directly ingests social media announcements or manual flyer drops from the
    Browser Extension or Admin Portal Dropzone.
    Runs multimodal OCR -> Gemini structured extraction -> validation -> deduplication.
    """
    clean_url = source_url.strip()
    try:
        validate_target_url(clean_url)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or unsafe source URL: {str(e)}"
        )

    # 1. Locate or create Curator Source for this platform
    stmt = select(Source).where(
        Source.parser_key == "curator_manual",
        Source.platform == platform
    )
    res = await db.execute(stmt)
    source = res.scalars().first()

    if not source:
        source = Source(
            id=str(uuid.uuid4()),
            name=f"{platform} Curator Pipeline",
            source_type="Manual",
            platform=platform,
            url=clean_url,
            parser_key="curator_manual",
            trust_score=0.95,
            status="active",
            is_active=True
        )
        db.add(source)
        await db.flush()

    # 2. Process image bytes (from file upload or flyer URL)
    image_bytes: Optional[bytes] = None
    flyer_public_url: Optional[str] = None

    if flyer_file and flyer_file.filename:
        image_bytes = await flyer_file.read()
        ext = os.path.splitext(flyer_file.filename)[1] or ".png"
        fname = f"curator_{uuid.uuid4().hex[:12]}{ext}"
        flyer_dir = os.path.join(settings.LOCAL_STORAGE_DIR, "flyers")
        os.makedirs(flyer_dir, exist_ok=True)
        file_path = os.path.join(flyer_dir, fname)
        with open(file_path, "wb") as f:
            f.write(image_bytes)
        flyer_public_url = f"/static/uploads/flyers/{fname}"
    elif flyer_url and flyer_url.strip():
        clean_flyer_url = flyer_url.strip()
        try:
            validate_target_url(clean_flyer_url)
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(clean_flyer_url)
                if resp.status_code == 200:
                    image_bytes = resp.content
                    ext = os.path.splitext(urlparse(clean_flyer_url).path)[1] or ".png"
                    fname = f"curator_{uuid.uuid4().hex[:12]}{ext}"
                    flyer_dir = os.path.join(settings.LOCAL_STORAGE_DIR, "flyers")
                    os.makedirs(flyer_dir, exist_ok=True)
                    file_path = os.path.join(flyer_dir, fname)
                    with open(file_path, "wb") as f:
                        f.write(image_bytes)
                    flyer_public_url = f"/static/uploads/flyers/{fname}"
                else:
                    flyer_public_url = clean_flyer_url
        except Exception as e:
            logger.warning(f"Could not download flyer_url {clean_flyer_url}: {e}")
            flyer_public_url = clean_flyer_url

    # 3. Insert immutable Raw Evidence Item
    content_raw_str = f"{clean_url}:{raw_text or ''}:{len(image_bytes) if image_bytes else 0}"
    content_hash = hashlib.sha256(content_raw_str.encode("utf-8")).hexdigest()

    title_preview = None
    if raw_text and raw_text.strip():
        lines = [line.strip() for line in raw_text.strip().splitlines() if line.strip()]
        if lines:
            title_preview = lines[0][:150]

    source_item = SourceItem(
        id=str(uuid.uuid4()),
        source_id=source.id,
        external_id=f"curator-{uuid.uuid4().hex[:8]}",
        canonical_url=clean_url,
        content_hash=content_hash,
        title_raw=title_preview or f"{platform} Announcement ({datetime.now().strftime('%b %d')})",
        caption_raw=raw_text[:500] if raw_text else "",
        body_raw=raw_text or "",
        published_at=datetime.now(timezone.utc),
        raw_payload={"source_url": clean_url, "platform": platform, "tags": tags},
        content_type="mixed" if image_bytes else "text",
        status="processing"
    )
    db.add(source_item)
    await db.flush()

    # 4. Attach Media record if image exists
    if image_bytes and flyer_public_url:
        media_rec = SourceMedia(
            id=str(uuid.uuid4()),
            source_item_id=source_item.id,
            media_type="flyer",
            original_url=flyer_url or clean_url,
            storage_path=flyer_public_url,
            mime_type=flyer_file.content_type if flyer_file and flyer_file.content_type else "image/png",
            file_hash=hashlib.sha256(image_bytes).hexdigest()
        )
        db.add(media_rec)
        await db.flush()

    # 5. Build RawEvidenceItem and run ExtractionPipeline
    media_items: List[RawEvidenceMedia] = []
    if image_bytes or flyer_public_url:
        media_items.append(
            RawEvidenceMedia(
                media_type="flyer",
                url=flyer_public_url,
                bytes_data=image_bytes
            )
        )

    raw_evidence = RawEvidenceItem(
        source_id=source.id,
        external_id=source_item.external_id,
        canonical_url=clean_url,
        title_raw=source_item.title_raw,
        caption_raw=source_item.caption_raw,
        body_raw=source_item.body_raw,
        published_at=source_item.published_at,
        content_type=source_item.content_type,
        media_items=media_items
    )

    pipeline = ExtractionPipeline()
    extraction_output, val_result, qr_codes, ocr_text = await pipeline.process_raw_evidence(raw_evidence)

    # 6. Save structured Extraction record
    extraction_rec = Extraction(
        id=str(uuid.uuid4()),
        source_item_id=source_item.id,
        model_name=pipeline.ai_provider.model_name,
        prompt_version="curator-v1",
        raw_response=extraction_output.model_dump(),
        structured_output=val_result.validated_data,
        confidence_score=extraction_output.confidence_score,
        validation_status="valid" if val_result.is_valid else "flagged",
        validation_warnings=val_result.warnings
    )
    db.add(extraction_rec)
    await db.flush()

    # 7. Resolve into Canonical Opportunity (Deduplication + Change Detection)
    opp, is_new, changes = await OpportunityResolver.resolve(
        db=db,
        source_item_id=source_item.id,
        source_id=source.id,
        source_trust=source.trust_score,
        validation_result=val_result,
        ai_confidence=extraction_output.confidence_score,
        flyer_url=flyer_public_url
    )

    return {
        "success": True,
        "data": {
            "opportunity": {
                "id": opp.id,
                "title": opp.title,
                "slug": opp.slug,
                "summary": opp.summary,
                "registration_deadline": opp.registration_deadline.isoformat() if opp.registration_deadline else None,
                "start_date": opp.start_date.isoformat() if opp.start_date else None,
                "venue": opp.venue,
                "city": opp.city,
                "registration_url": opp.registration_url or opp.application_url or clean_url,
                "status": opp.status,
                "trust_score": opp.trust_score,
                "ai_confidence": opp.ai_confidence,
                "verification_status": opp.verification_status,
                "flyer_url": opp.flyer_url,
            },
            "is_new": is_new,
            "changes_detected": changes,
            "qr_codes": [q.get("data") for q in qr_codes if q.get("data")],
            "ocr_preview": ocr_text[:200] if ocr_text else None,
            "source_item_id": source_item.id
        }
    }
