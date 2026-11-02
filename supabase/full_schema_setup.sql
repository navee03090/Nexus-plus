-- ============================================================
-- NEXUS PULSE: Migration 001 - Initial Complete Schema
-- Tagline: "Never Miss the Opportunity That Matters."
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    country TEXT DEFAULT 'Pakistan',
    city TEXT DEFAULT 'Peshawar',
    education_level TEXT,
    university TEXT,
    field_of_study TEXT,
    semester TEXT,
    graduation_year INT,
    professional_status TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    organization_type TEXT NOT NULL CHECK (organization_type IN (
        'Government', 'University', 'Research Institute', 'NGO',
        'Company', 'Startup', 'Technology Organization',
        'International Organization', 'Other'
    )),
    country TEXT DEFAULT 'Pakistan',
    city TEXT,
    website_url TEXT,
    logo_url TEXT,
    official_status TEXT DEFAULT 'official',
    trust_score FLOAT DEFAULT 0.85,
    verified BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Sources Table (Monitored Channels)
CREATE TABLE IF NOT EXISTS public.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN (
        'Website', 'RSS', 'Sitemap', 'API', 'Social', 'PDF', 'Manual', 'Webhook'
    )),
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    identifier TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'warning', 'failing', 'disabled')),
    trust_score FLOAT DEFAULT 0.85,
    crawl_frequency INT DEFAULT 3600,
    last_checked_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    consecutive_failures INT DEFAULT 0,
    parser_key TEXT NOT NULL,
    requires_authentication BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Source Items Table (Raw Evidence)
CREATE TABLE IF NOT EXISTS public.source_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES public.sources(id) ON DELETE CASCADE,
    external_id TEXT,
    canonical_url TEXT,
    content_hash TEXT NOT NULL,
    title_raw TEXT,
    caption_raw TEXT,
    body_raw TEXT,
    published_at TIMESTAMPTZ,
    discovered_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    raw_payload JSONB DEFAULT '{}'::jsonb NOT NULL,
    content_type TEXT DEFAULT 'html' CHECK (content_type IN ('text', 'image', 'video', 'pdf', 'html', 'mixed')),
    language TEXT DEFAULT 'en',
    status TEXT DEFAULT 'discovered' CHECK (status IN ('discovered', 'processing', 'extracted', 'duplicated', 'rejected', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(source_id, content_hash)
);

-- 5. Source Media Table
CREATE TABLE IF NOT EXISTS public.source_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_item_id UUID REFERENCES public.source_items(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL,
    original_url TEXT,
    storage_path TEXT,
    mime_type TEXT,
    file_hash TEXT,
    width INT,
    height INT,
    ocr_text TEXT,
    qr_data JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. Tags Table
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category_slug TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 8. Extractions Table (AI Extraction History)
CREATE TABLE IF NOT EXISTS public.extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_item_id UUID REFERENCES public.source_items(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    raw_response JSONB,
    structured_output JSONB NOT NULL,
    confidence_score FLOAT DEFAULT 0.0,
    validation_status TEXT DEFAULT 'valid' CHECK (validation_status IN ('valid', 'flagged', 'invalid')),
    validation_warnings JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 9. Canonical Opportunities Table
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    venue TEXT,
    city TEXT,
    country TEXT DEFAULT 'Pakistan',
    is_online BOOLEAN DEFAULT false,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    registration_deadline TIMESTAMPTZ,
    registration_url TEXT,
    application_url TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    eligibility_summary TEXT,
    target_audience JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'published' CHECK (status IN (
        'discovered', 'processing', 'pending_review', 'published',
        'updated', 'cancelled', 'postponed', 'expired', 'rejected'
    )),
    trust_score FLOAT DEFAULT 0.85,
    ai_confidence FLOAT DEFAULT 0.85,
    verification_status TEXT DEFAULT 'source_verified' CHECK (verification_status IN (
        'unverified', 'ai_verified', 'human_verified', 'source_verified', 'rejected'
    )),
    featured BOOLEAN DEFAULT false,
    view_count INT DEFAULT 0,
    save_count INT DEFAULT 0,
    flyer_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    published_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
);

-- 10. Opportunity Sources (Many-to-Many Provenance)
CREATE TABLE IF NOT EXISTS public.opportunity_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
    source_item_id UUID REFERENCES public.source_items(id) ON DELETE CASCADE,
    relationship_type TEXT DEFAULT 'original' CHECK (relationship_type IN (
        'original', 'confirmation', 'duplicate', 'update', 'registration', 'reference'
    )),
    is_primary_source BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(opportunity_id, source_item_id)
);

-- 11. Opportunity Tags
CREATE TABLE IF NOT EXISTS public.opportunity_tags (
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (opportunity_id, tag_id)
);

-- 12. Opportunity Embeddings (pgvector)
CREATE TABLE IF NOT EXISTS public.opportunity_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID UNIQUE REFERENCES public.opportunities(id) ON DELETE CASCADE,
    embedding vector(768),
    model TEXT DEFAULT 'text-embedding-004',
    content_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 13. Opportunity Changes (Change Tracking & Audit)
CREATE TABLE IF NOT EXISTS public.opportunity_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    source_item_id UUID REFERENCES public.source_items(id) ON DELETE SET NULL,
    detected_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN (
        'deadline_extension', 'deadline_shortened', 'venue_change',
        'date_change', 'cancelled', 'postponed', 'details_update', 'eligibility_change'
    ))
);

