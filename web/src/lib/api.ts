import { Opportunity, Category, Organization, Source, VerificationItem } from "@/types";
import { supabase } from "./supabase";
import { FALLBACK_OPPORTUNITIES } from "./fallback_data";
import {
  fetchPublishedFromSupabase,
  fetchPublishedPageFromSupabase,
  fetchOpportunityFromSupabase,
  fetchCategoriesFromSupabase,
  fetchStatsFromSupabase,
} from "./supabase_data";

export type OpportunitiesPageMeta = {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
};

export type OpportunitiesPageResult = {
  items: Opportunity[];
  meta: OpportunitiesPageMeta;
};

export const API_BASE = "https://nexus-pulse-api-ult5.onrender.com/api/v1";

export function getBase(): string {
  const live = process.env.NEXT_PUBLIC_API_URL || API_BASE;
  if (process.env.USE_LOCAL_API === "true") {
    return process.env.NEXT_PUBLIC_LOCAL_API_URL || "http://localhost:8000/api/v1";
  }
  return live;
}

// FALLBACK_OPPORTUNITIES imported from ./fallback_data

async function getAdminAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    try {
      const { cookies } = await import("next/headers");
      return cookies().get("np_admin")?.value || null;
    } catch {
      return null;
    }
  }
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function adminFetch(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = await getAdminAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetchWithTimeout(url, { ...options, headers }, timeoutMs);
  if ((res.status === 401 || res.status === 403) && typeof window !== "undefined") {
    window.location.assign("/admin/login");
  }
  return res;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}


export async function fetchOpportunities(params?: {
  category?: string;
  city?: string;
  is_online?: boolean;
  sort_by?: string;
  urgency?: string;
  limit?: number;
  page?: number;
  includePast?: boolean;
}): Promise<Opportunity[]> {
  const page = await fetchOpportunitiesPage(params);
  return page.items;
}

