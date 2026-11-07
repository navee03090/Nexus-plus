import asyncio
import os
import sys
import uuid
import json
import sqlite3
from datetime import datetime, timezone

backend_dir = os.path.abspath("backend")
sys.path.insert(0, backend_dir)

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from app.models.category import Category, Tag, OpportunityTag
from app.models.organization import Organization
from app.models.source import Source
from app.models.source_item import SourceItem, SourceMedia
from app.models.opportunity import Opportunity, OpportunitySource
from app.models.audit import VerificationQueue, AuditLog

sqlite_path = "backend/nexus_pulse.db"
supabase_url = "postgresql+asyncpg://postgres.ervfizmcgcatlwynupbt:Alphalmg9898%40@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

VALID_ORG_TYPES = {
    'Government', 'University', 'Research Institute', 'NGO',
    'Company', 'Startup', 'Technology Organization',
    'International Organization', 'Other'
}

VALID_SOURCE_TYPES = {
    'Website', 'RSS', 'Sitemap', 'API', 'Social', 'PDF', 'Manual', 'Webhook'
}

VALID_SITEM_STATUSES = {
    'discovered', 'processing', 'extracted', 'duplicated', 'rejected', 'archived'
}

VALID_CONTENT_TYPES = {
    'text', 'image', 'video', 'pdf', 'html', 'mixed'
}

VALID_OPP_STATUSES = {
    'discovered', 'processing', 'pending_review', 'published',
    'updated', 'cancelled', 'postponed', 'expired', 'rejected'
}

VALID_VERIF_STATUSES = {
    'unverified', 'ai_verified', 'human_verified', 'source_verified', 'rejected'
}

VALID_QUEUE_STATUSES = {
    'pending', 'approved', 'rejected', 'merged'
}

def to_uuid(val):
    if not val:
        return None
    try:
        return str(uuid.UUID(str(val)))
    except (ValueError, AttributeError):
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, str(val)))

def parse_dt(val):
    if not val:
        return None
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val
    try:
        dt = datetime.fromisoformat(str(val))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None

def parse_json(val):
    if not val:
        return []
    if isinstance(val, (list, dict)):
        return val
    try:
        return json.loads(str(val))
    except Exception:
        return []

