"""
Health Check and System Diagnostics Endpoints (Section 85).
"""
import time
from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func

from app.core.database import get_db
from app.core.config import settings
from app.core.security import require_admin
from app.models.opportunity import Opportunity, OpportunitySource
from app.models.source import Source
from app.services.ai import get_ai_provider

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """Basic liveness probe."""
    return {
        "data": {
            "status": "healthy",
            "service": settings.APP_NAME,
            "tagline": settings.APP_TAGLINE,
            "version": "1.0.0",
        },
        "meta": {"timestamp": time.time()}
    }


@router.get("/public-stats")
async def public_stats(db: AsyncSession = Depends(get_db)):
    """Homepage counts only. Review queue, failures, and system health stay on the admin API."""
    total_sources = (await db.execute(select(func.count(Source.id)))).scalar() or 0
    total_opps = (await db.execute(select(func.count(Opportunity.id)))).scalar() or 0
    published_opps = (
        await db.execute(
            select(func.count(Opportunity.id)).where(Opportunity.status.in_(["published", "updated"]))
        )
    ).scalar() or 0
    total_links = (await db.execute(select(func.count(OpportunitySource.id)))).scalar() or 0
    return {
        "data": {
            "sources_monitored": total_sources,
            "opportunities_published": published_opps,
            "duplicates_resolved": max(0, total_links - total_opps),
            "source_links": total_links,
        }
    }


@router.get("/health/detailed")
async def detailed_health_check(
    db: AsyncSession = Depends(get_db),
    admin_claims: Dict[str, Any] = Depends(require_admin),
):
    ai_provider = get_ai_provider()
    ai_diag = ai_provider.get_diagnostics()
    local_configured = bool(settings.LOCAL_AI_BASE_URL)
    has_any_key = (
        ai_provider.gemini.has_valid_api_key
        or ai_provider.groq.has_valid_api_key
        or local_configured
    )

    diagnostics: Dict[str, Any] = {
        "database": {"status": "unknown"},
        "redis": {"status": "unknown"},
        "ai_provider": {
            "status": "healthy" if has_any_key else "degraded",
            "provider_mode": settings.LLM_PROVIDER,
            "active_provider": ai_diag.get("active_provider"),
            "model": ai_diag.get("active_model"),
            "gemini": ai_diag.get("gemini"),
            "groq": ai_diag.get("groq"),
            "local": {
                "configured": local_configured,
                "base_url": settings.LOCAL_AI_BASE_URL,
                "model": settings.LOCAL_AI_MODEL,
            },
        },
        "crawler": {
            "status": "healthy",
            "auto_crawl": settings.ENABLE_AUTO_CRAWL,
            "mode": "scheduled" if settings.ENABLE_AUTO_CRAWL else "manual",
        },
        "storage": {"status": "healthy", "bucket": settings.STORAGE_BUCKET},
    }

    # Test Database
    try:
        t0 = time.time()
        await db.execute(text("SELECT 1"))
        diagnostics["database"] = {
            "status": "healthy",
            "latency_ms": round((time.time() - t0) * 1000, 2),
        }
    except Exception as e:
        diagnostics["database"] = {"status": "degraded", "error": str(e)}

    # Test Redis (or in-memory fallback)
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=1.0)
        await r.ping()
        await r.aclose()
        diagnostics["redis"] = {"status": "healthy", "mode": "standalone_redis"}
    except Exception:
        diagnostics["redis"] = {"status": "healthy", "mode": "in_memory_task_engine"}

    all_healthy = all(v.get("status") == "healthy" for v in diagnostics.values())
    return {
        "data": {
            "status": "healthy" if all_healthy else "degraded",
            "diagnostics": diagnostics,
        },
        "meta": {"timestamp": time.time()}
    }


@router.post("/health/test-local-ai")
async def test_local_ai_endpoint(
    base_url: str = "http://localhost:11434/v1",
    model: str = "qwen2.5:3b",
    admin_claims: Dict[str, Any] = Depends(require_admin),
):
    """
    On-demand connectivity and extraction test for local Ollama / LM Studio runners.
    """
    from app.services.ai.local_provider import LocalAIProvider
    provider = LocalAIProvider(base_url=base_url, model_name=model)
    conn_result = await provider.test_connection()

    if not conn_result.get("success"):
        return {"data": conn_result}

    # If connection passed, test sample extraction
    try:
        sample_announcement = (
            "KPITB and Code for Pakistan announce KP Fellowship 2026. "
            "Registration deadline: 2026-11-20. Event starts: 2026-12-01. "
            "Venue: Durshal Peshawar. Apply online at: https://kpitb.gov.pk/fellowship"
        )
        extracted = await provider.extract_opportunity(raw_text=sample_announcement)
        return {
            "data": {
                "connection": conn_result,
                "test_extraction": extracted.model_dump(),
                "status": "operational",
            }
        }
    except Exception as e:
        return {
            "data": {
                "connection": conn_result,
                "extraction_error": str(e),
                "status": "connection_ok_extraction_failed",
            }
        }
