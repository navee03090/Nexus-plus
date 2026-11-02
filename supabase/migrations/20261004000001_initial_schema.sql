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
