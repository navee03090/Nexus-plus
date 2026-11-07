"""
NEXUS PULSE — Backend Service
Tagline: "Never Miss the Opportunity That Matters."
Production-grade FastAPI application with OpenAPI documentation.
"""
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.database import init_db, AsyncSessionLocal
from app.core.logging import logger
from app.api.v1.health import router as health_router
from app.api.v1.events import router as events_router
from app.api.v1.search import router as search_router
from app.api.v1.users import router as users_router
from app.api.v1.sources import router as sources_router
from app.api.v1.admin import router as admin_router
from app.api.v1.ingestion import router as ingestion_router
from app.api.v1.ingestion_social import router as social_router


async def periodic_crawler_scheduler():
    """Background loop that autonomously checks and runs due crawlers every 5 minutes."""
    if not settings.ENABLE_AUTO_CRAWL:
        logger.info("Auto-crawler disabled (ENABLE_AUTO_CRAWL=false). Use admin Crawl Now.")
        return
    logger.info("Autonomous Portal Crawler Scheduler initialized.")
    await asyncio.sleep(15)
    while True:
        try:
            from app.tasks.ingestion import check_and_run_due_sources
            results = await check_and_run_due_sources()
            if results:
                logger.info(f"Scheduled crawler completed check for {len(results)} due source(s).")
        except asyncio.CancelledError:
            logger.info("Crawler scheduler loop cancelled.")
            break
        except Exception as e:
            logger.error(f"Error in crawler scheduler loop: {e}")
        await asyncio.sleep(300)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize schemas and seed baseline data for dev
    logger.info("Initializing NEXUS PULSE services...")
    try:
        await init_db()
    except Exception as e:
        logger.error(f"Database init failed (continuing): {e}")

    def _seed_uuid(key: str) -> str:
        import uuid as _uuid
        return str(_uuid.uuid5(_uuid.NAMESPACE_URL, f"https://nexus-pulse.org/seed/{key}"))

    # Auto-seed baseline categories and realistic entities if empty
    try:
        async with AsyncSessionLocal() as session:
            from sqlalchemy import select, func
            from app.models.category import Category

            cat_count = (await session.execute(select(func.count(Category.id)))).scalar() or 0
            if cat_count == 0:
                logger.info("Initializing baseline taxonomy categories...")
                for idx, (name, slug, desc, icon) in enumerate([
                    ("Hackathon", "hackathon", "Competitive innovation sprints", "Code2"),
                    ("Competition", "competition", "Skill and challenge contests", "Trophy"),
                    ("Workshop", "workshop", "Hands-on technical bootcamps", "Cpu"),
                    ("Conference", "conference", "Academic research summits", "Presentation"),
                    ("Scholarship", "scholarship", "Financial and tuition scholarships", "Sparkles"),
                    ("Internship", "internship", "Industry job placements", "Briefcase"),
                    ("Startup Program", "startup-program", "Accelerators and incubation", "Rocket"),
                ], 1):
                    session.add(Category(id=_seed_uuid(f"cat-{slug}"), name=name, slug=slug, description=desc, icon=icon, is_active=True, display_order=idx))
                await session.commit()
                logger.info("Baseline taxonomy categories initialized.")

            from app.services.ingestion.official_catalog import ensure_official_catalog
            await ensure_official_catalog(session)
    except Exception as e:
        logger.error(f"Baseline seed skipped: {e}")

    crawler_task = None
    if settings.ENABLE_AUTO_CRAWL:
        crawler_task = asyncio.create_task(periodic_crawler_scheduler())
    else:
        logger.info("Skipping background crawler. Manual crawl via /admin/sources remains available.")

    yield

    logger.info("NEXUS PULSE backend shutting down cleanly.")
    if crawler_task:
        crawler_task.cancel()
        try:
            await crawler_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title=settings.APP_NAME,
    summary=settings.APP_TAGLINE,
    description="AI-powered Opportunity Discovery, Verification, Personalization, and Notification Platform.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware — explicit origins only (credentials + wildcard is invalid in browsers)
origins = [o for o in settings.cors_origins_list if o and o != "*"]
for o in ["https://nexus-plus-gilt.vercel.app", "http://localhost:3000", "http://127.0.0.1:3000"]:
    if o not in origins:
        origins.append(o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure local media directory exists and mount for static file serving
os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.LOCAL_STORAGE_DIR, "flyers"), exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=settings.LOCAL_STORAGE_DIR), name="uploads")

# Standardized Error Handlers (Section 65)
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
                "path": request.url.path,
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Malformed request parameters or body.",
                "details": exc.errors(),
            }
        },
    )


# Register API v1 Routers (specific paths first)
app.include_router(health_router, prefix="/api/v1")
app.include_router(search_router, prefix="/api/v1")
app.include_router(events_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(sources_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(ingestion_router, prefix="/api/v1")
app.include_router(social_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "data": {
            "name": settings.APP_NAME,
            "tagline": settings.APP_TAGLINE,
            "version": "1.0.0",
            "docs": "/docs",
            "api_prefix": "/api/v1",
        }
    }
