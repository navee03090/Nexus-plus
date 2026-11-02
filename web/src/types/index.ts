export interface Opportunity {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  venue?: string;
  city: string;
  country: string;
  is_online: boolean;
  start_date?: string;
  end_date?: string;
  registration_deadline?: string;
  registration_url?: string;
  application_url?: string;
  contact_email?: string;
  contact_phone?: string;
  eligibility_summary?: string;
  target_audience: string[];
  status: string;
  trust_score: number;
  ai_confidence: number;
  verification_status: string;
  featured: boolean;
  view_count: number;
  save_count: number;
  flyer_url?: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  organization_id?: string;
  organization_name?: string;
  organization_slug?: string;
  organization_logo?: string;
  category_id?: string;
  category_name?: string;
  category_slug?: string;
  tags: string[];
  match_score?: number;
  match_reasons?: string[];
  deadline_urgency?: string;
  deadline_label?: string;
  sources?: OpportunitySource[];
  changes?: OpportunityChange[];
  provenance_reasons?: string[];
}

export interface OpportunitySource {
  id: string;
  source_item_id: string;
  relationship_type: string;
  is_primary_source: boolean;
  platform: string;
  source_name: string;
  canonical_url: string;
  created_at: string;
}

export interface OpportunityChange {
  id: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  change_type: string;
  detected_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  display_order: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  organization_type: string;
  country: string;
  city?: string;
  website_url?: string;
  logo_url?: string;
  trust_score: number;
  verified: boolean;
}

export interface Source {
  id: string;
  name: string;
  source_type: string;
  platform: string;
  url: string;
  parser_key: string;
  trust_score: number;
  crawl_frequency: number;
  status: string;
  is_active: boolean;
  last_checked_at?: string;
}

export interface VerificationItem {
  queue_id: string;
  reason: string;
  created_at: string;
  opportunity: Opportunity;
  source_evidence: {
    source_item_id: string;
    title_raw?: string;
    body_raw?: string;
    canonical_url?: string;
    published_at?: string;
  };
}
