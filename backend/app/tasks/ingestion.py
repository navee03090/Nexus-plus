"""
Ingestion Task Workers & Autonomous Crawler Engine.
Features idempotent execution, polite rate limiting, automated multimodal AI extraction,
deterministic validation, canonical opportunity resolution, and telemetry logging.
"""
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy import select

from app.tasks.celery_app import celery
from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.core.logging import logger
from app.models.source import Source
from app.models.source_item import SourceItem, SourceMedia
from app.models.extraction import Extraction
from app.models.audit import IngestionRun, IngestionError
from app.services.ingestion import get_adapter_for_source
from app.algorithms.rate_limiter import SourceRateLimiter
from app.services.extraction.extractor import ExtractionPipeline
from app.services.opportunities.resolver import OpportunityResolver
from app.services.opportunities.recency import is_stale_announcement, is_past_opportunity
from app.services.ingestion.progress import crawl_progress


async def execute_source_crawl(source_id: str, db: Optional[Any] = None) -> Dict[str, Any]:
    """
    Core Autonomous Crawler execution function.
    Safely executes within an existing AsyncSession or manages its own session.
    Can be called directly by FastAPI async endpoints, Celery workers, or background cron.
    """
    owns_session = db is None
    if owns_session:
        session_ctx = AsyncSessionLocal()
        db = await session_ctx.__aenter__()
    else:
        session_ctx = None

    try:
        source = await db.get(Source, source_id)
        if not source:
            logger.warning(f"Source {source_id} not found.")
            return {"source_id": source_id, "status": "not_found", "error": "Source does not exist."}

        if not source.is_active:
            logger.info(f"Source {source.name} ({source_id}) is paused/inactive. Skipping crawl.")
            return {"source_id": source_id, "status": "skipped", "reason": "Source is inactive"}

        # 1. Enforce Per-Source Crawl Politeness Rate Limit
        await SourceRateLimiter.acquire_slot(source_id, min_delay_seconds=1.0)

        # 2. Register IngestionRun entry for observability
        run = IngestionRun(
            source_id=source.id,
            status="running",
            started_at=datetime.now(timezone.utc)
        )
        db.add(run)
        await db.commit()
        await db.refresh(run)

        try:
            # 3. Instantiate configured adapter and fetch raw evidence items
            adapter = get_adapter_for_source(
                source_id=source.id,
                source_type=source.source_type,
                source_url=source.url,
                parser_key=source.parser_key
            )

            def _report(label: str, done: bool = False) -> None:
                if done:
                    crawl_progress.complete_open(str(source.id), label)
                else:
                    crawl_progress.pulse(str(source.id), label)

            adapter.report_progress = _report
            crawl_progress.pulse(str(source.id), "Reading the website")
            items = await adapter.fetch_items()
            reading = crawl_progress.snapshot(str(source.id)) or {}
            if reading.get("current") == "Reading the website":
                crawl_progress.complete_open(str(source.id), f"Reading the website — {len(items)} items")
            else:
                crawl_progress.complete_open(str(source.id), f"Course list ready — {len(items)} items")

            discovered_count = len(items)
            saved_count = 0
            published_count = 0
            updated_count = 0
            dup_count = 0
            skipped_stale = 0
            already_saved_titles: List[str] = []
            published_titles: List[str] = []
            skipped_titles: List[str] = []
            failed_titles: List[str] = []

            def _remember_skip(item_obj, content_hash_val: str, reason: str) -> None:
                db.add(SourceItem(
                    source_id=source.id,
                    external_id=item_obj.external_id,
                    canonical_url=item_obj.canonical_url,
                    content_hash=content_hash_val,
                    title_raw=item_obj.title_raw,
                    caption_raw=item_obj.caption_raw,
                    body_raw=(item_obj.body_raw or "")[:4000],
                    published_at=item_obj.published_at,
                    raw_payload={"skip_reason": reason},
                    content_type="html" if (item_obj.content_type == "web" or not item_obj.content_type) else item_obj.content_type,
                    status="rejected",
                ))

            # 4. Process each discovered item with deduplication & AI pipeline
            for item in items:
                item_title = item.title_raw or "Untitled"
                content_hash = item.content_hash
                hash_stmt = select(SourceItem).where(
                    SourceItem.source_id == source.id,
                    SourceItem.content_hash == content_hash
                )
                existing_item = (await db.execute(hash_stmt)).scalars().first()

                if existing_item:
                    dup_count += 1
                    already_saved_titles.append(item_title)
                    crawl_progress.complete_open(str(source.id), f"Already saved: {item_title}")
                    continue

                if is_stale_announcement(item.published_at, lookback_days=settings.CRAWL_LOOKBACK_DAYS):
                    skipped_stale += 1
                    skipped_titles.append(f"{item_title} (too old)")
                    _remember_skip(item, content_hash, "stale_announcement")
                    await db.commit()
                    crawl_progress.complete_open(str(source.id), f"Skipped, too old: {item_title}")
                    continue

                crawl_progress.pulse(str(source.id), f"AI model reading: {item_title}")

                s_item_id = str(uuid.uuid4())
                try:
                    pipeline = ExtractionPipeline()
                    extraction_output, val_result, qr_codes, ocr_text = await pipeline.process_raw_evidence(item)
                    data = val_result.validated_data or {}

                    if (not extraction_output.is_opportunity) or is_past_opportunity(
                        registration_deadline=data.get("registration_deadline"),
                        start_date=data.get("start_date"),
                    ):
                        skipped_stale += 1
                        reason = "not a course" if not extraction_output.is_opportunity else "deadline already passed"
                        skipped_titles.append(f"{item_title} ({reason})")
                        _remember_skip(item, content_hash, "past_or_not_opportunity")
                        await db.commit()
                        crawl_progress.complete_open(str(source.id), f"Skipped, {reason}: {item_title}")
                        continue

                    s_item = SourceItem(
                        id=s_item_id,
                        source_id=source.id,
                        external_id=item.external_id,
                        canonical_url=item.canonical_url,
                        content_hash=content_hash,
                        title_raw=item.title_raw,
                        caption_raw=item.caption_raw,
                        body_raw=item.body_raw,
                        published_at=item.published_at,
                        raw_payload=item.raw_payload,
                        content_type="html" if (item.content_type == "web" or not item.content_type) else item.content_type,
                        status="extracted"
                    )
                    db.add(s_item)

                    for m in item.media_items:
                        s_media = SourceMedia(
                            id=str(uuid.uuid4()),
                            source_item_id=s_item_id,
                            media_type=m.media_type,
                            original_url=m.url,
                            mime_type=m.mime_type
                        )
                        db.add(s_media)

                    extraction_rec = Extraction(
                        id=str(uuid.uuid4()),
                        source_item_id=s_item_id,
                        model_name=pipeline.ai_provider.model_name,
                        prompt_version="crawler-v1",
                        raw_response=extraction_output.model_dump(),
                        structured_output=val_result.validated_data,
                        confidence_score=extraction_output.confidence_score,
                        validation_status="valid" if val_result.is_valid else "flagged",
                        validation_warnings=val_result.warnings
                    )
                    db.add(extraction_rec)

                    flyer_url_candidate = None
                    for m in item.media_items:
                        if m.media_type in ["flyer", "image"]:
                            flyer_url_candidate = m.url
                            break

                    opp, is_new, changes = await OpportunityResolver.resolve(
                        db=db,
                        source_item_id=s_item_id,
                        source_id=source.id,
                        source_trust=source.trust_score,
                        validation_result=val_result,
                        ai_confidence=extraction_output.confidence_score,
                        flyer_url=flyer_url_candidate
                    )

                    saved_count += 1
                    if is_new:
                        published_count += 1
                        published_titles.append(opp.title)
                        crawl_progress.complete_open(str(source.id), f"Published: {opp.title}")
                    else:
                        updated_count += 1
                        crawl_progress.complete_open(str(source.id), f"Updated existing listing: {opp.title}")

                    await db.commit()
                    logger.info(f"Crawled item {s_item_id} -> Opportunity: {opp.title} (New={is_new})")

                except Exception as proc_err:
                    logger.error(f"Extraction pipeline failed for item {s_item_id}: {proc_err}")
                    failed_titles.append(item_title)
                    crawl_progress.complete_open(str(source.id), f"AI model failed: {item_title}")

            # 5. Update Source Health & Telemetry Metrics
            source.last_checked_at = datetime.now(timezone.utc)
            source.last_success_at = datetime.now(timezone.utc)
            source.consecutive_failures = 0
            source.status = "active"
            SourceRateLimiter.record_success(source_id)

            # 6. Finalize IngestionRun Record
            run.status = "success"
            run.completed_at = datetime.now(timezone.utc)
            run.items_found = discovered_count
            run.items_processed = saved_count
            run.items_duplicated = dup_count
            run.items_rejected = skipped_stale
            await db.commit()
            outcome = {
                "source_id": source_id,
                "source_name": source.name,
                "status": "success",
                "items_found": discovered_count,
                "items_saved": saved_count,
                "items_published": published_count,
                "items_updated": updated_count,
                "items_duplicated": dup_count,
                "items_skipped_stale": skipped_stale,
                "already_saved": already_saved_titles,
                "published": published_titles,
                "skipped": skipped_titles,
                "failed": failed_titles,
            }
            crawl_progress.attach(str(source.id), outcome)
            crawl_progress.finish(str(source.id), "success")
            finished = crawl_progress.snapshot(str(source.id)) or {}

            return {
                **outcome,
                "steps": finished.get("steps", []),
            }

        except Exception as e:
            logger.error(f"Ingestion failed for source {source.name} ({source_id}): {e}")
            backoff = SourceRateLimiter.record_failure(source_id)
            source.consecutive_failures += 1
            source.last_failure_at = datetime.now(timezone.utc)
            if source.consecutive_failures >= 3:
                source.status = "warning"
            if source.consecutive_failures >= 5:
                source.status = "failing"

            run.status = "failed"
            run.completed_at = datetime.now(timezone.utc)
            run.error_message = str(e)

            err_log = IngestionError(
                source_id=source.id,
                task_name="execute_source_crawl",
                error_type=type(e).__name__,
                message=str(e)
            )
            db.add(err_log)
            await db.commit()
            crawl_progress.attach(str(source.id), {
                "source_id": source_id,
                "source_name": source.name,
                "status": "failed",
                "error": str(e),
            })
            crawl_progress.finish(str(source.id), "failed")
            failed = crawl_progress.snapshot(str(source.id)) or {}

            return {
                "source_id": source_id,
                "source_name": source.name,
                "status": "failed",
                "error": str(e),
                "backoff_recommended_sec": backoff,
                "steps": failed.get("steps", []),
            }

    finally:
        if owns_session and session_ctx:
            await session_ctx.__aexit__(None, None, None)


