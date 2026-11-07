"""
Curated official channels for Pakistan (KP-first).
Upserted on API boot so new government / campus / social pages appear
without duplicating URLs already in the database.
"""
from typing import Dict, List, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.source import Source
from app.core.logging import logger

# key, name, slug, description, type, country, city, website, trust
ORG_DEFS: List[Tuple] = [
    ("org-kpitb", "KPITB", "kpitb", "Khyber Pakhtunkhwa Information Technology Board", "Government", "Pakistan", "Peshawar", "https://www.kpitb.gov.pk", 0.99),
    ("org-uet", "UET Peshawar", "uet-peshawar", "University of Engineering and Technology Peshawar", "University", "Pakistan", "Peshawar", "https://www.uetpeshawar.edu.pk", 0.98),
    ("org-nic", "NIC Peshawar", "nic-peshawar", "National Incubation Center Peshawar", "Technology Organization", "Pakistan", "Peshawar", "https://nicpeshawar.pk", 0.96),
    ("org-gdg", "GDG Peshawar", "gdg-peshawar", "Google Developer Groups Peshawar", "Other", "Pakistan", "Peshawar", "https://gdg.community.dev/gdg-peshawar", 0.95),
    ("org-giki", "GIK Institute", "gik-institute", "Ghulam Ishaq Khan Institute of Engineering Sciences and Technology", "University", "Pakistan", "Topi", "https://giki.edu.pk", 0.97),
    ("org-fast", "FAST-NUCES Peshawar", "fast-pwr", "National University of Computer and Emerging Sciences Peshawar Campus", "University", "Pakistan", "Peshawar", "https://pwr.nu.edu.pk", 0.96),
    ("org-hec", "HEC Pakistan", "hec-pakistan", "Higher Education Commission of Pakistan", "Government", "Pakistan", "Islamabad", "https://www.hec.gov.pk", 0.99),
    ("org-ignite", "Ignite", "ignite", "Ignite National Technology Fund (NGIRI, DigiSkills, NGIRI grants)", "Government", "Pakistan", "Islamabad", "https://ignite.org.pk", 0.97),
    ("org-navttc", "NAVTTC", "navttc", "National Vocational and Technical Training Commission", "Government", "Pakistan", "Islamabad", "https://navttc.gov.pk", 0.96),
    ("org-pseb", "PSEB", "pseb", "Pakistan Software Export Board", "Government", "Pakistan", "Islamabad", "https://pseb.org.pk", 0.95),
    ("org-pitb", "PITB", "pitb", "Punjab Information Technology Board", "Government", "Pakistan", "Lahore", "https://pitb.gov.pk", 0.96),
    ("org-nitb", "NITB", "nitb", "National Information Technology Board", "Government", "Pakistan", "Islamabad", "https://nitb.gov.pk", 0.94),
    ("org-hed-kp", "KP Higher Education", "kp-hed", "Khyber Pakhtunkhwa Higher Education Department", "Government", "Pakistan", "Peshawar", "https://hed.kp.gov.pk", 0.94),
    ("org-uop", "University of Peshawar", "uop", "University of Peshawar", "University", "Pakistan", "Peshawar", "https://www.uop.edu.pk", 0.95),
    ("org-ims", "IMSciences", "imsciences", "Institute of Management Sciences Peshawar", "University", "Pakistan", "Peshawar", "https://imsciences.edu.pk", 0.95),
    ("org-icp", "Islamia College Peshawar", "icp", "Islamia College Peshawar", "University", "Pakistan", "Peshawar", "https://www.icp.edu.pk", 0.93),
    ("org-nust", "NUST", "nust", "National University of Sciences and Technology", "University", "Pakistan", "Islamabad", "https://nust.edu.pk", 0.96),
    ("org-plan9", "Plan9", "plan9", "PITB Plan9 technology incubator", "Technology Organization", "Pakistan", "Lahore", "https://plan9.pitb.gov.pk", 0.93),
    ("org-nic-pk", "NIC Pakistan", "nic-pakistan", "National Incubation Center network", "Technology Organization", "Pakistan", "Islamabad", "https://nicpakistan.pk", 0.93),
    ("org-internspk", "InternsPK", "internspk", "Pakistan internship and student opportunity board", "Other", "Pakistan", "Karachi", "https://interns.pk", 0.80),
    ("org-allevents", "AllEvents Peshawar", "allevents-peshawar", "Public events listing for Peshawar", "Other", "Pakistan", "Peshawar", "https://allevents.in/peshawar", 0.75),
]

