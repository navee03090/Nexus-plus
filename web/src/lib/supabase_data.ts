import { Opportunity, Category } from "@/types";

const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ervfizmcgcatlwynupbt.supabase.co"
).replace(/\/$/, "");
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_IJTTMi5K-ariqsakvSrYiA_LmeINzor";

const OPP_SELECT =
  "*,organizations(name,slug,logo_url),categories(name,slug),opportunity_tags(tags(name))";

type NestedOrg = { name?: string; slug?: string; logo_url?: string } | null;
type NestedCat = { name?: string; slug?: string } | null;
type NestedTagRow = { tags?: { name?: string } | null } | null;

interface SupabaseOpportunityRow {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  venue?: string | null;
  city?: string | null;
  country?: string | null;
  is_online?: boolean | null;
  start_date?: string | null;
  end_date?: string | null;
  registration_deadline?: string | null;
  registration_url?: string | null;
  application_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  eligibility_summary?: string | null;
  target_audience?: string[] | null;
  status: string;
  trust_score?: number | null;
  ai_confidence?: number | null;
  verification_status?: string | null;
  featured?: boolean | null;
  view_count?: number | null;
  save_count?: number | null;
  flyer_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
  organization_id?: string | null;
  category_id?: string | null;
  organizations?: NestedOrg;
  categories?: NestedCat;
  opportunity_tags?: NestedTagRow[] | null;
}

function restHeaders(): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: "application/json",
  };
}

async function restGet<T>(pathAndQuery: string): Promise<T | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    headers: restHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

