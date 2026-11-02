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

