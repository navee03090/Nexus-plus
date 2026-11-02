-- ============================================================
-- NEXUS PULSE: Migration 003 - Realistic Seed Data
-- Realistic organizations, sources, categories, tags & initial canonical opportunities
-- ============================================================

-- 1. Insert Categories
INSERT INTO public.categories (id, name, slug, description, icon, display_order) VALUES
('c0000001-0000-0000-0000-000000000001', 'Hackathon', 'hackathon', 'Intense competitive innovation and software sprint challenges', 'Code2', 1),
('c0000001-0000-0000-0000-000000000002', 'Competition', 'competition', 'Skill and knowledge based competitive awards and challenges', 'Trophy', 2),
('c0000001-0000-0000-0000-000000000003', 'Workshop', 'workshop', 'Hands-on practical skill acquisition sessions and bootcamps', 'Cpu', 3),
('c0000001-0000-0000-0000-000000000004', 'Conference', 'conference', 'Academic, scientific, and industry research conferences', 'Presentation', 4),
('c0000001-0000-0000-0000-000000000005', 'Seminar', 'seminar', 'Expert speaker series and intellectual discourse seminars', 'BookOpen', 5),
('c0000001-0000-0000-0000-000000000006', 'Webinar', 'webinar', 'Virtual online masterclasses and global broadcasts', 'Globe', 6),
('c0000001-0000-0000-0000-000000000007', 'Training', 'training', 'Structured technical training and capacity building programs', 'GraduationCap', 7),
('c0000001-0000-0000-0000-000000000008', 'Certification', 'certification', 'Industry accredited qualification and voucher grants', 'Award', 8),
('c0000001-0000-0000-0000-000000000009', 'Internship', 'internship', 'Industry placements and research fellowship positions', 'Briefcase', 9),
('c0000001-0000-0000-0000-000000000010', 'Scholarship', 'scholarship', 'Tuition, travel, and research stipends and scholarships', 'Sparkles', 10),
('c0000001-0000-0000-0000-000000000011', 'Fellowship', 'fellowship', 'Prestigious research and leadership residential fellowships', 'Flame', 11),
('c0000001-0000-0000-0000-000000000012', 'Research Grant', 'research-grant', 'Financial grants for scientific and technological investigation', 'Coins', 12),
('c0000001-0000-0000-0000-000000000013', 'Call for Papers', 'call-for-papers', 'Peer-reviewed conference publication and journal invitations', 'FileText', 13),
('c0000001-0000-0000-0000-000000000014', 'Startup Program', 'startup-program', 'Incubation, seed funding, mentorship and accelerator cohorts', 'Rocket', 14),
('c0000001-0000-0000-0000-000000000015', 'Tech Summit', 'tech-summit', 'Major annual industry gatherings and developer expos', 'Radio', 15),
('c0000001-0000-0000-0000-000000000016', 'Meetup', 'meetup', 'Community networking and tech developer meetups', 'Users', 16)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Tags
INSERT INTO public.tags (id, name, slug, category_slug) VALUES
('b0000001-0000-0000-0000-000000000001', 'Artificial Intelligence', 'ai', 'tech'),
('b0000001-0000-0000-0000-000000000002', 'Machine Learning', 'machine-learning', 'tech'),
('b0000001-0000-0000-0000-000000000003', 'Cybersecurity', 'cybersecurity', 'tech'),
('b0000001-0000-0000-0000-000000000004', 'Software Engineering', 'software-engineering', 'tech'),
('b0000001-0000-0000-0000-000000000005', 'Flutter', 'flutter', 'mobile'),
('b0000001-0000-0000-0000-000000000006', 'Web Development', 'web-development', 'tech'),
('b0000001-0000-0000-0000-000000000007', 'Research', 'research', 'academic'),
('b0000001-0000-0000-0000-000000000008', 'Cloud Computing', 'cloud-computing', 'infra'),
('b0000001-0000-0000-0000-000000000009', 'Data Science', 'data-science', 'tech'),
('b0000001-0000-0000-0000-000000000010', 'Robotics', 'robotics', 'engineering'),
('b0000001-0000-0000-0000-000000000011', 'Entrepreneurship', 'entrepreneurship', 'business'),
('b0000001-0000-0000-0000-000000000012', 'Startups', 'startups', 'business'),
('b0000001-0000-0000-0000-000000000013', 'Undergraduate', 'undergraduate', 'eligibility'),
('b0000001-0000-0000-0000-000000000014', 'Postgraduate', 'postgraduate', 'eligibility'),
('b0000001-0000-0000-0000-000000000015', 'IoT', 'iot', 'hardware'),
('b0000001-0000-0000-0000-000000000016', 'Blockchain', 'blockchain', 'tech')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Organizations
INSERT INTO public.organizations (id, name, slug, description, organization_type, country, city, website_url, logo_url, trust_score, verified) VALUES
('a0000001-0000-0000-0000-000000000001', 'UET Peshawar', 'uet-peshawar', 'University of Engineering and Technology Peshawar, premier engineering institution of Khyber Pakhtunkhwa', 'University', 'Pakistan', 'Peshawar', 'https://www.uetpeshawar.edu.pk', '/orgs/uet-peshawar.png', 0.98, true),
('a0000001-0000-0000-0000-000000000002', 'KPITB', 'kpitb', 'Khyber Pakhtunkhwa Information Technology Board, apex provincial agency for digital transformation and technology adoption', 'Government', 'Pakistan', 'Peshawar', 'https://www.kpitb.gov.pk', '/orgs/kpitb.png', 0.99, true),
('a0000001-0000-0000-0000-000000000003', 'NIC Peshawar', 'nic-peshawar', 'National Incubation Center Peshawar, supported by Ignite and Ministry of IT and Telecom', 'Technology Organization', 'Pakistan', 'Peshawar', 'https://nicpeshawar.com', '/orgs/nic-peshawar.png', 0.95, true),
('a0000001-0000-0000-0000-000000000004', 'GIK Institute', 'gik-institute', 'Ghulam Ishaq Khan Institute of Engineering Sciences and Technology, Topi, Swabi', 'University', 'Pakistan', 'Topi', 'https://giki.edu.pk', '/orgs/giki.png', 0.97, true),
('a0000001-0000-0000-0000-000000000005', 'HEC Pakistan', 'hec-pakistan', 'Higher Education Commission of Pakistan, regulating degree granting universities and funding research', 'Government', 'Pakistan', 'Islamabad', 'https://www.hec.gov.pk', '/orgs/hec.png', 0.99, true),
('a0000001-0000-0000-0000-000000000006', 'Ignite National Technology Fund', 'ignite-pakistan', 'Ministry of IT & Telecom initiative funding startups, research and DigiSkills', 'Government', 'Pakistan', 'Islamabad', 'https://ignite.org.pk', '/orgs/ignite.png', 0.98, true),
('a0000001-0000-0000-0000-000000000007', 'FAST-NUCES Peshawar', 'fast-nuces-peshawar', 'National University of Computer and Emerging Sciences Peshawar Campus', 'University', 'Pakistan', 'Peshawar', 'https://pwr.nu.edu.pk', '/orgs/fast.png', 0.96, true)
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Sources (Channels Monitored)
INSERT INTO public.sources (id, organization_id, name, source_type, platform, url, parser_key, trust_score, crawl_frequency, is_active, status) VALUES
('d0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'UET Peshawar Official Portal Events', 'Website', 'University Portal', 'https://www.uetpeshawar.edu.pk/student-notice-board', 'uet_peshawar_events', 0.98, 3600, true, 'active'),
('d0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002', 'KPITB Press & Announcements', 'Website', 'Government Portal', 'https://www.kpitb.gov.pk', 'kpitb_news', 0.99, 1800, true, 'active'),
('d0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000003', 'NIC Peshawar Startup Call Feeds', 'RSS', 'RSS', 'https://nicpeshawar.pk', 'rss_standard', 0.95, 3600, true, 'active'),
('d0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000004', 'GIKI Research & Conferences Feed', 'Website', 'University Portal', 'https://giki.edu.pk', 'giki_events', 0.97, 7200, true, 'active'),
('d0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000005', 'HEC Pakistan Scholarships & Grants Portal', 'Website', 'Government Portal', 'https://www.hec.gov.pk/scholarships', 'hec_scholarships', 0.99, 1800, true, 'active')
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Canonical Opportunities
INSERT INTO public.opportunities (
    id, title, slug, summary, description, organization_id, category_id, venue, city, country,
    is_online, start_date, end_date, registration_deadline, registration_url, application_url,
    contact_email, eligibility_summary, target_audience, status, trust_score, ai_confidence,
    verification_status, featured, flyer_url
) VALUES
(
    '00000001-0000-0000-0000-000000000001',
    'KP AI & Cybersecurity Hackathon 2026',
    'kp-ai-cybersecurity-hackathon-2026',
    'A 48-hour competitive innovation hackathon focused on defensive cyber solutions and LLM agents for government digital services.',
    'Organized jointly by UET Peshawar and KPITB, the Khyber Pakhtunkhwa AI & Cybersecurity Hackathon 2026 challenges undergraduate and graduate engineering students to build verifiable defense systems. Tracks include Adversarial ML, Critical Infrastructure Securing, and Public Service Agentic AI. Winning teams receive PKR 1.5 Million in seed grants, incubation at NIC Peshawar, and deployment mentorship.',
    'a0000001-0000-0000-0000-000000000001',
    'c0000001-0000-0000-0000-000000000001',
    'Main Auditorium, Department of Computer Systems Engineering, UET Peshawar',
    'Peshawar',
    'Pakistan',
    false,
    '2026-10-24 09:00:00+05',
    '2026-10-26 18:00:00+05',
    '2026-10-18 23:59:59+05',
    'https://www.kpitb.gov.pk',
    'https://www.kpitb.gov.pk',
    'hackathon@uetpeshawar.edu.pk',
    'Open to teams of 3-5 enrolled undergraduate or graduate students in Pakistani universities. At least 1 member must have a CS/EE background.',
    '["Undergraduate Students", "Graduate Students", "Developers", "Security Researchers"]'::jsonb,
    'published',
    0.98,
    0.96,
    'source_verified',
    true,
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80'
),
(
    '00000001-0000-0000-0000-000000000002',
    'NIC Peshawar DeepTech Acceleration Cohort 8',
    'nic-peshawar-deeptech-cohort-8',
    '6-month equity-free acceleration program for early-stage AI, HealthTech, AgriTech, and Hardware startups in KP.',
    'National Incubation Center Peshawar is accepting applications for Cohort 8. Startups receive PKR 500k prototyping grants, dedicated lab facilities, legal and financial compliance advisory, cloud credits ($100k AWS/Google Cloud), and investor matchmaking sessions with regional VC syndicates.',
    'a0000001-0000-0000-0000-000000000003',
    'c0000001-0000-0000-0000-000000000014',
    'NIC Peshawar Building, Phase 5 Hayatabad',
    'Peshawar',
    'Pakistan',
    false,
    '2026-11-01 10:00:00+05',
    '2027-04-30 17:00:00+05',
    '2026-10-20 23:59:59+05',
    'https://nicpeshawar.pk',
    'https://nicpeshawar.pk',
    'incubate@nicpeshawar.com',
    'Startups with an MVP or functional prototype. Must have at least two co-founders, one committed full-time.',
    '["Startup Founders", "Tech Entrepreneurs", "Researchers with Commercial Spin-offs"]'::jsonb,
    'published',
    0.95,
    0.94,
    'source_verified',
    true,
    'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&auto=format&fit=crop&q=80'
),
(
    '00000001-0000-0000-0000-000000000003',
    'HEC Indigenous Post-Graduate Research Fellowship 2026-2027',
    'hec-indigenous-fellowship-2026',
    'Monthly research stipends, tuition coverage, and book allowances for PhD scholars in STEM fields across Pakistan.',
    'Higher Education Commission Pakistan announces the Indigenous Fellowship Program for scholars pursuing PhD in recognized Pakistani universities. Selected fellows receive a monthly stipend of PKR 50,000, actual tuition reimbursement, and PKR 150,000 research project allowance.',
    'a0000001-0000-0000-0000-000000000005',
    'c0000001-0000-0000-0000-000000000010',
    'HEC Secretariat H-9 Islamabad & Regional Centers',
    'Islamabad',
    'Pakistan',
    true,
    '2026-11-15 00:00:00+05',
    '2027-11-15 00:00:00+05',
    '2026-10-31 23:59:59+05',
    'https://eportal.hec.gov.pk',
    'https://eportal.hec.gov.pk',
    'scholarships@hec.gov.pk',
    'Pakistani/AJK nationals with minimum 3.0 CGPA in MS/MPhil. Maximum age 35 years at application deadline.',
    '["Postgraduate Students", "MPhil / PhD Scholars", "Research Assistants"]'::jsonb,
    'published',
    0.99,
    0.98,
    'source_verified',
    false,
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80'
),
(
    '00000001-0000-0000-0000-000000000004',
    'International Conference on Advanced Robotics & Intelligent Systems (ICARIS 2026)',
    'icaris-2026-robotics-conference',
    'IEEE co-sponsored international research conference bringing top roboticists, control systems engineers, and AI scholars.',
    'The 5th ICARIS conference held at GIK Institute, Topi. Features keynote lectures from IEEE Fellows, technical paper presentations, live robotics demonstrations, and an industrial exhibition. Accepted and presented papers will be submitted for inclusion into IEEE Xplore.',
    'a0000001-0000-0000-0000-000000000004',
    'c0000001-0000-0000-0000-000000000004',
    'GIK Institute Main Campus, Topi, Swabi, KP',
    'Topi',
    'Pakistan',
    false,
    '2026-11-20 09:00:00+05',
    '2026-11-22 17:00:00+05',
    '2026-10-15 23:59:59+05',
    'https://giki.edu.pk',
    'https://giki.edu.pk',
    'icaris@giki.edu.pk',
    'Researchers, faculty, postgraduate students, and industry engineers in Robotics, Mechatronics, Control and AI.',
    '["Researchers", "Faculty", "Postgraduate Students", "Robotics Engineers"]'::jsonb,
    'published',
    0.97,
    0.95,
    'source_verified',
    false,
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80'
),
(
    '00000001-0000-0000-0000-000000000005',
    'KP Tech Career & Job Fair 2026 (Peshawar)',
    'kp-tech-career-job-fair-2026',
    'Direct on-site hiring event connecting 60+ premier software houses and multinational tech companies with graduating seniors.',
    'Organized at FAST-NUCES Peshawar in collaboration with KPITB. Over 60 IT companies from Islamabad, Lahore, and Peshawar will be interviewing for positions in Software Engineering, Flutter/React Native, AI/ML engineering, and Cloud DevOps. On-the-spot technical assessments and offer letters.',
    'a0000001-0000-0000-0000-000000000007',
    'c0000001-0000-0000-0000-000000000009',
    'FAST-NUCES Peshawar Campus, Industrial Estate Hayatabad',
    'Peshawar',
    'Pakistan',
    false,
    '2026-11-05 09:30:00+05',
    '2026-11-05 17:30:00+05',
    '2026-10-28 23:59:59+05',
    'https://pwr.nu.edu.pk',
    'https://pwr.nu.edu.pk',
    'careers@pwr.nu.edu.pk',
    'Open to final semester undergraduate students and recent graduates (classes of 2025 and 2026) of all HEC-recognized universities.',
    '["Graduating Seniors", "Recent Graduates", "Software Developers"]'::jsonb,
    'published',
    0.96,
    0.97,
    'source_verified',
    true,
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&auto=format&fit=crop&q=80'
)
ON CONFLICT (id) DO NOTHING;

-- 6. Link Opportunities to Tags
INSERT INTO public.opportunity_tags (opportunity_id, tag_id) VALUES
-- Hackathon
('00000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001'), -- AI
('00000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000003'), -- Cybersecurity
('00000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000004'), -- Software Engineering
('00000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000013'), -- Undergraduate
-- Incubator
('00000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000011'), -- Entrepreneurship
('00000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000012'), -- Startups
('00000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001'), -- AI
-- Fellowship
('00000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000007'), -- Research
('00000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000014'), -- Postgraduate
-- Robotics Conf
('00000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000010'), -- Robotics
('00000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000001'), -- AI
('00000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000007'), -- Research
-- Career Fair
('00000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000004'), -- Software Engineering
('00000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000005'), -- Flutter
('00000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000006')  -- Web Development
ON CONFLICT DO NOTHING;

-- 7. Add Provenance Source Items & Link to Opportunity Sources
INSERT INTO public.source_items (
    id, source_id, external_id, canonical_url, content_hash, title_raw,
    caption_raw, body_raw, published_at, content_type, status
) VALUES
(
    'e0000001-0000-0000-0000-000000000001',
    'd0000001-0000-0000-0000-000000000001',
    'uet-hackathon-2026-post-01',
    'https://www.uetpeshawar.edu.pk/student-notice-board',
    'h4sh_uet_ai_cyber_hackathon_official_announcement',
    'Call for Registration: KP AI & Cybersecurity Hackathon 2026',
    'UET Peshawar announces provincial hackathon in partnership with KPITB.',
    'Official announcement text detailing dates 24-26 Oct 2026, registration closing Oct 18, cash awards and eligibility for students in KP.',
    '2026-10-01 10:00:00+05',
    'html',
    'extracted'
),
(
    'e0000001-0000-0000-0000-000000000002',
    'd0000001-0000-0000-0000-000000000002',
    'kpitb-press-release-92',
    'https://www.kpitb.gov.pk',
    'h4sh_kpitb_press_release_hackathon_cross_confirm',
    'KPITB Partners with UET Peshawar for Provincial AI Hackathon',
    'Press release confirming funding and mentorship support for the hackathon.',
    'KPITB announces PKR 1.5 Million prize pool and incubation support for top teams at NIC Peshawar.',
    '2026-10-02 14:30:00+05',
    'html',
    'extracted'
)
ON CONFLICT (source_id, content_hash) DO NOTHING;

-- Link both sources to the single canonical hackathon opportunity (Demonstrating Multi-source Provenance)
INSERT INTO public.opportunity_sources (opportunity_id, source_item_id, relationship_type, is_primary_source) VALUES
('00000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', 'original', true),
('00000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000002', 'confirmation', false)
ON CONFLICT (opportunity_id, source_item_id) DO NOTHING;

-- 8. Add a Sample Opportunity Change Record (Audit & Change Tracking Demonstration)
INSERT INTO public.opportunity_changes (
    opportunity_id, field_name, old_value, new_value, source_item_id, change_type
) VALUES
(
    '00000001-0000-0000-0000-000000000001',
    'registration_deadline',
    '2026-10-12 23:59:59+05',
    '2026-10-18 23:59:59+05',
    'e0000001-0000-0000-0000-000000000001',
    'deadline_extension'
);