# key, org_key, name, source_type, platform, url, parser_key, trust, crawl_frequency
SOURCE_DEFS: List[Tuple] = [
    # Websites — government
    ("src-kpitb-web", "org-kpitb", "KPITB Official Announcements", "Website", "Government Portal", "https://www.kpitb.gov.pk", "kpitb_portal", 0.99, 21600),
    ("src-hec-web", "org-hec", "HEC Scholarships & Grants", "Website", "Government Registry", "https://www.hec.gov.pk", "hec_scholarships", 0.99, 43200),
    ("src-ignite-web", "org-ignite", "Ignite Programs & NGIRI", "Website", "Government Portal", "https://ignite.org.pk", "ignite_portal", 0.97, 43200),
    ("src-navttc-web", "org-navttc", "NAVTTC Trainings", "Website", "Government Portal", "https://navttc.gov.pk", "navttc_portal", 0.96, 43200),
    ("src-pseb-web", "org-pseb", "PSEB Notices", "Website", "Government Portal", "https://pseb.org.pk", "pseb_portal", 0.95, 43200),
    ("src-pitb-web", "org-pitb", "PITB Announcements", "Website", "Government Portal", "https://pitb.gov.pk", "pitb_portal", 0.96, 43200),
    ("src-nitb-web", "org-nitb", "NITB Digital Pakistan Notices", "Website", "Government Portal", "https://nitb.gov.pk", "nitb_portal", 0.94, 43200),
    ("src-hedkp-web", "org-hed-kp", "KP Higher Education Notices", "Website", "Government Portal", "https://hed.kp.gov.pk", "kp_hed_portal", 0.94, 43200),
    # Websites — campuses & incubators
    ("src-uet-web", "org-uet", "UET Peshawar Notice Board", "Website", "University Portal", "https://www.uetpeshawar.edu.pk", "uet_peshawar_events", 0.98, 21600),
    ("src-nic-web", "org-nic", "NIC Peshawar Programs", "Website", "Incubator Portal", "https://nicpeshawar.pk", "nic_peshawar_events", 0.96, 21600),
    ("src-giki-web", "org-giki", "GIKI Competitions & Hackathons", "Website", "University Website", "https://giki.edu.pk", "giki_events", 0.96, 21600),
    ("src-fast-web", "org-fast", "FAST Peshawar Notices", "Website", "University Website", "https://pwr.nu.edu.pk", "fast_pwr", 0.95, 21600),
    ("src-uop-web", "org-uop", "University of Peshawar Notices", "Website", "University Website", "https://www.uop.edu.pk", "uop_events", 0.95, 21600),
    ("src-ims-web", "org-ims", "IMSciences Notices", "Website", "University Website", "https://imsciences.edu.pk", "imsciences_events", 0.95, 21600),
    ("src-icp-web", "org-icp", "Islamia College Peshawar Notices", "Website", "University Website", "https://www.icp.edu.pk", "icp_events", 0.93, 43200),
    ("src-nust-web", "org-nust", "NUST Opportunities", "Website", "University Website", "https://nust.edu.pk", "nust_events", 0.96, 21600),
    ("src-plan9-web", "org-plan9", "Plan9 Incubator Programs", "Website", "Incubator Portal", "https://plan9.pitb.gov.pk", "plan9_events", 0.93, 43200),
    ("src-nicpk-web", "org-nic-pk", "NIC Pakistan Network", "Website", "Incubator Portal", "https://nicpakistan.pk", "nic_pakistan_events", 0.93, 43200),
    ("src-gdg-web", "org-gdg", "GDG Peshawar Community", "Website", "Community Portal", "https://gdg.community.dev/gdg-peshawar", "gdg_peshawar_events", 0.95, 21600),
    # Event boards
    ("src-internspk-web", "org-internspk", "InternsPK Listings", "Website", "Events Board", "https://interns.pk", "internspk_board", 0.80, 21600),
    ("src-allevents-web", "org-allevents", "AllEvents Peshawar", "Website", "Events Board", "https://allevents.in/peshawar", "allevents_peshawar", 0.75, 21600),
    # Facebook — official pages only
    ("src-kpitb-fb", "org-kpitb", "KPITB Facebook", "Social", "Facebook", "https://www.facebook.com/kpitbgov", "apify_facebook_crawler", 0.97, 43200),
    ("src-nic-fb", "org-nic", "NIC Peshawar Facebook", "Social", "Facebook", "https://www.facebook.com/nicpeshawar", "apify_facebook_crawler", 0.95, 43200),
    ("src-uet-fb", "org-uet", "UET Peshawar Facebook", "Social", "Facebook", "https://www.facebook.com/uetpeshawarofficial", "apify_facebook_crawler", 0.94, 43200),
    ("src-hec-fb", "org-hec", "HEC Pakistan Facebook", "Social", "Facebook", "https://www.facebook.com/HECPakistan", "apify_facebook_crawler", 0.96, 43200),
    ("src-ignite-fb", "org-ignite", "Ignite Facebook", "Social", "Facebook", "https://www.facebook.com/ignite.org.pk", "apify_facebook_crawler", 0.94, 43200),
    ("src-pitb-fb", "org-pitb", "PITB Facebook", "Social", "Facebook", "https://www.facebook.com/punjabitboard", "apify_facebook_crawler", 0.94, 43200),
    ("src-gdg-fb", "org-gdg", "GDG Peshawar Facebook", "Social", "Facebook", "https://www.facebook.com/gdgpeshawar", "apify_facebook_crawler", 0.93, 43200),
    ("src-navttc-fb", "org-navttc", "NAVTTC Facebook", "Social", "Facebook", "https://www.facebook.com/NAVTTC", "apify_facebook_crawler", 0.93, 86400),
    ("src-nust-fb", "org-nust", "NUST Facebook", "Social", "Facebook", "https://www.facebook.com/nustofficial", "apify_facebook_crawler", 0.94, 43200),
    ("src-ims-fb", "org-ims", "IMSciences Facebook", "Social", "Facebook", "https://www.facebook.com/IMSciences", "apify_facebook_crawler", 0.92, 86400),
    # Instagram — official pages only
    ("src-gdg-ig", "org-gdg", "GDG Peshawar Instagram", "Social", "Instagram", "https://www.instagram.com/gdgpeshawar", "apify_instagram_crawler", 0.95, 43200),
    ("src-kpitb-ig", "org-kpitb", "KPITB Instagram", "Social", "Instagram", "https://www.instagram.com/kpitbgov", "apify_instagram_crawler", 0.94, 43200),
    ("src-nic-ig", "org-nic", "NIC Peshawar Instagram", "Social", "Instagram", "https://www.instagram.com/nicpeshawar", "apify_instagram_crawler", 0.93, 43200),
    ("src-nust-ig", "org-nust", "NUST Instagram", "Social", "Instagram", "https://www.instagram.com/nustofficial", "apify_instagram_crawler", 0.93, 86400),
]