async def migrate():
    print("Opening SQLite and Supabase connections...")
    s_conn = sqlite3.connect(sqlite_path)
    s_conn.row_factory = sqlite3.Row
    s_cur = s_conn.cursor()

    engine = create_async_engine(supabase_url, echo=False)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as session:
        # 1. Categories
        s_cur.execute("SELECT * FROM categories")
        rows = s_cur.fetchall()
        cat_map = {}
        res = await session.execute(select(Category))
        for c in res.scalars().all():
            cat_map[c.slug] = c.id

        for r in rows:
            slug = r["slug"]
            if slug not in cat_map:
                new_cat_id = to_uuid(r["id"])
                new_cat = Category(
                    id=new_cat_id,
                    name=r["name"],
                    slug=slug,
                    description=r["description"],
                    icon=r["icon"] or "Tag",
                    display_order=r["display_order"] or 1,
                    is_active=True
                )
                session.add(new_cat)
                cat_map[slug] = new_cat_id
        await session.commit()
        print(f"Categories ready: {len(cat_map)} categories mapped.")

        # 2. Organizations
        s_cur.execute("SELECT * FROM organizations")
        rows = s_cur.fetchall()
        org_map = {}
        res = await session.execute(select(Organization))
        for o in res.scalars().all():
            org_map[o.slug] = o.id

        for r in rows:
            slug = r["slug"]
            if slug not in org_map:
                new_org_id = to_uuid(r["id"])
                raw_type = r["organization_type"] or "Other"
                if raw_type not in VALID_ORG_TYPES:
                    raw_type = "Technology Organization" if raw_type.lower() == "community" else "Other"

                new_org = Organization(
                    id=new_org_id,
                    name=r["name"],
                    slug=slug,
                    description=r["description"],
                    organization_type=raw_type,
                    country=r["country"] or "Pakistan",
                    city=r["city"] or "Peshawar",
                    website_url=r["website_url"],
                    logo_url=r["logo_url"],
                    official_status=r["official_status"] or "official",
                    trust_score=float(r["trust_score"] or 0.85),
                    verified=bool(r["verified"])
                )
                session.add(new_org)
                org_map[slug] = new_org_id
        await session.commit()
        print(f"Organizations ready: {len(org_map)} organizations mapped.")

        # 3. Sources
        s_cur.execute("SELECT * FROM sources")
        rows = s_cur.fetchall()
        source_id_map = {}
        res = await session.execute(select(Source))
        sources_list = res.scalars().all()
        existing_sources = {s.parser_key: s.id for s in sources_list}
        existing_source_ids = {s.id for s in sources_list}

        for r in rows:
            old_id = r["id"]
            new_id = to_uuid(old_id)
            source_id_map[old_id] = new_id

            if new_id not in existing_source_ids and r["parser_key"] not in existing_sources:
                org_id = None
                if r["organization_id"]:
                    org_id = to_uuid(r["organization_id"])
                    if org_id not in org_map.values():
                        org_id = list(org_map.values())[0] if org_map else None

                raw_stype = r["source_type"] or "Website"
                if raw_stype not in VALID_SOURCE_TYPES:
                    raw_stype = "Social" if "social" in raw_stype.lower() else "Website"

                src = Source(
                    id=new_id,
                    organization_id=org_id,
                    name=r["name"],
                    source_type=raw_stype,
                    platform=r["platform"] or "Portal",
                    url=r["url"],
                    identifier=r["identifier"],
                    status=r["status"] or "active",
                    trust_score=float(r["trust_score"] or 0.95),
                    crawl_frequency=r["crawl_frequency"] or 3600,
                    last_checked_at=parse_dt(r["last_checked_at"]),
                    last_success_at=parse_dt(r["last_success_at"]),
                    parser_key=r["parser_key"] or "generic",
                    is_active=bool(r["is_active"] if r["is_active"] is not None else True)
                )
                session.add(src)
                existing_source_ids.add(new_id)
                existing_sources[r["parser_key"]] = new_id
        await session.commit()
        print(f"Sources ready: {len(source_id_map)} sources mapped. Total in Supabase: {len(existing_source_ids)}")

        # 4. Source Items
        s_cur.execute("SELECT * FROM source_items")
        rows = s_cur.fetchall()
        sitem_id_map = {}
        res = await session.execute(select(SourceItem.id, SourceItem.source_id, SourceItem.content_hash))
        existing_sitems = set()
        existing_hashes = set()
        for sid, src_id, chash in res.fetchall():
            existing_sitems.add(sid)
            existing_hashes.add((src_id, chash))

        migrated_sitems = 0
        default_source_id = list(existing_source_ids)[0]
        for r in rows:
            old_id = r["id"]
            new_id = to_uuid(old_id)
            sitem_id_map[old_id] = new_id
            
            source_id = source_id_map.get(r["source_id"], to_uuid(r["source_id"]))
            if source_id not in existing_source_ids:
                source_id = default_source_id

            content_hash = r["content_hash"]
            if new_id not in existing_sitems and (source_id, content_hash) not in existing_hashes:
                raw_status = r["status"] or "extracted"
                if raw_status not in VALID_SITEM_STATUSES:
                    raw_status = "extracted"

                raw_ctype = r["content_type"] or "html"
                if raw_ctype not in VALID_CONTENT_TYPES:
                    raw_ctype = "html"

                sitem = SourceItem(
                    id=new_id,
                    source_id=source_id,
                    external_id=r["external_id"],
                    canonical_url=r["canonical_url"],
                    content_hash=content_hash,
                    title_raw=r["title_raw"],
                    caption_raw=r["caption_raw"],
                    body_raw=r["body_raw"],
                    published_at=parse_dt(r["published_at"]),
                    raw_payload=parse_json(r["raw_payload"]),
                    content_type=raw_ctype,
                    status=raw_status
                )
                session.add(sitem)
                existing_sitems.add(new_id)
                existing_hashes.add((source_id, content_hash))
                migrated_sitems += 1

        await session.commit()
        print(f"Source items ready: {migrated_sitems} new source items inserted.")

        # 5. Opportunities
        s_cur.execute("SELECT * FROM opportunities")
        rows = s_cur.fetchall()
        res = await session.execute(select(Opportunity.slug))
        existing_opp_slugs = {s[0] for s in res.fetchall()}
        res2 = await session.execute(select(Opportunity.id))
        existing_opp_ids = {s[0] for s in res2.fetchall()}

        migrated_opps = 0
        opp_id_map = {}

        for r in rows:
            old_id = r["id"]
            new_id = to_uuid(old_id)
            opp_id_map[old_id] = new_id

            if r["slug"] in existing_opp_slugs or new_id in existing_opp_ids:
                continue

            cat_id = None
            if r["category_id"]:
                cat_id = to_uuid(r["category_id"])
                if cat_id not in cat_map.values():
                    cat_id = list(cat_map.values())[0] if cat_map else None

            org_id = None
            if r["organization_id"]:
                org_id = to_uuid(r["organization_id"])
                if org_id not in org_map.values():
                    org_id = list(org_map.values())[0] if org_map else None

            raw_opp_status = r["status"] or "published"
            if raw_opp_status not in VALID_OPP_STATUSES:
                raw_opp_status = "published"

            raw_verif_status = r["verification_status"] or "source_verified"
            if raw_verif_status not in VALID_VERIF_STATUSES:
                raw_verif_status = "unverified" if raw_verif_status == "needs_review" else "source_verified"

            opp = Opportunity(
                id=new_id,
                title=r["title"],
                slug=r["slug"],
                summary=r["summary"] or r["title"],
                description=r["description"] or r["summary"] or r["title"],
                organization_id=org_id,
                category_id=cat_id,
                venue=r["venue"],
                city=r["city"] or "Peshawar",
                country=r["country"] or "Pakistan",
                is_online=bool(r["is_online"]),
                start_date=parse_dt(r["start_date"]),
                end_date=parse_dt(r["end_date"]),
                registration_deadline=parse_dt(r["registration_deadline"]),
                registration_url=r["registration_url"],
                application_url=r["application_url"],
                contact_email=r["contact_email"],
                contact_phone=r["contact_phone"],
                eligibility_summary=r["eligibility_summary"],
                target_audience=parse_json(r["target_audience"]),
                status=raw_opp_status,
                trust_score=float(r["trust_score"] or 0.85),
                ai_confidence=float(r["ai_confidence"] or 0.90),
                verification_status=raw_verif_status,
                featured=bool(r["featured"]),
                view_count=r["view_count"] or 0,
                save_count=r["save_count"] or 0,
                flyer_url=r["flyer_url"],
                created_at=parse_dt(r["created_at"]) or datetime.now(timezone.utc),
                updated_at=parse_dt(r["updated_at"]) or datetime.now(timezone.utc),
                published_at=parse_dt(r["published_at"]) or datetime.now(timezone.utc)
            )
            session.add(opp)
            existing_opp_slugs.add(r["slug"])
            existing_opp_ids.add(new_id)
            migrated_opps += 1

        await session.commit()
        print(f"Opportunities migrated: {migrated_opps} new opportunities inserted into Supabase!")

        # 6. Verification Queue
        s_cur.execute("SELECT * FROM verification_queue")
        rows = s_cur.fetchall()
        migrated_q = 0
        res = await session.execute(select(VerificationQueue.id))
        existing_q_ids = {s[0] for s in res.fetchall()}

        for r in rows:
            new_id = to_uuid(r["id"])
            if new_id not in existing_q_ids:
                opp_id = opp_id_map.get(r["opportunity_id"], to_uuid(r["opportunity_id"]))
                sitem_id = sitem_id_map.get(r["source_item_id"], to_uuid(r["source_item_id"])) if r["source_item_id"] else None
                
                if opp_id in existing_opp_ids:
                    raw_q_status = r["status"] or "pending"
                    if raw_q_status not in VALID_QUEUE_STATUSES:
                        raw_q_status = "pending"

                    vq = VerificationQueue(
                        id=new_id,
                        opportunity_id=opp_id,
                        source_item_id=sitem_id if sitem_id in existing_sitems else None,
                        reason=r["reason"] or "Autonomous crawler extraction",
                        status=raw_q_status,
                        assigned_admin_id=None,
                        reviewed_at=parse_dt(r["reviewed_at"]),
                        admin_notes=r["admin_notes"],
                        created_at=parse_dt(r["created_at"]) or datetime.now(timezone.utc)
                    )
                    session.add(vq)
                    existing_q_ids.add(new_id)
                    migrated_q += 1

        await session.commit()
        print(f"Verification queue migrated: {migrated_q} queue items inserted into Supabase!")

    s_conn.close()
    await engine.dispose()
    print("\nSUCCESS: All SQLite data successfully synced to Supabase PostgreSQL!")

if __name__ == "__main__":
    asyncio.run(migrate())