export async function fetchOpportunitiesPage(params?: {
  category?: string;
  city?: string;
  is_online?: boolean;
  sort_by?: string;
  urgency?: string;
  limit?: number;
  page?: number;
  includePast?: boolean;
}): Promise<OpportunitiesPageResult> {
  const page = Math.max(1, params?.page || 1);
  const pageSize = Math.min(Math.max(1, params?.limit || 12), 50);

  try {
    const live = await fetchPublishedPageFromSupabase(params);
    if (live.items.length > 0 || live.meta.total_items > 0) return live;
  } catch {
    // Render is the next fallback
  }

  try {
    const url = new URL(`${getBase()}/events`);
    if (params?.category) url.searchParams.set("category", params.category);
    if (params?.city) url.searchParams.set("city", params.city);
    if (params?.is_online !== undefined) url.searchParams.set("is_online", String(params.is_online));
    if (params?.sort_by) url.searchParams.set("sort_by", params.sort_by);
    if (params?.urgency) url.searchParams.set("urgency", params.urgency);
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", String(pageSize));
    url.searchParams.set("limit", String(pageSize));

    const res = await fetchWithTimeout(url.toString(), { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      const items: Opportunity[] = json.data || [];
      const meta = json.meta || {};
      if (items.length > 0 || meta.total_items > 0) {
        return {
          items,
          meta: {
            page: meta.page || page,
            page_size: meta.page_size || pageSize,
            total_items: meta.total_items ?? items.length,
            total_pages: meta.total_pages || Math.max(1, Math.ceil((meta.total_items ?? items.length) / pageSize)),
          },
        };
      }
    }
  } catch {
    // Graceful fallback to static verified records
  }

  const start = (page - 1) * pageSize;
  const slice = FALLBACK_OPPORTUNITIES.slice(start, start + pageSize);
  return {
    items: slice,
    meta: {
      page,
      page_size: pageSize,
      total_items: FALLBACK_OPPORTUNITIES.length,
      total_pages: Math.max(1, Math.ceil(FALLBACK_OPPORTUNITIES.length / pageSize)),
    },
  };
}

export async function fetchOpportunityBySlug(slug: string): Promise<Opportunity | null> {
  try {
    const live = await fetchOpportunityFromSupabase(slug);
    if (live) return live;
  } catch {
    // Render is the next fallback
  }
  try {
    const res = await fetchWithTimeout(`${getBase()}/events/${slug}`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch {
    // ignore
  }
  return FALLBACK_OPPORTUNITIES.find((o) => o.slug === slug || o.id === slug) || null;
}

export async function searchOpportunities(q: string): Promise<Opportunity[]> {
  const qLower = q.toLowerCase();
  try {
    const live = await fetchPublishedFromSupabase({ limit: 50, includePast: true });
    if (live.length > 0) {
      return live.filter(
        (o) =>
          o.title.toLowerCase().includes(qLower) ||
          o.summary.toLowerCase().includes(qLower) ||
          (o.city || "").toLowerCase().includes(qLower) ||
          (o.organization_name && o.organization_name.toLowerCase().includes(qLower)) ||
          o.tags.some((t) => t.toLowerCase().includes(qLower))
      );
    }
  } catch {
    // Render is the next fallback
  }
  try {
    const res = await fetchWithTimeout(`${getBase()}/events/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch {
    // fallback
  }
  return FALLBACK_OPPORTUNITIES.filter(
    (o) => o.title.toLowerCase().includes(qLower) || o.summary.toLowerCase().includes(qLower) || o.tags.some(t => t.toLowerCase().includes(qLower))
  );
}

export async function fetchRecommended(): Promise<Opportunity[]> {
  try {
    const live = await fetchPublishedFromSupabase({ limit: 6, featuredFirst: true, includePast: true });
    if (live.length > 0) return live;
  } catch {
    // Render is the next fallback
  }
  try {
    const res = await fetchWithTimeout(`${getBase()}/events/recommended`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) return json.data;
    }
  } catch {
    // fallback
  }
  return FALLBACK_OPPORTUNITIES;
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const live = await fetchCategoriesFromSupabase();
    if (live.length > 0) return live;
  } catch {
    // Render is the next fallback
  }
  try {
    const res = await fetchWithTimeout(`${getBase()}/categories`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch {}
  return [
    { id: "1", name: "Hackathon", slug: "hackathon", display_order: 1 },
    { id: "2", name: "Scholarship", slug: "scholarship", display_order: 2 },
    { id: "3", name: "Conference", slug: "conference", display_order: 3 },
    { id: "4", name: "Startup Program", slug: "startup-program", display_order: 4 },
    { id: "5", name: "Workshop", slug: "workshop", display_order: 5 },
    { id: "6", name: "Internship", slug: "internship", display_order: 6 },
  ];
}

const EMPTY_ADMIN_STATS = {
  sources_monitored: 0,
  active_sources: 0,
  failed_sources: 0,
  opportunities_discovered: 0,
  opportunities_published: 0,
  pending_verification: 0,
  duplicates_resolved: 0,
  organizations_listed: 0,
  source_links: 0,
  ai_extraction_success_rate: 0,
  auto_crawl: false,
  system_health: "Degraded",
};

export async function fetchAdminStats() {
  // Prefer API first — Supabase anon RLS hides `sources`, which made the homepage show 0.
  try {
    const res = await fetchWithTimeout(`${getBase()}/public-stats`, { cache: "no-store" }, 8000);
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        const data = json.data;
        // Enrich with public Supabase counts when API omits them
        try {
          const sb = await fetchStatsFromSupabase();
          if (sb) {
            return {
              ...data,
              organizations_listed: sb.organizations_listed ?? data.organizations_listed ?? 0,
              source_links: sb.source_links ?? data.source_links ?? 0,
              sources_monitored:
                data.sources_monitored > 0
                  ? data.sources_monitored
                  : sb.sources_monitored || 0,
              duplicates_resolved:
                data.duplicates_resolved > 0
                  ? data.duplicates_resolved
                  : sb.duplicates_resolved || 0,
              opportunities_published:
                data.opportunities_published > 0
                  ? data.opportunities_published
                  : sb.opportunities_published || 0,
            };
          }
        } catch {
          // keep API payload
        }
        return data;
      }
    }
  } catch {
    // Fall through to Supabase
  }

  try {
    const live = await fetchStatsFromSupabase();
    if (live) return live;
  } catch {
    // Graceful empty fallback
  }
  return { ...EMPTY_ADMIN_STATS };
}

function isNextRedirect(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export async function fetchLiveAdminStats() {
  try {
    const res = await adminFetch(`${getBase()}/admin/stats`, { cache: "no-store" }, 20000);
    if (res.status === 401 || res.status === 403) {
      const { redirect } = await import("next/navigation");
      redirect("/admin/login");
    }
    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }
  } catch (err) {
    if (isNextRedirect(err)) throw err;
  }
  return { ...EMPTY_ADMIN_STATS };
}

export async function fetchDetailedHealth() {
  let res: Response;
  try {
    res = await adminFetch(`${getBase()}/health/detailed`, { cache: "no-store" }, 20000);
  } catch {
    return null;
  }
  if (res.status === 401 || res.status === 403) {
    const { redirect } = await import("next/navigation");
    redirect("/admin/login");
  }
  if (res.ok) {
    const json = await res.json();
    return json.data || null;
  }
  return null;
}

export async function fetchAdminSources(): Promise<any[]> {
  try {
    const res = await adminFetch(`${getBase()}/admin/sources`, { cache: "no-store" }, 8000);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data)) return json.data;
    }
  } catch {}
  return [];
}

export async function fetchIngestionRuns(): Promise<any[]> {
  try {
    const res = await adminFetch(`${getBase()}/admin/ingestion/runs`, { cache: "no-store" }, 8000);
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch {}
  return [];
}

export async function fetchAuditLogs(): Promise<any[]> {
  try {
    const res = await adminFetch(`${getBase()}/admin/audit-logs`, { cache: "no-store" }, 8000);
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch {}
  return [];
}

export async function fetchVerificationQueue(): Promise<{ items: VerificationItem[]; error?: string }> {
  try {
    const res = await adminFetch(`${getBase()}/admin/review`, { cache: "no-store" }, 12000);
    if (res.ok) {
      const json = await res.json();
      return { items: json.data || [] };
    }
    return { items: [], error: `Review API returned ${res.status}` };
  } catch {
    return { items: [], error: "Could not reach the review API" };
  }
}

export interface ReviewCorrection {
  title?: string;
  summary?: string;
  description?: string;
  category_name?: string;
  organization_name?: string;
  city?: string;
  venue?: string;
  is_online?: boolean;
  start_date?: string;
  registration_deadline?: string;
  registration_url?: string;
  eligibility_summary?: string;
  contact_email?: string;
  featured?: boolean;
  admin_note?: string;
}

export type OpportunityCorrection = ReviewCorrection;

export interface AdminOpportunityListParams {
  q?: string;
  status?: string;
  category?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface AdminOpportunityListResult {
  items: Opportunity[];
  total: number;
  live_count: number;
  limit: number;
  offset: number;
  error?: string;
}

export interface ReviewWriteResult {
  success: boolean;
  error?: string;
  fields?: string[];
  opportunity?: Partial<Opportunity>;
  flyer_url?: string;
}

export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = getBase().replace(/\/api\/v1\/?$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

async function readReviewError(res: Response): Promise<ReviewWriteResult> {
  try {
    const json = await res.json();
    const detail = json.detail;
    if (detail && typeof detail === "object") {
      return {
        success: false,
        error: detail.message || "Could not save these details.",
        fields: Array.isArray(detail.fields) ? detail.fields : [],
        opportunity: detail.opportunity,
      };
    }
    return { success: false, error: typeof detail === "string" ? detail : "Could not save these details." };
  } catch {
    return { success: false, error: "Could not save these details." };
  }
}

export async function saveVerificationItem(queueId: string, corrections: ReviewCorrection): Promise<ReviewWriteResult> {
  try {
    const res = await adminFetch(`${getBase()}/admin/review/${queueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corrections),
    });
    if (!res.ok) return readReviewError(res);
    const json = await res.json();
    return { success: true, opportunity: json.data?.opportunity };
  } catch {
    return { success: false, error: "Could not reach the review API." };
  }
}

export async function uploadVerificationFlyer(queueId: string, file: File): Promise<ReviewWriteResult> {
  try {
    const body = new FormData();
    body.append("flyer_file", file);
    const res = await adminFetch(`${getBase()}/admin/review/${queueId}/flyer`, {
      method: "POST",
      body,
    });
    if (!res.ok) return readReviewError(res);
    const json = await res.json();
    return { success: true, flyer_url: json.data?.flyer_url };
  } catch {
    return { success: false, error: "Could not upload the image." };
  }
}

export async function approveVerificationItem(queueId: string, corrections?: ReviewCorrection): Promise<ReviewWriteResult> {
  try {
    const res = await adminFetch(`${getBase()}/admin/review/${queueId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corrections || {}),
    });
    if (!res.ok) return readReviewError(res);
    const json = await res.json();
    return { success: true, opportunity: json.data?.opportunity };
  } catch {
    return { success: false, error: "Could not reach the review API." };
  }
}

export async function rejectVerificationItem(queueId: string, reason?: string): Promise<{ success: boolean }> {
  try {
    const res = await adminFetch(`${getBase()}/admin/review/${queueId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || "Rejected by admin" }),
    });
    if (res.ok) {
      return { success: true };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

export async function fetchAdminOpportunities(
  params: AdminOpportunityListParams = {}
): Promise<AdminOpportunityListResult> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.status) qs.set("status", params.status);
  if (params.category) qs.set("category", params.category);
  if (params.sort) qs.set("sort", params.sort);
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  try {
    const res = await adminFetch(`${getBase()}/admin/opportunities${suffix}`, { cache: "no-store" }, 12000);
    if (!res.ok) {
      return { items: [], total: 0, live_count: 0, limit: 40, offset: 0, error: `Catalog API returned ${res.status}` };
    }
    const json = await res.json();
    const data = json.data || {};
    return {
      items: data.items || [],
      total: data.total || 0,
      live_count: data.live_count || 0,
      limit: data.limit || params.limit || 40,
      offset: data.offset || params.offset || 0,
    };
  } catch {
    return { items: [], total: 0, live_count: 0, limit: 40, offset: 0, error: "Could not reach the catalog API" };
  }
}

export async function saveAdminOpportunity(
  opportunityId: string,
  corrections: OpportunityCorrection
): Promise<ReviewWriteResult> {
  try {
    const res = await adminFetch(`${getBase()}/admin/opportunities/${opportunityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corrections),
    });
    if (!res.ok) return readReviewError(res);
    const json = await res.json();
    return { success: true, opportunity: json.data?.opportunity };
  } catch {
    return { success: false, error: "Could not reach the catalog API." };
  }
}

export async function uploadAdminOpportunityFlyer(
  opportunityId: string,
  file: File
): Promise<ReviewWriteResult> {
  try {
    const body = new FormData();
    body.append("flyer_file", file);
    const res = await adminFetch(`${getBase()}/admin/opportunities/${opportunityId}/flyer`, {
      method: "POST",
      body,
    });
    if (!res.ok) return readReviewError(res);
    const json = await res.json();
    return { success: true, flyer_url: json.data?.flyer_url };
  } catch {
    return { success: false, error: "Could not upload the image." };
  }
}

export async function unpublishAdminOpportunity(opportunityId: string): Promise<ReviewWriteResult> {
  try {
    const res = await adminFetch(`${getBase()}/admin/opportunities/${opportunityId}/unpublish`, { method: "POST" });
    if (!res.ok) return readReviewError(res);
    const json = await res.json();
    return { success: true, opportunity: json.data?.opportunity };
  } catch {
    return { success: false, error: "Could not unpublish this opportunity." };
  }
}

export async function rejectAdminOpportunity(
  opportunityId: string,
  reason?: string
): Promise<ReviewWriteResult> {
  try {
    const res = await adminFetch(`${getBase()}/admin/opportunities/${opportunityId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || "Rejected by admin" }),
    });
    if (!res.ok) return readReviewError(res);
    const json = await res.json();
    return { success: true, opportunity: json.data?.opportunity };
  } catch {
    return { success: false, error: "Could not delete this opportunity." };
  }
}

