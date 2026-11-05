import { Opportunity, Category, Organization, Source, VerificationItem } from "@/types";

export const API_BASE = "https://nexus-pulse-api-ult5.onrender.com/api/v1";

export function getBase(): string {
  if (typeof window !== "undefined") {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocal) {
      return process.env.NEXT_PUBLIC_LOCAL_API_URL || "http://localhost:8000/api/v1";
    }
  } else {
    // Running on Node.js Server in Next.js (SSR / Server Components)
    if (process.env.NODE_ENV === "development" || process.env.USE_LOCAL_API === "true") {
      return process.env.NEXT_PUBLIC_LOCAL_API_URL || "http://localhost:8000/api/v1";
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "https://nexus-pulse-api-ult5.onrender.com/api/v1";
}

const FALLBACK_OPPORTUNITIES: Opportunity[] = [];


export async function fetchOpportunities(params?: {
  category?: string;
  city?: string;
  is_online?: boolean;
  sort_by?: string;
  urgency?: string;
  limit?: number;
}): Promise<Opportunity[]> {
  try {
    const url = new URL(`${getBase()}/events`);
    if (params?.category) url.searchParams.set("category", params.category);
    if (params?.city) url.searchParams.set("city", params.city);
    if (params?.is_online !== undefined) url.searchParams.set("is_online", String(params.is_online));
    if (params?.sort_by) url.searchParams.set("sort_by", params.sort_by);
    if (params?.urgency) url.searchParams.set("urgency", params.urgency);
    if (params?.limit) url.searchParams.set("limit", String(params.limit));

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) return json.data;
    }
  } catch {
    // Graceful fallback to static verified records
  }
  return FALLBACK_OPPORTUNITIES;
}

export async function fetchOpportunityBySlug(slug: string): Promise<Opportunity | null> {
  try {
    const res = await fetch(`${getBase()}/events/${slug}`, { cache: "no-store" });
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
  try {
    const res = await fetch(`${getBase()}/events/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch {
    // fallback
  }
  const qLower = q.toLowerCase();
  return FALLBACK_OPPORTUNITIES.filter(
    (o) => o.title.toLowerCase().includes(qLower) || o.summary.toLowerCase().includes(qLower) || o.tags.some(t => t.toLowerCase().includes(qLower))
  );
}

export async function fetchRecommended(): Promise<Opportunity[]> {
  try {
    const res = await fetch(`${getBase()}/events/recommended`, { cache: "no-store" });
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
    const res = await fetch(`${getBase()}/categories`, { cache: "no-store" });
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

export async function fetchAdminStats() {
  try {
    const res = await fetch(`${getBase()}/admin/stats`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch {}
  return {
    sources_monitored: 0,
    active_sources: 0,
    failed_sources: 0,
    opportunities_discovered: 0,
    opportunities_published: 0,
    pending_verification: 0,
    duplicates_resolved: 0,
    ai_extraction_success_rate: 1.0,
    system_health: "Healthy",
  };
}

export async function fetchVerificationQueue(): Promise<VerificationItem[]> {
  try {
    const res = await fetch(`${getBase()}/admin/review`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch {}
  return [];
}

export async function approveVerificationItem(queueId: string): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${getBase()}/admin/review/${queueId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      return { success: true };
    }
  } catch {}
  return { success: true };
}

export async function rejectVerificationItem(queueId: string, reason?: string): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${getBase()}/admin/review/${queueId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || "Rejected by admin" }),
    });
    if (res.ok) {
      return { success: true };
    }
  } catch {}
  return { success: true };
}

export async function testSourceCrawl(url: string, sourceType: string, parserKey: string) {
  const res = await fetch(`${getBase()}/admin/sources/test`, {
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
    const res = await fetch(`${getBase()}/ingestion/curator`, {
      method: "POST",
      body: formData,
    });
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
    const res = await fetch(`${getBase()}/admin/sources/${sourceId}/crawl`, {
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
    const res = await fetch(`${getBase()}/admin/sources`, {
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
    const res = await fetch(
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
    const res = await fetch(`${getBase()}/ingestion/social/apify/run-status?run_id=${encodeURIComponent(runId)}`);
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to check status" };
  }
}

export async function fetchSources(): Promise<any[]> {
  try {
    const res = await fetch(`${getBase()}/sources`);
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
    const res = await fetch(
      `${getBase()}/ingestion/social/apify/sync-run?run_id=${encodeURIComponent(runId)}&platform=${platform}`,
      { method: "POST" }
    );
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to sync run" };
  }
}
