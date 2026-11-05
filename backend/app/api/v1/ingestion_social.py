"""
Social Media Ingestion Endpoints (Dual Engine: Meta Official + Apify Cloud).
Supports real-time Meta Webhooks (Facebook & Instagram) and Apify Cloud Scraper Webhooks.
"""
import hmac
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, Request, Response, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.core.logging import logger
from app.core.security import require_admin
from app.models.source import Source
from app.models.source_item import SourceItem, SourceMedia
from app.models.extraction import Extraction
from app.services.ingestion.apify import ApifySocialNormalizer, ApifyClient
from app.services.extraction.extractor import ExtractionPipeline
from app.services.opportunities.resolver import OpportunityResolver

router = APIRouter(prefix="/ingestion/social", tags=["Social Media Ingestion"])


# =====================================================================
# ENGINE 1: META OFFICIAL WEBHOOKS (Facebook & Instagram)
# =====================================================================

@router.get("/meta", response_class=Response)
async def meta_webhook_verification(
    request: Request,
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """
    Meta Webhook Verification Handshake.
    Called by Meta when registering the Webhook URL in Meta App Dashboard.
    """
    logger.info(f"Meta verification request: mode={hub_mode}, token={hub_verify_token}")

    if hub_mode == "subscribe" and hub_verify_token == settings.META_VERIFY_TOKEN:
        logger.info("Meta Webhook verification succeeded.")
        # Return the challenge as plain text with 200 OK
        return Response(content=hub_challenge or "", media_type="text/plain", status_code=200)

    logger.warning("Meta Webhook verification token mismatch.")
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Verification token mismatch"
    )


def _verify_meta_signature(raw_body: bytes, signature_header: Optional[str]) -> bool:
    """Verifies HMAC-SHA256 signature from Meta if secret is configured."""
    if not settings.META_APP_SECRET or not signature_header:
        # In development without signature enforcement, allow request
        return True

    expected = hmac.new(
        settings.META_APP_SECRET.encode("utf-8"),
        msg=raw_body,
        digestmod=hashlib.sha256
    ).hexdigest()

    # Meta sends format: sha256={hash}
    received = signature_header.replace("sha256=", "").strip()
    return hmac.compare_digest(expected, received)