export async function expireAdminOpportunity(opportunityId: string): Promise<ReviewWriteResult> {
  try {
    const res = await adminFetch(`${getBase()}/admin/opportunities/${opportunityId}/expire`, { method: "POST" });
    if (!res.ok) return readReviewError(res);
    const json = await res.json();
    return { success: true, opportunity: json.data?.opportunity };
  } catch {
    return { success: false, error: "Could not expire this opportunity." };
  }
}

export async function publishAdminOpportunity(
  opportunityId: string,
  corrections?: OpportunityCorrection
): Promise<ReviewWriteResult> {
  try {
    const res = await adminFetch(`${getBase()}/admin/opportunities/${opportunityId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corrections || {}),
    });
    if (!res.ok) return readReviewError(res);
    const json = await res.json();
    return { success: true, opportunity: json.data?.opportunity };
  } catch {
    return { success: false, error: "Could not publish this opportunity." };
  }
}

export async function testSourceCrawl(url: string, sourceType: string, parserKey: string) {
  const res = await adminFetch(`${getBase()}/admin/sources/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, source_type: sourceType, parser_key: parserKey }),
  });
  return res.json();
}

export async function saveOpportunity(id: string): Promise<{ saved: boolean }> {
  try {
    const res = await fetch(`${getBase()}/events/${id}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const json = await res.json();
      return json.data || { saved: true };
    }
  } catch {}
  return { saved: true };
}

export async function reportOpportunity(
  id: string,
  reportType: string,
  details: string
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${getBase()}/events/${id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_type: reportType, details }),
    });
    if (res.ok) {
      return { success: true };
    }
  } catch {}
  return { success: true };
}

export async function fetchSavedOpportunities(): Promise<Opportunity[]> {
  try {
    const res = await fetch(`${getBase()}/saved`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }
  } catch {}
  return [];
}

export interface CuratorResult {
  opportunity: {
    id: string;
    title: string;
    slug: string;
    summary: string;
    registration_deadline: string | null;
    start_date: string | null;
    venue: string | null;
    city: string | null;
    registration_url: string;
    status: string;
    trust_score: number;
    ai_confidence: number;
    verification_status: string;
    flyer_url: string | null;
  };
  is_new: boolean;
  changes_detected: string[];
  qr_codes: string[];
  ocr_preview: string | null;
  source_item_id: string;
}

export async function curateOpportunity(formData: FormData): Promise<{ success: boolean; data?: CuratorResult; error?: string }> {
  try {
    const res = await adminFetch(`${getBase()}/ingestion/curator`, {
      method: "POST",
      body: formData,
    }, 120000);
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.detail || json.message || "Failed to process curation" };
    }
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || "Network error communicating with curator pipeline" };
  }
}

export async function triggerSourceCrawl(sourceId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await adminFetch(`${getBase()}/admin/sources/${sourceId}/crawl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.detail || json.message || "Failed to trigger crawl" };
    }
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error triggering crawl" };
  }
}

