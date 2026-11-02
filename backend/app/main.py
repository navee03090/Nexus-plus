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
    logger.info("Autonomous Portal Crawler Scheduler initialized.")
    # Wait 15 seconds after boot to let initial startup settle
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
        # Sleep 5 minutes before next polling sweep
        await asyncio.sleep(300)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize schemas and seed baseline data for dev
    logger.info("Initializing NEXUS PULSE services...")
    await init_db()

    # Auto-seed baseline categories and realistic entities if empty
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select, func
        from app.models.category import Category
        from app.models.organization import Organization
        from app.models.source import Source

        from app.models.opportunity import Opportunity
        cat_count = (await session.execute(select(func.count(Category.id)))).scalar() or 0
        opp_count = (await session.execute(select(func.count(Opportunity.id)))).scalar() or 0
        if cat_count == 0 or opp_count == 0:
            logger.info("Seeding authentic Pakistani opportunities and taxonomies...")
            from app.scripts.sync_only_real_data import sync_only_real_data
            await sync_only_real_data()
            from app.scripts.add_nccs_challenge import add_nccs_challenge
            await add_nccs_challenge()
            logger.info("Authentic opportunities successfully initialized.")

    # Start autonomous background crawler task
    crawler_task = asyncio.create_task(periodic_crawler_scheduler())

    yield

    # Shutdown
    logger.info("NEXUS PULSE backend shutting down cleanly.")
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

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["*"],
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