@router.post("/meta")
async def meta_webhook_receiver(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Receives real-time Page and Instagram changes from Meta Graph API.
    """
    raw_body = await request.body()
    sig_header = request.headers.get("X-Hub-Signature-256")

    if not _verify_meta_signature(raw_body, sig_header):
        logger.warning("Invalid Meta HMAC signature rejected.")
        raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    logger.info(f"Received Meta Webhook event: object={payload.get('object')}")

    # Ensure Meta Source exists in DB
    source_stmt = select(Source).where(Source.parser_key == "meta_official")
    meta_source = (await db.execute(source_stmt)).scalars().first()
    if not meta_source:
        meta_source = Source(
            id=str(uuid.uuid4()),
            name="Meta Official Webhook Pipeline",
            source_type="API",
            platform="Facebook",
            url="https://graph.facebook.com",
            parser_key="meta_official",
            trust_score=0.99,
            status="active",
            is_active=True
        )
        db.add(meta_source)
        await db.flush()

    processed_events = []
    entries = payload.get("entry", [])

    for entry in entries:
        changes = entry.get("changes", [])
        for ch in changes:
            field = ch.get("field")
            val = ch.get("value", {})

            if field in ["feed", "posts"]:
                verb = val.get("verb", "add")
                if verb not in ["add", "edit"]:
                    continue

                msg = val.get("message") or val.get("caption") or ""
                post_id = val.get("post_id") or val.get("id") or str(uuid.uuid4())
                permalink = val.get("link") or f"https://www.facebook.com/{entry.get('id')}/posts/{post_id}"

                media_urls = []
                if val.get("photos"):
                    media_urls.extend(val["photos"])
                elif val.get("photo"):
                    media_urls.append(val["photo"])
                elif val.get("link") and any(ext in val["link"] for ext in [".jpg", ".png", ".webp"]):
                    media_urls.append(val["link"])

                raw_item = {
                    "postId": post_id,
                    "postText": msg,
                    "url": permalink,
                    "images": media_urls,
                    "pageName": f"Page {entry.get('id')}",
                    "timestamp": entry.get("time")
                }

                evidence = ApifySocialNormalizer.normalize_facebook_item(meta_source.id, raw_item)
                if evidence:
                    # Save SourceItem
                    s_item = SourceItem(
                        id=str(uuid.uuid4()),
                        source_id=meta_source.id,
                        external_id=evidence.external_id,
                        canonical_url=evidence.canonical_url,
                        content_hash=evidence.content_hash,
                        title_raw=evidence.title_raw,
                        caption_raw=evidence.caption_raw,
                        body_raw=evidence.body_raw,
                        published_at=evidence.published_at,
                        content_type=evidence.content_type,
                        status="processing"
                    )
                    db.add(s_item)
                    await db.flush()

                    for m in evidence.media_items:
                        s_media = SourceMedia(
                            id=str(uuid.uuid4()),
                            source_item_id=s_item.id,
                            media_type=m.media_type,
                            original_url=m.url,
                            mime_type="image/jpeg"
                        )
                        db.add(s_media)
                    await db.flush()

                    # Downstream Pipeline
                    try:
                        pipeline = ExtractionPipeline()
                        extraction_output, val_result, qr_codes, ocr_text = await pipeline.process_raw_evidence(evidence)

                        extraction_rec = Extraction(
                            id=str(uuid.uuid4()),
                            source_item_id=s_item.id,
                            model_name=pipeline.ai_provider.model_name,
                            prompt_version="meta-official-v1",
                            raw_response=extraction_output.model_dump(),
                            structured_output=val_result.validated_data,
                            confidence_score=extraction_output.confidence_score,
                            validation_status="valid" if val_result.is_valid else "flagged",
                            validation_warnings=val_result.warnings
                        )
                        db.add(extraction_rec)
                        await db.flush()

                        flyer_url = evidence.media_items[0].url if evidence.media_items else None
                        opp, is_new, changes = await OpportunityResolver.resolve(
                            db=db,
                            source_item_id=s_item.id,
                            source_id=meta_source.id,
                            source_trust=meta_source.trust_score,
                            validation_result=val_result,
                            ai_confidence=extraction_output.confidence_score,
                            flyer_url=flyer_url
                        )
                        s_item.status = "processed"
                        processed_events.append({"opp_id": opp.id, "title": opp.title, "is_new": is_new})
                    except Exception as err:
                        logger.error(f"Failed to process Meta event {post_id}: {err}")
                        s_item.status = "error"

    await db.commit()
    return {"status": "ok", "events_processed": len(processed_events), "details": processed_events}


# =====================================================================
# ENGINE 2: APIFY CLOUD SCRAPERS (Facebook & Instagram)
# =====================================================================

@router.post("/apify")
async def apify_webhook_receiver(
    request: Request,
    platform: str = Query("Facebook", description="Facebook or Instagram"),
    db: AsyncSession = Depends(get_db)
):
    """
    Receives scraped posts from Apify Cloud Actors (Facebook Pages or Instagram Profiles).
    Accepts direct items array or Apify dataset webhook notification.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    client = ApifyClient()
    items: List[Dict[str, Any]] = []

    # 1. Check if this is an Apify Run Finished Webhook pointing to a dataset
    if isinstance(body, dict) and body.get("resource", {}).get("defaultDatasetId"):
        dataset_id = body["resource"]["defaultDatasetId"]
        logger.info(f"Fetching items from Apify dataset: {dataset_id}")
        items = await client.fetch_dataset_items(dataset_id, limit=30)
    elif isinstance(body, list):
        items = body
    elif isinstance(body, dict) and body.get("items"):
        items = body["items"]
    elif isinstance(body, dict):
        items = [body]

    logger.info(f"Processing {len(items)} items from Apify ({platform}).")

    # Locate or create Apify Source
    parser_key = f"apify_{platform.lower()}_crawler"
    source_stmt = select(Source).where(Source.parser_key == parser_key)
    source = (await db.execute(source_stmt)).scalars().first()
    if not source:
        source = Source(
            id=str(uuid.uuid4()),
            name=f"Apify {platform} Scraper",
            source_type="Social",
            platform=platform,
            url=f"https://www.{platform.lower()}.com",
            parser_key=parser_key,
            trust_score=0.95,
            status="active",
            is_active=True
        )
        db.add(source)
        await db.flush()

    published_count = 0
    updated_count = 0
    dup_count = 0

    for raw_item in items:
        if platform.lower() == "instagram":
            evidence = ApifySocialNormalizer.normalize_instagram_item(source.id, raw_item)
        else:
            evidence = ApifySocialNormalizer.normalize_facebook_item(source.id, raw_item)

        if not evidence:
            continue

        # Check content hash
        hash_stmt = select(SourceItem).where(
            SourceItem.source_id == source.id,
            SourceItem.content_hash == evidence.content_hash
        )
        existing = (await db.execute(hash_stmt)).scalars().first()
        if existing:
            dup_count += 1
            continue

        # Save SourceItem
        s_item = SourceItem(
            id=str(uuid.uuid4()),
            source_id=source.id,
            external_id=evidence.external_id,
            canonical_url=evidence.canonical_url,
            content_hash=evidence.content_hash,
            title_raw=evidence.title_raw,
            caption_raw=evidence.caption_raw,
            body_raw=evidence.body_raw,
            published_at=evidence.published_at,
            content_type=evidence.content_type,
            status="processing"
        )
        db.add(s_item)
        await db.flush()

        for m in evidence.media_items:
            s_media = SourceMedia(
                id=str(uuid.uuid4()),
                source_item_id=s_item.id,
                media_type=m.media_type,
                original_url=m.url,
                mime_type="image/jpeg"
            )
            db.add(s_media)
        await db.flush()

        # Downstream Multimodal Pipeline
        try:
            pipeline = ExtractionPipeline()
            extraction_output, val_result, qr_codes, ocr_text = await pipeline.process_raw_evidence(evidence)

            extraction_rec = Extraction(
                id=str(uuid.uuid4()),
                source_item_id=s_item.id,
                model_name=pipeline.ai_provider.model_name,
                prompt_version="apify-v1",
                raw_response=extraction_output.model_dump(),
                structured_output=val_result.validated_data,
                confidence_score=extraction_output.confidence_score,
                validation_status="valid" if val_result.is_valid else "flagged",
                validation_warnings=val_result.warnings
            )
            db.add(extraction_rec)
            await db.flush()

            flyer_url = evidence.media_items[0].url if evidence.media_items else None
            opp, is_new, changes = await OpportunityResolver.resolve(
                db=db,
                source_item_id=s_item.id,
                source_id=source.id,
                source_trust=source.trust_score,
                validation_result=val_result,
                ai_confidence=extraction_output.confidence_score,
                flyer_url=flyer_url
            )
            s_item.status = "processed"
            if is_new:
                published_count += 1
            else:
                updated_count += 1

        except Exception as err:
            logger.error(f"Apify item extraction failed: {err}")
            s_item.status = "error"

    # Update Source metrics
    source.last_checked_at = datetime.now(timezone.utc)
    source.last_success_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "status": "success",
        "platform": platform,
        "items_received": len(items),
        "items_published": published_count,
        "items_updated": updated_count,
        "items_duplicated": dup_count
    }