export async function createAdminSource(payload: {
  name: string;
  source_type: string;
  platform: string;
  url: string;
  crawl_frequency: number;
  parser_key: string;
  trust_score: number;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await adminFetch(`${getBase()}/admin/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.detail || json.message || "Failed to create source" };
    }
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error creating source" };
  }
}

export async function triggerApifyScrape(
  targetUrl: string,
  platform: "Facebook" | "Instagram" = "Facebook"
): Promise<{ success: boolean; data?: any; error?: string; run_id?: string; message?: string }> {
  try {
    const res = await adminFetch(
      `${getBase()}/ingestion/social/apify/trigger?target_url=${encodeURIComponent(targetUrl)}&platform=${platform}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.detail || json.message || "Failed to trigger Apify scraper" };
    }
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || "Network error triggering Apify scraper" };
  }
}

export async function checkApifyRunStatus(
  runId: string
): Promise<{ success: boolean; status?: string; error?: string; default_dataset_id?: string }> {
  try {
    const res = await adminFetch(`${getBase()}/ingestion/social/apify/run-status?run_id=${encodeURIComponent(runId)}`);
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to check status" };
  }
}

export async function fetchSources(): Promise<any[]> {
  try {
    const res = await fetchWithTimeout(`${getBase()}/sources`, { cache: "no-store" }, 8000);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export async function syncApifyRun(
  runId: string,
  platform: "Facebook" | "Instagram" = "Facebook"
): Promise<{ success: boolean; status?: string; message?: string; error?: string; opportunities_published?: number; opportunities_updated?: number }> {
  try {
    const res = await adminFetch(
      `${getBase()}/ingestion/social/apify/sync-run?run_id=${encodeURIComponent(runId)}&platform=${platform}`,
      { method: "POST" }
    );
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to sync run" };
  }
}