-- 14. Eligibility Rules Table
CREATE TABLE IF NOT EXISTS public.eligibility_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL,
    operator TEXT NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_mandatory BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 15. User Interests
CREATE TABLE IF NOT EXISTS public.user_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, tag_id)
);

-- 16. User Preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_cities JSONB DEFAULT '["Peshawar", "Islamabad"]'::jsonb,
    preferred_opportunity_types JSONB DEFAULT '[]'::jsonb,
    online_only BOOLEAN DEFAULT false,
    in_person_only BOOLEAN DEFAULT false,
    daily_digest BOOLEAN DEFAULT true,
    instant_urgent BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 17. Saved Opportunities (Bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, opportunity_id)
);

-- 18. Notification Preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    telegram_enabled BOOLEAN DEFAULT false,
    telegram_chat_id TEXT,
    push_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    remind_7_days BOOLEAN DEFAULT true,
    remind_3_days BOOLEAN DEFAULT true,
    remind_24_hours BOOLEAN DEFAULT true,
    remind_6_hours BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 19. Notification Deliveries
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'NEW_MATCH', 'DEADLINE_APPROACHING', 'OPPORTUNITY_UPDATED',
        'OPPORTUNITY_CANCELLED', 'OPPORTUNITY_POSTPONED', 'SAVED_EVENT_REMINDER'
    )),
    channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'telegram', 'push')),
    scheduled_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    provider_message_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 20. Ingestion Runs
CREATE TABLE IF NOT EXISTS public.ingestion_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES public.sources(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'warning', 'failed')),
    started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    completed_at TIMESTAMPTZ,
    items_found INT DEFAULT 0,
    items_processed INT DEFAULT 0,
    items_duplicated INT DEFAULT 0,
    items_rejected INT DEFAULT 0,
    error_message TEXT
);

-- 21. Ingestion Errors
CREATE TABLE IF NOT EXISTS public.ingestion_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    task_name TEXT NOT NULL,
    error_type TEXT NOT NULL,
    message TEXT NOT NULL,
    stack_trace TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 22. Verification Queue (Human Verification)
CREATE TABLE IF NOT EXISTS public.verification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
    source_item_id UUID REFERENCES public.source_items(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
    assigned_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 23. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    before_state JSONB,
    after_state JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 24. Opportunity Reports
CREATE TABLE IF NOT EXISTS public.opportunity_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    report_type TEXT NOT NULL CHECK (report_type IN (
        'wrong_date', 'wrong_deadline', 'wrong_venue', 'wrong_link',
        'duplicate', 'cancelled_event', 'spam', 'other'
    )),
    details TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 25. Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_name TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
-- ============================================================
-- NEXUS PULSE: Migration 002 - Indexes, pgvector, and RLS Policies
-- Tagline: "Never Miss the Opportunity That Matters."
-- ============================================================

-- ============================================================
-- 1. INDEXES
-- ============================================================

-- Opportunities Full-Text Search (GIN)
CREATE INDEX IF NOT EXISTS idx_opportunities_fts ON public.opportunities USING gin (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(description, ''))
);

