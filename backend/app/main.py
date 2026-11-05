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
                session.add(Category(id=f"cat-{slug}", name=name, slug=slug, description=desc, icon=icon, is_active=True, display_order=idx))
            await session.commit()
            logger.info("Baseline taxonomy categories initialized.")

        # Baseline Organizations and Monitored Sources (Real Pakistani Channels)
        src_count = (await session.execute(select(func.count(Source.id)))).scalar() or 0
        if src_count == 0:
            logger.info("Initializing genuine monitored channels and organizations...")
            org_defs = [
                ("org-kpitb", "KPITB", "kpitb", "Khyber Pakhtunkhwa Information Technology Board", "Government", "Pakistan", "Peshawar", "https://www.kpitb.gov.pk", 0.99),
                ("org-uet", "UET Peshawar", "uet-peshawar", "University of Engineering and Technology Peshawar", "University", "Pakistan", "Peshawar", "https://www.uetpeshawar.edu.pk", 0.98),
                ("org-nic", "NIC Peshawar", "nic-peshawar", "National Incubation Center Peshawar", "Incubator", "Pakistan", "Peshawar", "https://nicpeshawar.pk", 0.96),
                ("org-gdg", "GDG Peshawar", "gdg-peshawar", "Google Developer Groups Peshawar Community", "Community", "Pakistan", "Peshawar", "https://gdg.community.dev/gdg-peshawar", 0.95),
                ("org-giki", "GIK Institute", "gik-institute", "Ghulam Ishaq Khan Institute of Engineering Sciences and Technology", "University", "Pakistan", "Topi", "https://giki.edu.pk", 0.97),
                ("org-fast", "FAST-NUCES Peshawar", "fast-pwr", "National University of Computer and Emerging Sciences Peshawar Campus", "University", "Pakistan", "Peshawar", "https://pwr.nu.edu.pk", 0.96),
                ("org-hec", "HEC Pakistan", "hec-pakistan", "Higher Education Commission of Pakistan", "Government", "Pakistan", "Islamabad", "https://www.hec.gov.pk", 0.99),
            ]
            for org_id, name, slug, desc, o_type, country, city, web, trust in org_defs:
                session.add(Organization(id=org_id, name=name, slug=slug, description=desc, organization_type=o_type, country=country, city=city, website_url=web, trust_score=trust))
            await session.flush()

            source_defs = [
                ("src-kpitb-web", "org-kpitb", "KPITB Official Announcements", "Website", "Government Portal", "https://www.kpitb.gov.pk", "kpitb_portal", 0.99),
                ("src-kpitb-fb", "org-kpitb", "KPITB Official Facebook Page", "Social", "Facebook", "https://www.facebook.com/kpitbgov", "apify_facebook_crawler", 0.97),
                ("src-uet-web", "org-uet", "UET Peshawar Notice Board", "Website", "University Portal", "https://www.uetpeshawar.edu.pk", "uet_peshawar_events", 0.98),
                ("src-nic-web", "org-nic", "NIC Peshawar Programs", "Website", "Incubator Portal", "https://nicpeshawar.pk", "nic_peshawar_events", 0.96),
                ("src-nic-fb", "org-nic", "NIC Peshawar Facebook Community", "Social", "Facebook", "https://www.facebook.com/nicpeshawar", "apify_facebook_crawler", 0.95),
                ("src-gdg-ig", "org-gdg", "GDG Peshawar Instagram Feed", "Social", "Instagram", "https://www.instagram.com/gdgpeshawar", "apify_instagram_crawler", 0.95),
                ("src-giki-web", "org-giki", "GIKI Competitions & Hackathons", "Website", "University Website", "https://giki.edu.pk", "giki_events", 0.96),
                ("src-fast-web", "org-fast", "FAST Peshawar ACM Notices", "Website", "University Website", "https://pwr.nu.edu.pk", "fast_pwr", 0.95),
                ("src-hec-web", "org-hec", "HEC Scholarships Registry", "Website", "Government Registry", "https://www.hec.gov.pk", "hec_scholarships", 0.99),
            ]
            for src_id, org_id, name, s_type, plat, url, p_key, trust in source_defs:
                session.add(Source(
                    id=src_id,
                    organization_id=org_id,
                    name=name,
                    source_type=s_type,
                    platform=plat,
                    url=url,
                    parser_key=p_key,
                    trust_score=trust,
                    status="active",
                    is_active=True
                ))
            await session.commit()
            logger.info("Genuine monitored channels and organizations initialized.")

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