async function restCount(table: string, extraQuery = ""): Promise<number> {
  const qs = extraQuery ? `?select=id&${extraQuery}` : "?select=id";
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`, {
    headers: { ...restHeaders(), Prefer: "count=exact" },
    cache: "no-store",
    method: "HEAD",
  });
  const range = res.headers.get("content-range") || "";
  const total = range.split("/")[1];
  const n = Number(total);
  return Number.isFinite(n) ? n : 0;
}

function isUpcomingOpportunity(row: {
  registration_deadline?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}): boolean {
  const now = Date.now();
  const toMs = (value?: string | null) => {
    if (!value) return null;
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? null : t;
  };
  const end = toMs(row.end_date);
  const start = toMs(row.start_date);
  const deadline = toMs(row.registration_deadline);
  if (end != null && end < now) return false;
  if (deadline != null && deadline < now && (start == null || start < now)) return false;
  if (deadline == null && start != null && start < now) return false;
  return true;
}

function deadlineUrgency(deadline?: string | null): { status: string; label: string } {
  if (!deadline) return { status: "Normal", label: "No deadline specified" };
  const diff = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) return { status: "Expired", label: "Registration Closed" };
  const hours = diff / 3_600_000;
  const days = diff / 86_400_000;
  if (hours <= 48) {
    if (hours <= 1) return { status: "Urgent", label: "Closes in under 1 hour!" };
    return { status: "Urgent", label: `Closes in ${Math.floor(hours)} hours` };
  }
  if (days <= 7) return { status: "Closing Soon", label: `Closes in ${Math.floor(days)} days` };
  return { status: "Normal", label: `Closes in ${Math.floor(days)} days` };
}

function mapOpportunity(row: SupabaseOpportunityRow): Opportunity {
  const org = row.organizations;
  const cat = row.categories;
  const tags = (row.opportunity_tags || [])
    .map((t) => t?.tags?.name)
    .filter((name): name is string => Boolean(name));
  const urgency = deadlineUrgency(row.registration_deadline);
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary || "",
    description: row.description || "",
    venue: row.venue || undefined,
    city: row.city || "",
    country: row.country || "Pakistan",
    is_online: Boolean(row.is_online),
    start_date: row.start_date || undefined,
    end_date: row.end_date || undefined,
    registration_deadline: row.registration_deadline || undefined,
    registration_url: row.registration_url || undefined,
    application_url: row.application_url || undefined,
    contact_email: row.contact_email || undefined,
    contact_phone: row.contact_phone || undefined,
    eligibility_summary: row.eligibility_summary || undefined,
    target_audience: row.target_audience || [],
    status: row.status,
    trust_score: row.trust_score ?? 0.85,
    ai_confidence: row.ai_confidence ?? 0.85,
    verification_status: row.verification_status || "source_verified",
    featured: Boolean(row.featured),
    view_count: row.view_count ?? 0,
    save_count: row.save_count ?? 0,
    flyer_url: row.flyer_url || undefined,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    published_at: row.published_at || row.created_at || new Date().toISOString(),
    organization_id: row.organization_id || undefined,
    organization_name: org?.name || "Verified Organizer",
    organization_slug: org?.slug || undefined,
    organization_logo: org?.logo_url || undefined,
    category_id: row.category_id || undefined,
    category_name: cat?.name || "Other",
    category_slug: cat?.slug || "other",
    tags,
    deadline_urgency: urgency.status,
    deadline_label: urgency.label,
    sources: [],
    match_score: undefined,
    match_reasons: [],
  };
}

export type PublishedListParams = {
  category?: string;
  city?: string;
  is_online?: boolean;
  sort_by?: string;
  urgency?: string;
  limit?: number;
  page?: number;
  featuredFirst?: boolean;
};

export type PublishedPageResult = {
  items: Opportunity[];
  meta: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
};

function buildPublishedQuery(params?: PublishedListParams) {
  const page = Math.max(1, params?.page || 1);
  const pageSize = Math.min(Math.max(1, params?.limit || 12), 50);
  const offset = (page - 1) * pageSize;

  const qs = new URLSearchParams();
  qs.set("select", OPP_SELECT);
  qs.set("status", "in.(published,updated)");
  qs.set("limit", String(pageSize));
  qs.set("offset", String(offset));

  const countFilters: string[] = ["status=in.(published,updated)"];

  if (params?.city) {
    qs.set("city", `ilike.${params.city}`);
    countFilters.push(`city=ilike.${params.city}`);
  }
  if (params?.is_online !== undefined) {
    qs.set("is_online", `eq.${params.is_online}`);
    countFilters.push(`is_online=eq.${params.is_online}`);
  }

  if (params?.sort_by === "deadline") {
    qs.set("order", "registration_deadline.asc.nullslast");
  } else if (params?.sort_by === "popular") {
    qs.set("order", "view_count.desc");
  } else if (params?.sort_by === "trust") {
    qs.set("order", "trust_score.desc,published_at.desc");
  } else if (params?.featuredFirst) {
    qs.set("order", "featured.desc,trust_score.desc,published_at.desc");
  } else {
    qs.set("order", "published_at.desc");
  }

  return { qs, page, pageSize, countFilters };
}

export async function fetchPublishedFromSupabase(
  params?: PublishedListParams
): Promise<Opportunity[]> {
  const page = await fetchPublishedPageFromSupabase(params);
  return page.items;
}

export async function fetchPublishedPageFromSupabase(
  params?: PublishedListParams
): Promise<PublishedPageResult> {
  const empty = {
    items: [] as Opportunity[],
    meta: {
      page: Math.max(1, params?.page || 1),
      page_size: Math.min(Math.max(1, params?.limit || 12), 50),
      total_items: 0,
      total_pages: 0,
    },
  };

  const { qs, page, pageSize, countFilters } = buildPublishedQuery(params);

  if (params?.category) {
    const cats = await restGet<{ id: string }[]>(
      `categories?select=id&slug=eq.${encodeURIComponent(params.category.toLowerCase())}`
    );
    if (!cats?.[0]?.id) return empty;
    qs.set("category_id", `eq.${cats[0].id}`);
    countFilters.push(`category_id=eq.${cats[0].id}`);
  }

  let data = await restGet<SupabaseOpportunityRow[]>(`opportunities?${qs.toString()}`);
  if (!data) {
    data = await restGet<SupabaseOpportunityRow[]>(
      `opportunities?select=*&status=in.(published,updated)&order=published_at.desc&limit=${pageSize}&offset=${(page - 1) * pageSize}`
    );
  }
  if (!data || data.length === 0) return empty;

  let items = data.filter(isUpcomingOpportunity).map(mapOpportunity);
  if (params?.urgency === "urgent") {
    items = items.filter(
      (o) => o.deadline_urgency === "Urgent" || o.deadline_urgency === "Closing Soon"
    );
  }

  let totalItems = await restCount("opportunities", countFilters.join("&"));
  if (!totalItems) totalItems = items.length + (page - 1) * pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    items,
    meta: {
      page,
      page_size: pageSize,
      total_items: totalItems,
      total_pages: totalPages,
    },
  };
}

export async function fetchOpportunityFromSupabase(idOrSlug: string): Promise<Opportunity | null> {
  const encoded = encodeURIComponent(idOrSlug);
  const bySlug = await restGet<SupabaseOpportunityRow[]>(
    `opportunities?select=${OPP_SELECT}&slug=eq.${encoded}&limit=1`
  );
  let row = bySlug?.[0] || null;
  if (!row) {
    const byId = await restGet<SupabaseOpportunityRow[]>(
      `opportunities?select=${OPP_SELECT}&id=eq.${encoded}&limit=1`
    );
    row = byId?.[0] || null;
  }
  return row ? mapOpportunity(row) : null;
}

export async function fetchCategoriesFromSupabase(): Promise<Category[]> {
  const data = await restGet<Category[]>(
    "categories?select=id,name,slug,description,icon,display_order&is_active=eq.true&order=display_order.asc"
  );
  return data || [];
}

export async function fetchStatsFromSupabase() {
  try {
    const [published, allOpps, sources, pending] = await Promise.all([
      restCount("opportunities", "status=in.(published,updated)"),
      restCount("opportunities"),
      restCount("sources"),
      restCount("verification_queue", "status=eq.pending"),
    ]);
    return {
      sources_monitored: sources,
      active_sources: sources,
      failed_sources: 0,
      opportunities_discovered: allOpps,
      opportunities_published: published,
      pending_verification: pending,
      duplicates_resolved: 0,
      ai_extraction_success_rate: 0,
      auto_crawl: false,
      system_health: "Healthy",
    };
  } catch {
    return null;
  }
}
