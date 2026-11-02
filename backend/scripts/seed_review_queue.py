"""
Script to clean orphaned verification queue records and seed realistic
pending verification items for the Admin Review Queue.
"""
import asyncio
import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, delete

from app.core.database import AsyncSessionLocal
from app.models.opportunity import Opportunity
from app.models.source import Source
from app.models.source_item import SourceItem
from app.models.audit import VerificationQueue
from app.models.category import Category


async def seed_review_queue():
    async with AsyncSessionLocal() as db:
        print("1. Cleaning up orphaned verification queue records...")
        opp_ids_stmt = select(Opportunity.id)
        valid_opp_ids = (await db.execute(opp_ids_stmt)).scalars().all()
        
        # Delete verification queue items whose opportunity_id is not in valid_opp_ids
        if valid_opp_ids:
            del_stmt = delete(VerificationQueue).where(VerificationQueue.opportunity_id.not_in(valid_opp_ids))
        else:
            del_stmt = delete(VerificationQueue)
        del_res = await db.execute(del_stmt)
        print(f"Removed {del_res.rowcount} orphaned verification queue items.")

        # Ensure a default category exists
        cat_stmt = select(Category).limit(1)
        cat = (await db.execute(cat_stmt)).scalars().first()
        cat_id = cat.id if cat else None

        # Ensure default source exists
        src_stmt = select(Source).limit(1)
        src = (await db.execute(src_stmt)).scalars().first()
        src_id = src.id if src else "src-kpitb"

        now = datetime.now(timezone.utc)

        sample_items = [
            {
                "title": "KP Women in Tech Coding Bootcamp & AI Hackathon 2026",
                "slug": "kp-women-in-tech-coding-bootcamp-2026",
                "summary": "Flagship 4-week coding bootcamp and AI hackathon for women students and developers in Khyber Pakhtunkhwa. Free laptops for top 10 finalists.",
                "description": "Calling all female developers and STEM students across KP! 4-week intensive bootcamp covering Fullstack, AI tools, and Web Development. Sessions hosted at Durshal Peshawar. Free laptops for top 10 graduates. Apply before deadline.",
                "venue": "Durshal Co-working Space, Peshawar",
                "city": "Peshawar",
                "registration_deadline": now + timedelta(days=12),
                "start_date": now + timedelta(days=20),
                "registration_url": "https://kpitb.gov.pk/women-in-tech",
                "flyer_url": "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=1200&auto=format&fit=crop&q=80",
                "trust_score": 0.88,
                "ai_confidence": 0.82,
                "reason": "Relative date phrase detected in poster text ('Applications close next Friday'); manual deadline verification required.",
                "title_raw": "Announcement: KP Women in Tech Bootcamp & AI Sprint",
                "body_raw": "Official announcement flyer: 4-week training bootcamp for KP women in tech. Applications close next Friday. Register online: https://kpitb.gov.pk/women-in-tech",
                "canonical_url": "https://kpitb.gov.pk/women-in-tech",
            },
            {
                "title": "FAST Peshawar Cybersecurity CTF & National Bug Bounty 2026",
                "slug": "fast-peshawar-cybersecurity-ctf-2026",
                "summary": "24-hour non-stop Capture The Flag cyber defense competition organized by FAST Peshawar and PakCERT.",
                "description": "Annual student-led cybersecurity challenge. Jeopardy-style CTF across Web Exploitation, Reverse Engineering, Forensics, and Cryptography. Open to all Pakistani university teams of 3-4 students.",
                "venue": "FAST-NUCES Peshawar Campus, Industrial Estate Hayatabad",
                "city": "Peshawar",
                "registration_deadline": now + timedelta(days=14),
                "start_date": now + timedelta(days=21),
                "registration_url": "https://pwr.nu.edu.pk/ctf2026",
                "flyer_url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80",
                "trust_score": 0.91,
                "ai_confidence": 0.85,
                "reason": "Low OCR confidence on registration fee waiver QR code in poster flyer",
                "title_raw": "FAST National Collegiate Cyber Defense CTF 2026",
                "body_raw": "Register your team for 24-hr CTF. Registration link: https://pwr.nu.edu.pk/ctf2026. Scan QR code for rules.",
                "canonical_url": "https://pwr.nu.edu.pk/ctf2026",
            },
            {
                "title": "HEC - GIK Institute Technology Commercialization Grant",
                "slug": "hec-gik-tech-commercialization-grant-2026",
                "summary": "Seed grants up to PKR 2.5 Million for engineering and computer science students building market-ready deep tech prototypes.",
                "description": "Joint initiative between HEC Pakistan and GIK Institute ORIC. Provides seed funding, patent support, and incubation at GIK Technology Park for selected student and faculty startups.",
                "venue": "GIK Institute, Topi, Swabi",
                "city": "Topi",
                "registration_deadline": now + timedelta(days=22),
                "start_date": now + timedelta(days=35),
                "registration_url": "https://giki.edu.pk/oric/grants",
                "flyer_url": "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&auto=format&fit=crop&q=80",
                "trust_score": 0.94,
                "ai_confidence": 0.87,
                "reason": "Ambiguous eligibility criteria: verify whether postgraduate students outside KP can apply",
                "title_raw": "Call for Proposals: Commercialization & Innovation Grant 2026",
                "body_raw": "GIK Institute ORIC calls for proposals for student deep-tech prototypes. Up to 2.5M PKR grant funding. Deadline 30 Oct 2026. Apply: https://giki.edu.pk/oric/grants",
                "canonical_url": "https://giki.edu.pk/oric/grants",
            }
        ]

        print("2. Seeding pending review opportunities and source items...")
        for item in sample_items:
            # Create SourceItem
            s_item = SourceItem(
                id=str(uuid.uuid4()),
                source_id=src_id,
                external_id=f"review-{uuid.uuid4().hex[:8]}",
                canonical_url=item["canonical_url"],
                content_hash=hashlib.sha256(item["title_raw"].encode("utf-8")).hexdigest(),
                title_raw=item["title_raw"],
                body_raw=item["body_raw"],
                content_type="web",
                status="extracted",
                published_at=now,
            )
            db.add(s_item)
            await db.flush()

            # Create Opportunity
            opp = Opportunity(
                id=str(uuid.uuid4()),
                title=item["title"],
                slug=item["slug"],
                summary=item["summary"],
                description=item["description"],
                venue=item["venue"],
                city=item["city"],
                country="Pakistan",
                is_online=False,
                registration_deadline=item["registration_deadline"],
                start_date=item["start_date"],
                registration_url=item["registration_url"],
                application_url=item["registration_url"],
                flyer_url=item["flyer_url"],
                trust_score=item["trust_score"],
                ai_confidence=item["ai_confidence"],
                category_id=cat_id,
                status="pending_review",
                verification_status="needs_review",
                published_at=now,
            )
            db.add(opp)
            await db.flush()

            # Create VerificationQueue item
            vq = VerificationQueue(
                id=str(uuid.uuid4()),
                opportunity_id=opp.id,
                source_item_id=s_item.id,
                reason=item["reason"],
                status="pending",
                created_at=now,
            )
            db.add(vq)

        await db.commit()
        print("Seeding completed successfully! Review queue now contains 3 pending items.")


if __name__ == "__main__":
    asyncio.run(seed_review_queue())