def _norm_url(url: str) -> str:
    return (url or "").strip().rstrip("/").lower()


def _seed_uuid(key: str) -> str:
    import uuid as _uuid
    return str(_uuid.uuid5(_uuid.NAMESPACE_URL, f"https://nexus-pulse.org/seed/{key}"))


async def ensure_official_catalog(session: AsyncSession) -> Dict[str, int]:
    """Insert missing official orgs/sources. Never overwrites existing rows."""
    orgs = (await session.execute(select(Organization))).scalars().all()
    by_slug = {o.slug: o for o in orgs}
    org_ids: Dict[str, str] = {}
    orgs_added = 0

    for org_key, name, slug, desc, o_type, country, city, web, trust in ORG_DEFS:
        existing = by_slug.get(slug)
        if existing:
            org_ids[org_key] = existing.id
            continue
        oid = _seed_uuid(org_key)
        session.add(Organization(
            id=oid,
            name=name,
            slug=slug,
            description=desc,
            organization_type=o_type,
            country=country,
            city=city,
            website_url=web,
            trust_score=trust,
        ))
        org_ids[org_key] = oid
        by_slug[slug] = None  # mark taken
        orgs_added += 1
    await session.flush()

    sources = (await session.execute(select(Source))).scalars().all()
    known_urls = {_norm_url(s.url) for s in sources if s.url}
    sources_added = 0

    for src_key, org_key, name, s_type, plat, url, p_key, trust, freq in SOURCE_DEFS:
        if _norm_url(url) in known_urls:
            continue
        session.add(Source(
            id=_seed_uuid(src_key),
            organization_id=org_ids.get(org_key),
            name=name,
            source_type=s_type,
            platform=plat,
            url=url,
            parser_key=p_key,
            trust_score=trust,
            crawl_frequency=freq,
            status="active",
            is_active=True,
        ))
        known_urls.add(_norm_url(url))
        sources_added += 1

    if orgs_added or sources_added:
        await session.commit()
        logger.info(f"Official catalog upsert: +{orgs_added} orgs, +{sources_added} sources")
    else:
        await session.commit()
    return {"organizations_added": orgs_added, "sources_added": sources_added}
