"""
Health Check and System Diagnostics Endpoints (Section 85).
"""
import time
from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.core.config import settings
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


@router.get("/health/detailed")
async def detailed_health_check(db: AsyncSession = Depends(get_db)):
    ai_provider = get_ai_provider()
    ai_diag = ai_provider.get_diagnostics()
    has_any_key = ai_provider.gemini.has_valid_api_key or ai_provider.groq.has_valid_api_key

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
