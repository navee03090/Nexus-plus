import React, { Suspense } from "react";
import Link from "next/link";
import { Filter } from "lucide-react";
import { OpportunityGrid } from "@/components/OpportunityGrid";
import { Pagination } from "@/components/Pagination";
import { ExploreFilters } from "@/components/ExploreFilters";
import { fetchOpportunities, fetchCategories, searchOpportunities } from "@/lib/api";
import { paginate, prepareListings } from "@/lib/opportunityDisplay";

interface OpportunitiesPageProps {
  searchParams: {
    q?: string;
    category?: string;
    city?: string;
    online?: string;
    urgency?: string;
    sort?: string;
    page?: string;
    past?: string;
  };
}

export const revalidate = 30;

const PAGE_SIZE = 12;

function buildQuery(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) qs.set(key, value);
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export default async function OpportunitiesPage({ searchParams }: OpportunitiesPageProps) {
  const {
    q = "",
    category = "",
    city = "",
    online = "",
    urgency = "",
    sort = "newest",
    page: pageRaw = "1",
  } = searchParams;

  const page = Math.max(1, parseInt(pageRaw, 10) || 1);
  const queryLower = q.trim();

  const [pool, categories] = await Promise.all([
    queryLower
      ? searchOpportunities(queryLower)
      : fetchOpportunities({
          category: category || undefined,
          city: city || undefined,
          is_online: online === "true" ? true : online === "false" ? false : undefined,
          urgency: urgency || undefined,
          sort_by: sort === "trust" ? "trust" : sort,
          limit: 50,
          includePast: true,
        }),
    fetchCategories(),
  ]);

  let filtered = pool;
  if (queryLower) {
    if (category) {
      filtered = filtered.filter(
        (o) => o.category_slug === category || o.category_name?.toLowerCase() === category.toLowerCase()
      );
    }
    if (city) filtered = filtered.filter((o) => (o.city || "").toLowerCase() === city.toLowerCase());
    if (online === "true") filtered = filtered.filter((o) => o.is_online);
    if (urgency === "urgent") {
      filtered = filtered.filter(
        (o) =>
          o.deadline_urgency === "Urgent" ||
          o.deadline_urgency === "Closing Soon" ||
          o.deadline_urgency === "urgent"
      );
    }
  }

  const prepared = prepareListings(filtered, { sort });
  const paged = paginate(prepared, page, PAGE_SIZE);
  const items = paged.items;
  const meta = paged.meta;

  const base = {
    q: q || undefined,
    category: category || undefined,
    city: city || undefined,
    online: online || undefined,
    urgency: urgency || undefined,
    sort: sort !== "newest" ? sort : undefined,
  };

  const hrefForPage = (p: number) =>
    `/opportunities${buildQuery({ ...base, page: p > 1 ? String(p) : undefined })}`;

  const rangeStart = meta.total_items === 0 ? 0 : (meta.page - 1) * PAGE_SIZE + 1;
  const rangeEnd = rangeStart === 0 ? 0 : rangeStart + items.length - 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-np-text tracking-tight">Explore opportunities</h1>
        <p className="text-sm text-np-muted mt-1">
          Verified academic, research, and career programs across Pakistan
        </p>
      </div>

      <Suspense fallback={<div className="np-panel mb-8 h-36" aria-hidden="true" />}>
        <ExploreFilters categories={categories} />
      </Suspense>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="text-sm text-np-muted">
          Showing{" "}
          <span className="text-np-text font-semibold tabular-nums">
            {rangeStart}–{rangeEnd}
          </span>{" "}
          of <span className="text-np-text font-semibold tabular-nums">{meta.total_items}</span>{" "}
          opportunities
          {q && (
            <span>
              {" "}
              matching <span className="text-np-accent font-semibold">&quot;{q}&quot;</span>
            </span>
          )}
          {meta.total_pages > 1 && (
            <span className="text-np-faint">
              {" "}
              · Page {meta.page} of {meta.total_pages}
            </span>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 np-panel">
          <div className="w-12 h-12 rounded-full bg-np-surface-2 flex items-center justify-center mx-auto mb-3 text-np-muted">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-np-text mb-1">No opportunities found</h3>
          <p className="text-sm text-np-muted max-w-sm mx-auto mb-6">
            Try adjusting your search or clearing category and location filters.
          </p>
          <Link href="/opportunities" className="np-btn-primary text-xs">
            Reset all filters
          </Link>
        </div>
      ) : (
        <>
          <OpportunityGrid items={items} />
          <Pagination page={meta.page} totalPages={meta.total_pages} hrefForPage={hrefForPage} />
        </>
      )}
    </div>
  );
}
