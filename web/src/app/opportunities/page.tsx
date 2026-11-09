import React from "react";
import Link from "next/link";
import { Search, Filter, X } from "lucide-react";
import { OpportunityCard } from "@/components/OpportunityCard";
import { Pagination } from "@/components/Pagination";
import { fetchOpportunitiesPage, fetchCategories, searchOpportunities } from "@/lib/api";

interface OpportunitiesPageProps {
  searchParams: {
    q?: string;
    category?: string;
    city?: string;
    online?: string;
    urgency?: string;
    sort?: string;
    page?: string;
  };
}

export const revalidate = 30;

const PAGE_SIZE = 12;

const CITIES = [
  "Islamabad",
  "Lahore",
  "Karachi",
  "Peshawar",
  "Quetta",
  "Multan",
  "Faisalabad",
];

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
  const queryLower = q.trim().toLowerCase();

  const categoriesPromise = fetchCategories();

  let items;
  let meta;
  let categories;

  if (queryLower) {
    const [searched, cats] = await Promise.all([
      searchOpportunities(q.trim()),
      categoriesPromise,
    ]);
    categories = cats;

    let filtered = searched;
    if (category) {
      filtered = filtered.filter(
        (o) => o.category_slug === category || o.category_name?.toLowerCase() === category.toLowerCase()
      );
    }
    if (city) {
      filtered = filtered.filter((o) => (o.city || "").toLowerCase() === city.toLowerCase());
    }
    if (online === "true") {
      filtered = filtered.filter((o) => o.is_online);
    }
    if (urgency === "urgent") {
      filtered = filtered.filter(
        (o) =>
          o.deadline_urgency === "Urgent" ||
          o.deadline_urgency === "Closing Soon" ||
          o.deadline_urgency === "urgent"
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sort === "trust") return (b.trust_score || 0) - (a.trust_score || 0);
      if (sort === "deadline") {
        const hasA = !!a.registration_deadline;
        const hasB = !!b.registration_deadline;
        if (hasA && hasB) {
          return (
            new Date(a.registration_deadline!).getTime() -
            new Date(b.registration_deadline!).getTime()
          );
        }
        if (hasA && !hasB) return -1;
        if (!hasA && hasB) return 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const totalItems = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    items = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    meta = {
      page: safePage,
      page_size: PAGE_SIZE,
      total_items: totalItems,
      total_pages: totalPages,
    };
  } else {
    const [result, cats] = await Promise.all([
      fetchOpportunitiesPage({
        category: category || undefined,
        city: city || undefined,
        is_online: online === "true" ? true : online === "false" ? false : undefined,
        urgency: urgency || undefined,
        sort_by: sort === "trust" ? "trust" : sort,
        limit: PAGE_SIZE,
        page,
      }),
      categoriesPromise,
    ]);
    categories = cats;
    items = result.items;
    meta = result.meta;
  }

  const activeFiltersCount = [category, city, online, urgency].filter(Boolean).length;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-np-text tracking-tight">Explore opportunities</h1>
        <p className="text-sm text-np-muted mt-1">
          Verified academic, research, and career programs across Pakistan
        </p>
      </div>

      <div className="np-panel p-4 sm:p-5 mb-8 space-y-4">
        <form method="GET" action="/opportunities" className="relative flex items-center">
          <Search className="absolute left-4 w-4 h-4 text-np-faint" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by keyword, organizer, city, or field…"
            className="np-input pl-11 pr-24"
          />
          {category && <input type="hidden" name="category" value={category} />}
          {city && <input type="hidden" name="city" value={city} />}
          {online && <input type="hidden" name="online" value={online} />}
          {urgency && <input type="hidden" name="urgency" value={urgency} />}
          {sort && sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
          <button type="submit" className="absolute right-2 np-btn-primary py-1.5 px-4 text-xs">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-np-border text-xs">
          <Link
            href={`/opportunities${buildQuery({ q: q || undefined, city: city || undefined, online: online || undefined, urgency: urgency || undefined, sort: base.sort })}`}
            className={`px-3 py-1.5 rounded-np font-medium transition-colors ${
              !category ? "np-chip-active border" : "np-chip"
            }`}
          >
            All categories
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/opportunities${buildQuery({ ...base, category: cat.slug, page: undefined })}`}
              className={`px-3 py-1.5 rounded-np font-medium transition-colors ${
                category === cat.slug ? "np-chip-active border" : "np-chip"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-np-faint">Location:</span>
            {CITIES.map((cityName) => (
              <Link
                key={cityName}
                href={`/opportunities${buildQuery({
                  ...base,
                  city: cityName,
                  online: undefined,
                  page: undefined,
                })}`}
                className={`px-2.5 py-1 rounded-md border ${
                  city.toLowerCase() === cityName.toLowerCase()
                    ? "bg-np-verify/15 text-np-verify border-np-verify/40"
                    : "bg-np-surface-2 text-np-muted border-np-border hover:text-np-text"
                }`}
              >
                {cityName}
              </Link>
            ))}

            <span className="text-np-border-strong mx-1">|</span>

            <Link
              href={`/opportunities${buildQuery({
                ...base,
                city: undefined,
                online: "true",
                page: undefined,
              })}`}
              className={`px-2.5 py-1 rounded-md border ${
                online === "true"
                  ? "bg-np-online/15 text-np-online border-np-online/40"
                  : "bg-np-surface-2 text-np-muted border-np-border hover:text-np-text"
              }`}
            >
              Online only
            </Link>

            <Link
              href={`/opportunities${buildQuery({
                ...base,
                urgency: "urgent",
                page: undefined,
              })}`}
              className={`px-2.5 py-1 rounded-md border ${
                urgency === "urgent"
                  ? "bg-np-danger/15 text-np-danger border-np-danger/40"
                  : "bg-np-surface-2 text-np-muted border-np-border hover:text-np-text"
              }`}
            >
              Closing soon
            </Link>
          </div>

          {activeFiltersCount > 0 && (
            <Link
              href="/opportunities"
              className="flex items-center gap-1 text-np-muted hover:text-np-danger transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear filters ({activeFiltersCount})</span>
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="text-sm text-np-muted">
          Showing <span className="text-np-text font-semibold">{items.length}</span>
          {meta.total_items > 0 && (
            <>
              {" "}
              of <span className="text-np-text font-semibold">{meta.total_items}</span>
            </>
          )}{" "}
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

        <div className="flex items-center gap-1 text-sm flex-wrap">
          <span className="text-np-faint mr-1">Sort:</span>
          {[
            { id: "deadline", label: "Deadline" },
            { id: "newest", label: "Newest" },
            { id: "trust", label: "Trust" },
          ].map((opt) => (
            <Link
              key={opt.id}
              href={`/opportunities${buildQuery({
                q: q || undefined,
                category: category || undefined,
                city: city || undefined,
                online: online || undefined,
                urgency: urgency || undefined,
                sort: opt.id,
              })}`}
              className={`px-2.5 py-1 rounded-md border ${
                sort === opt.id
                  ? "border-np-accent/40 bg-np-accent/15 text-np-accent font-semibold"
                  : "border-transparent text-np-muted hover:text-np-text"
              }`}
            >
              {opt.label}
            </Link>
          ))}
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
          <div className="np-stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} showMatchScore={false} />
            ))}
          </div>
          <Pagination page={meta.page} totalPages={meta.total_pages} hrefForPage={hrefForPage} />
        </>
      )}
    </div>
  );
}