@router.post("/apify/trigger")
async def trigger_apify_scrape(
    target_url: str = Query(..., description="Target Facebook page or Instagram profile URL"),
    platform: str = Query("Facebook", description="Facebook or Instagram"),
    apify_token: Optional[str] = Query(None, description="Optional Apify API Token"),
    admin_claims: Dict[str, Any] = Depends(require_admin)
):
    """
    On-demand trigger that starts an Apify Actor run for a specific target.
    """
    token = apify_token or settings.APIFY_API_TOKEN
    client = ApifyClient(api_token=token)

    if not client.api_token:
        return {
            "success": False,
            "error": "APIFY_API_TOKEN is not configured on Render.",
            "hint": "Please add APIFY_API_TOKEN in your Render Environment Variables (free account at console.apify.com/account/integrations)."
        }

    if platform.lower() == "instagram":
        # Apify Instagram Scraper Actor
        actor_id = "apify/instagram-post-scraper"
        run_input = {
            "username": [target_url.split("/")[-1].replace("@", "")],
            "resultsLimit": 15
        }
    else:
        # Apify Facebook Pages Scraper Actor
        actor_id = "apify/facebook-posts-scraper"
        run_input = {
            "startUrls": [{"url": target_url}],
            "resultsLimit": 15
        }

    try:
        run_data = await client.run_actor(actor_id, run_input)
        return {
            "success": True,
            "message": f"Apify {platform} scraper dispatched successfully.",
            "run_id": run_data.get("id"),
            "actor_id": actor_id,
            "status": run_data.get("status")
        }
    except Exception as e:
        logger.error(f"Failed to trigger Apify actor: {e}")
        return {
            "success": False,
            "error": str(e),
            "hint": "Check if APIFY_API_TOKEN is valid or trial usage limit is reached."
        }


@router.get("/apify/run-status")
async def get_apify_run_status(
    run_id: str = Query(..., description="The Apify Actor Run ID"),
    apify_token: Optional[str] = Query(None, description="Optional Apify API Token"),
    admin_claims: Dict[str, Any] = Depends(require_admin)
):
    """
    Checks the status and progress of an active or finished Apify Actor run.
    """
    token = apify_token or settings.APIFY_API_TOKEN
    client = ApifyClient(api_token=token)
    try:
        data = await client.get_run_status(run_id)
        return {
            "success": True,
            "run_id": run_id,
            "status": data.get("status"),
            "default_dataset_id": data.get("defaultDatasetId"),
            "started_at": data.get("startedAt"),
            "finished_at": data.get("finishedAt"),
            "exit_code": data.get("exitCode")
        }
    except Exception as e:
        return {
            "success": False,
            "run_id": run_id,
            "error": str(e)
        }


