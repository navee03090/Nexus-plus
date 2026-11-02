-- ============================================================
-- NEXUS PULSE: Update Seed Records to 100% Real, Active Live URLs
-- Fixes external 404s by routing to verified official endpoints
-- ============================================================

-- 1. Update Sources (Monitored Channels) to real live portals
UPDATE public.sources
SET url = 'https://www.uetpeshawar.edu.pk/student-notice-board'
WHERE parser_key = 'uet_peshawar_events' OR url LIKE '%uetpeshawar.edu.pk%';

UPDATE public.sources
SET url = 'https://www.kpitb.gov.pk'
WHERE parser_key = 'kpitb_news' OR url LIKE '%kpitb.gov.pk%';

UPDATE public.sources
SET url = 'https://nicpeshawar.pk'
WHERE parser_key = 'rss_standard' OR url LIKE '%nicpeshawar%';

UPDATE public.sources
SET url = 'https://giki.edu.pk'
WHERE parser_key = 'giki_events' OR url LIKE '%giki.edu.pk%';

UPDATE public.sources
SET url = 'https://eportal.hec.gov.pk'
WHERE parser_key = 'hec_scholarships' OR url LIKE '%hec.gov.pk%';

-- 2. Update Source Items (Provenance Evidence Links)
UPDATE public.source_items
SET canonical_url = 'https://www.uetpeshawar.edu.pk/student-notice-board'
WHERE canonical_url LIKE '%uetpeshawar.edu.pk%';

UPDATE public.source_items
SET canonical_url = 'https://www.kpitb.gov.pk'
WHERE canonical_url LIKE '%kpitb.gov.pk%';

-- 3. Update Canonical Opportunities (Registration & Application Endpoints)
-- Hackathon: UET Peshawar & KPITB
UPDATE public.opportunities
SET registration_url = 'https://www.kpitb.gov.pk',
    application_url = 'https://www.kpitb.gov.pk'
WHERE slug = 'kp-ai-cybersecurity-hackathon-2026';

-- Incubation: NIC Peshawar
UPDATE public.opportunities
SET registration_url = 'https://nicpeshawar.pk',
    application_url = 'https://nicpeshawar.pk'
WHERE slug = 'nic-peshawar-deeptech-cohort-8';

-- Fellowship: HEC Pakistan
UPDATE public.opportunities
SET registration_url = 'https://eportal.hec.gov.pk',
    application_url = 'https://eportal.hec.gov.pk'
WHERE slug = 'hec-indigenous-fellowship-2026';

-- Conference: GIK Institute
UPDATE public.opportunities
SET registration_url = 'https://giki.edu.pk',
    application_url = 'https://giki.edu.pk'
WHERE slug = 'icaris-2026-robotics-conference';

-- Career Fair: FAST Peshawar
UPDATE public.opportunities
SET registration_url = 'https://pwr.nu.edu.pk',
    application_url = 'https://pwr.nu.edu.pk'
WHERE slug = 'kp-tech-career-job-fair-2026';