async def check_and_run_due_sources() -> List[Dict[str, Any]]:
    """
    Checks all active monitored sources and automatically triggers crawls
    for sources that have reached their scheduled crawl frequency.
    """
    results: List[Dict[str, Any]] = []
    due_source_ids: List[str] = []
    async with AsyncSessionLocal() as db:
        stmt = select(Source).where(Source.is_active.is_(True))
        res = await db.execute(stmt)
        sources = res.scalars().all()

        now = datetime.now(timezone.utc)
        for s in sources:
            if (s.source_type and s.source_type.lower() in ["webhook", "curator"]) or \
               (s.parser_key and any(k in s.parser_key.lower() for k in ["webhook", "curator"])):
                continue

            is_due = False
            if s.last_checked_at is None:
                is_due = True
            else:
                last_checked = s.last_checked_at
                if last_checked.tzinfo is None:
                    last_checked = last_checked.replace(tzinfo=timezone.utc)
                elapsed_sec = (now - last_checked).total_seconds()
                if elapsed_sec >= (s.crawl_frequency or 3600):
                    is_due = True

            if is_due:
                due_source_ids.append(s.id)

    # Crawl each due source with an independent, non-overlapping session
    for source_id in due_source_ids:
        logger.info(f"Source {source_id} is due for crawl. Triggering crawl now...")
        try:
            crawl_res = await execute_source_crawl(source_id)
            results.append(crawl_res)
        except Exception as err:
            logger.error(f"Failed to crawl due source {source_id}: {err}")
            results.append({"source_id": source_id, "status": "failed", "error": str(err)})

    return results


@celery.task(bind=True, max_retries=3, default_retry_delay=30)
def fetch_source_task(self, source_id: str):
    """
    Celery task wrapper for source crawl.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return loop.create_task(execute_source_crawl(source_id))
        else:
            return loop.run_until_complete(execute_source_crawl(source_id))
    except RuntimeError:
        return asyncio.run(execute_source_crawl(source_id))


@celery.task
def scheduled_crawler_task():
    """
    Periodic Celery Beat task to check and run due sources.
    """
    try:
        return asyncio.run(check_and_run_due_sources())
    except Exception as e:
        logger.error(f"Error in scheduled_crawler_task: {e}")
        return []


@celery.task
def source_health_check_task():
    """Periodic health inspection of active sources."""
    async def _async_run():
        async with AsyncSessionLocal() as db:
            stmt = select(Source).where(Source.is_active.is_(True))
            res = await db.execute(stmt)
            sources = res.scalars().all()
            for s in sources:
                logger.info(f"Health audit for source {s.name} ({s.id}): Status={s.status}, Failures={s.consecutive_failures}")
    try:
        asyncio.run(_async_run())
    except Exception as e:
        logger.error(f"Error in source_health_check_task: {e}")