@router.post("/apify/sync-run")
async def sync_apify_run(
    run_id: str = Query(..., description="The Apify Actor Run ID"),
    platform: str = Query("Facebook", description="Facebook or Instagram"),
    limit: int = Query(3, le=20, description="Max items to process"),
    admin_claims: Dict[str, Any] = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Directly pulls scraped posts from a finished Apify run dataset,
    normalizes them, runs AI multimodal extraction, and commits to opportunities.
    Processes in memory first to prevent SQLite database locking.
    """
    client = ApifyClient()
    try:
        run_data = await client.get_run_status(run_id)
        status = run_data.get("status")
        if status != "SUCCEEDED":
            return {
                "success": False,
                "status": status,
                "message": f"Run has not finished yet. Current status: {status}. Please wait a moment."
            }

        dataset_id = run_data.get("defaultDatasetId")
        if not dataset_id:
            return {"success": False, "message": "No dataset found for this run."}

        items = await client.fetch_dataset_items(dataset_id, limit=limit)
        if not items:
            return {"success": True, "message": "Run succeeded but no posts were found on the page.", "items_count": 0}

        parser_key = f"apify_{platform.lower()}_crawler"
        source_stmt = select(Source).where(Source.parser_key == parser_key)
        source = (await db.execute(source_stmt)).scalars().first()
        if not source:
            source = Source(
                id=str(uuid.uuid4()),
                name=f"Apify {platform} Scraper",
                source_type="Social",
                platform=platform,
                url=f"https://www.{platform.lower()}.com",
                parser_key=parser_key,
                trust_score=0.95,
                status="active",
                is_active=True
            )
            db.add(source)
            await db.commit()

        published_count = 0
        updated_count = 0
        dup_count = 0

        for raw_item in items:
            if platform.lower() == "instagram":
                evidence = ApifySocialNormalizer.normalize_instagram_item(source.id, raw_item)
            else:
                evidence = ApifySocialNormalizer.normalize_facebook_item(source.id, raw_item)

            if not evidence:
                continue

            hash_stmt = select(SourceItem).where(
                SourceItem.source_id == source.id,
                SourceItem.content_hash == evidence.content_hash
            )
            existing = (await db.execute(hash_stmt)).scalars().first()
            if existing:
                dup_count += 1
                continue

            # Run AI extraction in memory FIRST (No database write lock held!)
            try:
                pipeline = ExtractionPipeline()
                extraction_output, val_result, qr_codes, ocr_text = await pipeline.process_raw_evidence(evidence)

                s_item_id = str(uuid.uuid4())
                s_item = SourceItem(
                    id=s_item_id,
                    source_id=source.id,
                    external_id=evidence.external_id,
                    canonical_url=evidence.canonical_url,
                    content_hash=evidence.content_hash,
                    title_raw=evidence.title_raw,
                    caption_raw=evidence.caption_raw,
                    body_raw=evidence.body_raw,
                    published_at=evidence.published_at,
                    content_type=evidence.content_type,
                    status="processed"
                )
                db.add(s_item)

                for m in evidence.media_items:
                    s_media = SourceMedia(
                        id=str(uuid.uuid4()),
                        source_item_id=s_item_id,
                        media_type=m.media_type,
                        original_url=m.url,
                        mime_type="image/jpeg"
                    )
                    db.add(s_media)

                flyer_url = evidence.media_items[0].url if evidence.media_items else None
                opp, is_new, changes = await OpportunityResolver.resolve(
                    db=db,
                    source_item_id=s_item_id,
                    source_id=source.id,
                    source_trust=source.trust_score,
                    validation_result=val_result,
                    ai_confidence=extraction_output.confidence_score,
                    flyer_url=flyer_url
                )
                if is_new:
                    published_count += 1
                else:
                    updated_count += 1

                # Commit immediately to release lock
                await db.commit()

            except Exception as err:
                logger.error(f"Error processing Apify item: {err}")

        source.last_checked_at = datetime.now(timezone.utc)
        source.last_success_at = datetime.now(timezone.utc)
        await db.commit()

        return {
            "success": True,
            "run_id": run_id,
            "status": "SUCCEEDED",
            "items_scraped": len(items),
            "opportunities_published": published_count,
            "opportunities_updated": updated_count,
            "duplicates_skipped": dup_count
        }

    except Exception as e:
        logger.error(f"Failed to sync Apify run: {e}")
        return {
            "success": False,
            "error": str(e)
        }