-- Opportunities Filter Indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_slug ON public.opportunities(slug);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON public.opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON public.opportunities(registration_deadline);
CREATE INDEX IF NOT EXISTS idx_opportunities_start_date ON public.opportunities(start_date);
CREATE INDEX IF NOT EXISTS idx_opportunities_category ON public.opportunities(category_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_organization ON public.opportunities(organization_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_city ON public.opportunities(city);
CREATE INDEX IF NOT EXISTS idx_opportunities_is_online ON public.opportunities(is_online);
CREATE INDEX IF NOT EXISTS idx_opportunities_featured ON public.opportunities(featured);

-- Opportunity Embeddings HNSW Index for pgvector
CREATE INDEX IF NOT EXISTS idx_opportunity_embeddings_hnsw 
ON public.opportunity_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- Source Items & Ingestion Indexes
CREATE INDEX IF NOT EXISTS idx_source_items_hash ON public.source_items(content_hash);
CREATE INDEX IF NOT EXISTS idx_source_items_source_id ON public.source_items(source_id);
CREATE INDEX IF NOT EXISTS idx_source_items_published_at ON public.source_items(published_at);
CREATE INDEX IF NOT EXISTS idx_source_media_item_id ON public.source_media(source_item_id);

-- User Relations Indexes
CREATE INDEX IF NOT EXISTS idx_saved_user ON public.saved_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_deliveries_user ON public.notification_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_deliveries_scheduled ON public.notification_deliveries(scheduled_at, status);

-- ============================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eligibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper function: Is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT coalesce(role = 'admin', false)
        FROM public.profiles
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public READ Policies
DROP POLICY IF EXISTS "Public opportunities viewable by everyone" ON public.opportunities;
CREATE POLICY "Public opportunities viewable by everyone"
ON public.opportunities FOR SELECT
USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "Organizations viewable by everyone" ON public.organizations;
CREATE POLICY "Organizations viewable by everyone"
ON public.organizations FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Categories viewable by everyone" ON public.categories;
CREATE POLICY "Categories viewable by everyone"
ON public.categories FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Tags viewable by everyone" ON public.tags;
CREATE POLICY "Tags viewable by everyone"
ON public.tags FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Opportunity tags viewable by everyone" ON public.opportunity_tags;
CREATE POLICY "Opportunity tags viewable by everyone"
ON public.opportunity_tags FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Opportunity sources viewable by everyone" ON public.opportunity_sources;
CREATE POLICY "Opportunity sources viewable by everyone"
ON public.opportunity_sources FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Opportunity changes viewable by everyone" ON public.opportunity_changes;
CREATE POLICY "Opportunity changes viewable by everyone"
ON public.opportunity_changes FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Eligibility rules viewable by everyone" ON public.eligibility_rules;
CREATE POLICY "Eligibility rules viewable by everyone"
ON public.eligibility_rules FOR SELECT
USING (true);

-- Authenticated User Policies (Own Data)
DROP POLICY IF EXISTS "Users can view and edit own profile" ON public.profiles;
CREATE POLICY "Users can view and edit own profile"
ON public.profiles FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own saved opportunities" ON public.saved_opportunities;
CREATE POLICY "Users can manage own saved opportunities"
ON public.saved_opportunities FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own interests" ON public.user_interests;
CREATE POLICY "Users can manage own interests"
ON public.user_interests FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage own preferences"
ON public.user_preferences FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can manage own notification preferences"
ON public.notification_preferences FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own notification deliveries" ON public.notification_deliveries;
CREATE POLICY "Users can view own notification deliveries"
ON public.notification_deliveries FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create opportunity reports" ON public.opportunity_reports;
CREATE POLICY "Users can create opportunity reports"
ON public.opportunity_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own reports" ON public.opportunity_reports;
CREATE POLICY "Users can view own reports"
ON public.opportunity_reports FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

-- Admin / Service-Role Policies (Privileged Tables)
DROP POLICY IF EXISTS "Admin full access to sources" ON public.sources;
CREATE POLICY "Admin full access to sources"
ON public.sources FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin full access to source_items" ON public.source_items;
CREATE POLICY "Admin full access to source_items"
ON public.source_items FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin full access to source_media" ON public.source_media;
CREATE POLICY "Admin full access to source_media"
ON public.source_media FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin full access to extractions" ON public.extractions;
CREATE POLICY "Admin full access to extractions"
ON public.extractions FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin full access to opportunities" ON public.opportunities;
CREATE POLICY "Admin full access to opportunities"
ON public.opportunities FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin full access to verification_queue" ON public.verification_queue;
CREATE POLICY "Admin full access to verification_queue"
ON public.verification_queue FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin full access to ingestion_runs" ON public.ingestion_runs;
CREATE POLICY "Admin full access to ingestion_runs"
ON public.ingestion_runs FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin full access to ingestion_errors" ON public.ingestion_errors;
CREATE POLICY "Admin full access to ingestion_errors"
ON public.ingestion_errors FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin full access to audit_logs" ON public.audit_logs;
CREATE POLICY "Admin full access to audit_logs"
ON public.audit_logs FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin full access to opportunity_reports" ON public.opportunity_reports;
CREATE POLICY "Admin full access to opportunity_reports"
ON public.opportunity_reports FOR ALL
USING (public.is_admin());

-- ============================================================
-- 3. STORAGE BUCKETS (Metadata insert)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('nexus-pulse-media', 'nexus-pulse-media', true),
    ('nexus-pulse-flyers', 'nexus-pulse-flyers', true),
    ('nexus-pulse-avatars', 'nexus-pulse-avatars', false)
ON CONFLICT (id) DO NOTHING;

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
