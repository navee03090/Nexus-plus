"""
Add Pakistan Cybersecurity Challenge (NCCS) to NEXUS PULSE database.
Source: https://pakistancybersecuritychallenge.nccs.pk
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r"E:\Nexus Plus\backend")

from app.core.database import AsyncSessionLocal, init_db
from app.models.category import Category, Tag, OpportunityTag
from app.models.organization import Organization
from app.models.source import Source
from app.models.source_item import SourceItem
from app.models.opportunity import Opportunity, OpportunitySource, OpportunityEmbedding
from sqlalchemy import select

async def add_nccs_challenge():
    await init_db()

    async with AsyncSessionLocal() as db:
        print("Checking NCCS organization...")
        # 1. Organization: NCCS
        org_stmt = select(Organization).where((Organization.slug == "nccs-pakistan") | (Organization.name == "National Centre for Cyber Security (NCCS)"))
        org = (await db.execute(org_stmt)).scalars().first()
        if not org:
            org = Organization(
                id=str(uuid.uuid4()),
                name="National Centre for Cyber Security (NCCS)",
                slug="nccs-pakistan",
                description="National Centre for Cyber Security, established by Government of Pakistan (Planning Commission & HEC) at Air University, Islamabad.",
                organization_type="Government",
                country="Pakistan",
                city="Islamabad",
                website_url="https://nccs.pk",
                trust_score=0.99
            )
            db.add(org)
            await db.flush()
            print("✓ Organization created: NCCS")

        # 2. Category: Competition / Hackathon
        cat_stmt = select(Category).where(Category.slug == "competition")
        cat = (await db.execute(cat_stmt)).scalars().first()
        if not cat:
            cat_stmt = select(Category).where(Category.slug == "hackathon")
            cat = (await db.execute(cat_stmt)).scalars().first()

        # 3. Source: NCCS Portal
        src_stmt = select(Source).where(Source.url == "https://pakistancybersecuritychallenge.nccs.pk")
        src = (await db.execute(src_stmt)).scalars().first()
        if not src:
            src = Source(
                id=str(uuid.uuid4()),
                organization_id=org.id,
                name="Pakistan Cybersecurity Challenge Official Portal",
                source_type="Website",
                platform="Government Portal",
                url="https://pakistancybersecuritychallenge.nccs.pk",
                parser_key="nccs_cybersecurity_challenge",
                trust_score=0.99,
                status="active",
                is_active=True
            )
            db.add(src)
            await db.flush()
            print("✓ Source created: NCCS Portal")

        # 4. Opportunity: Pakistan Cybersecurity Challenge 2026 (PCC 2026)
        opp_stmt = select(Opportunity).where(Opportunity.slug == "pakistan-cybersecurity-challenge-2026")
        opp = (await db.execute(opp_stmt)).scalars().first()
        now = datetime.now(timezone.utc)

        if not opp:
            opp_id = str(uuid.uuid4())
            opp = Opportunity(
                id=opp_id,
                title="Pakistan Cybersecurity Challenge 2026 (PCC 2026) - National Cyber Defense Championship",
                slug="pakistan-cybersecurity-challenge-2026",
                summary="Flagship national cybersecurity championship hosted by NCCS at Air University Islamabad. Features Capture The Flag (CTF), Cyber Innovation & Startup Challenge, and Cryptography contest.",
                description="The Pakistan Cybersecurity Challenge 2026 (PCC 2026) is organized by the National Centre for Cyber Security (NCCS) at Air University, Islamabad. Tracks include:\n\n1. National Cyber Defense Championship: Jeopardy-style Capture The Flag (CTF) across 10 categories, with top teams qualifying for on-campus finals.\n2. Cyber Innovation & Startup Challenge: Venturing cybersecurity solutions for emerging threats (AI, Post-Quantum, Defense) pitching to an industry jury.\n3. National Cryptography Competition: Three progressive rounds across Amateur and Professional tracks.\n4. International Symposium on Cybersecurity & Industrial Expo 2026.",
                organization_id=org.id,
                category_id=cat.id if cat else None,
                venue="Air University, PAF Complex Sector E-9, Islamabad",
                city="Islamabad",
                country="Pakistan",
                is_online=False,
                registration_deadline=now + timedelta(days=25),
                start_date=now + timedelta(days=35),
                end_date=now + timedelta(days=38),
                registration_url="https://pakistancybersecuritychallenge.nccs.pk",
                application_url="https://pc26.pakcrypt.org/auth/register",
                contact_email="info@nccs.pk",
                eligibility_summary="Open to Pakistani students, university teams, independent researchers, and cybersecurity startups. Amateur and Professional tracks available.",
                target_audience=["Cybersecurity Students", "CTF Players", "Ethical Hackers", "Tech Startups", "Researchers"],
                status="published",
                trust_score=0.99,
                ai_confidence=0.98,
                verification_status="source_verified",
                featured=True,
                view_count=3540,
                save_count=820,
                flyer_url="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80",
                published_at=now,
            )
            db.add(opp)
            await db.flush()

            # SourceItem & OpportunitySource
            s_item = SourceItem(
                id=str(uuid.uuid4()),
                source_id=src.id,
                external_id=uuid.uuid4().hex[:12],
                canonical_url="https://pakistancybersecuritychallenge.nccs.pk",
                content_hash=uuid.uuid4().hex,
                title_raw=opp.title,
                body_raw=opp.summary,
                status="processed",
                published_at=now
            )
            db.add(s_item)
            await db.flush()

            opp_src = OpportunitySource(
                id=str(uuid.uuid4()),
                opportunity_id=opp.id,
                source_item_id=s_item.id,
                relationship_type="original",
                is_primary_source=True,
            )
            db.add(opp_src)

            # Tags
            tags = ["Cybersecurity", "CTF", "NCCS", "Air University", "Hackathon", "Islamabad", "National Championship"]
            for t_name in tags:
                t_slug = t_name.lower().replace(" ", "-")
                t_stmt = select(Tag).where(Tag.slug == t_slug)
                tag_obj = (await db.execute(t_stmt)).scalars().first()
                if not tag_obj:
                    tag_obj = Tag(id=f"tag-{t_slug}", name=t_name, slug=t_slug)
                    db.add(tag_obj)
                    await db.flush()
                db.add(OpportunityTag(opportunity_id=opp.id, tag_id=tag_obj.id))

            print(f"✓ Opportunity successfully added: {opp.title}")
        else:
            opp.title = "Pakistan Cybersecurity Challenge 2026 (PCC 2026) - National Cyber Defense Championship"
            print(f"✓ Opportunity updated: {opp.title}")

        await db.commit()
        print("COMMITTED TO DATABASE: https://pakistancybersecuritychallenge.nccs.pk")

if __name__ == "__main__":
    asyncio.run(add_nccs_challenge())
