import React from "react";
import Link from "next/link";
import { Search, Filter, SlidersHorizontal, MapPin, Sparkles, X } from "lucide-react";
import { OpportunityCard } from "@/components/OpportunityCard";
import { fetchOpportunities, fetchCategories } from "@/lib/api";

interface OpportunitiesPageProps {
  searchParams: {
    q?: string;
    category?: string;
    city?: string;
    online?: string;
    urgency?: string;
    sort?: string;
  };
}

export const revalidate = 30;

export default async function OpportunitiesPage({ searchParams }: OpportunitiesPageProps) {
  const { q = "", category = "", city = "", online = "", urgency = "", sort = "newest" } = searchParams;

  const [allOpportunities, categories] = await Promise.all([
    fetchOpportunities({
      category: category || undefined,
      city: city || undefined,
      is_online: online === "true" ? true : online === "false" ? false : undefined,
      urgency: urgency || undefined,
      limit: 50,
    }),
    fetchCategories(),
  ]);

  // Client-side text search filter on fetched opportunities if q provided
  const queryLower = q.trim().toLowerCase();
  const filtered = queryLower
    ? allOpportunities.filter(
        (o) =>
          o.title.toLowerCase().includes(queryLower) ||
          o.summary.toLowerCase().includes(queryLower) ||
          o.city.toLowerCase().includes(queryLower) ||
          (o.organization_name && o.organization_name.toLowerCase().includes(queryLower)) ||
          o.tags.some((t) => t.toLowerCase().includes(queryLower))
      )
    : allOpportunities;

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "trust") {
      return (b.trust_score || 0) - (a.trust_score || 0);
    }
    if (sort === "deadline") {
      const hasA = !!a.registration_deadline;
      const hasB = !!b.registration_deadline;
      if (hasA && hasB) {
        return new Date(a.registration_deadline!).getTime() - new Date(b.registration_deadline!).getTime();
      }
      if (hasA && !hasB) return -1;
      if (!hasA && hasB) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    // Default: newest first (so newly approved opportunities appear instantly on top)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const activeFiltersCount = [category, city, online, urgency].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 flex flex-col">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Explore Opportunities
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Verified academic, research, hackathon, and innovation programs across Peshawar, KPK, and Pakistan
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-8 backdrop-blur-sm space-y-4">
        {/* Top search form */}
        <form method="GET" action="/opportunities" className="relative flex items-center">
          <Search className="absolute left-4 w-4 h-4 text-slate-400" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by keywords, tags, organizer, or field of study..."
            className="w-full pl-11 pr-24 py-3 rounded-xl bg-slate-950 border border-slate-700/80 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {category && <input type="hidden" name="category" value={category} />}
          {city && <input type="hidden" name="city" value={city} />}
          {online && <input type="hidden" name="online" value={online} />}
          {urgency && <input type="hidden" name="urgency" value={urgency} />}
          <button
            type="submit"
            className="absolute right-2 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filter Pills row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
          {/* Categories */}
          <Link
            href={`/opportunities${q ? `?q=${encodeURIComponent(q)}` : ""}`}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              !category ? "bg-indigo-600 text-white" : "bg-slate-950 text-slate-300 hover:bg-slate-800"
            }`}
          >
            All Categories
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/opportunities?category=${cat.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}${city ? `&city=${city}` : ""}`}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                category === cat.slug ? "bg-indigo-600 text-white" : "bg-slate-950 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Quick Filter Row: Cities, Online, Urgency */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">City:</span>
            {["Peshawar", "Islamabad", "Lahore"].map((cityName) => (
              <Link
                key={cityName}
                href={`/opportunities?city=${cityName}${category ? `&category=${category}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`px-2.5 py-1 rounded-md ${
                  city.toLowerCase() === cityName.toLowerCase()
                    ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/50"
                    : "bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                {cityName}
              </Link>
            ))}

            <span className="text-slate-600 mx-1">|</span>

            <Link
              href={`/opportunities?online=true${category ? `&category=${category}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`px-2.5 py-1 rounded-md ${
                online === "true"
                  ? "bg-cyan-600/30 text-cyan-300 border border-cyan-500/50"
                  : "bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              Online Only
            </Link>

            <Link
              href={`/opportunities?urgency=urgent${category ? `&category=${category}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`px-2.5 py-1 rounded-md ${
                urgency === "urgent"
                  ? "bg-rose-600/30 text-rose-300 border border-rose-500/50"
                  : "bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              Closing Soon
            </Link>
          </div>

          {/* Reset Filters */}
          {activeFiltersCount > 0 && (
            <Link
              href="/opportunities"
              className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear filters ({activeFiltersCount})</span>
            </Link>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-xs text-slate-400 font-medium">
          Showing <span className="text-white font-semibold">{sorted.length}</span> verified opportunities
          {q && (
            <span>
              {" "}
              matching <span className="text-indigo-400 font-semibold">"{q}"</span>
            </span>
          )}
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Sort by:</span>
          <Link
            href={`/opportunities?sort=deadline${category ? `&category=${category}` : ""}${city ? `&city=${city}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`hover:text-white ${sort === "deadline" ? "text-indigo-400 font-semibold" : "text-slate-400"}`}
          >
            Deadline
          </Link>
          <span className="text-slate-600">•</span>
          <Link
            href={`/opportunities?sort=newest${category ? `&category=${category}` : ""}${city ? `&city=${city}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`hover:text-white ${sort === "newest" ? "text-indigo-400 font-semibold" : "text-slate-400"}`}
          >
            Newest
          </Link>
          <span className="text-slate-600">•</span>
          <Link
            href={`/opportunities?sort=trust${category ? `&category=${category}` : ""}${city ? `&city=${city}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`hover:text-white ${sort === "trust" ? "text-indigo-400 font-semibold" : "text-slate-400"}`}
          >
            Trust Score
          </Link>
        </div>
      </div>

      {/* Grid of Opportunities */}
      {sorted.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">No opportunities found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            Try adjusting your query or resetting category and location filters to discover active opportunities.
          </p>
          <Link
            href="/opportunities"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
          >
            Reset All Filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} showMatchScore={false} />
          ))}
        </div>
      )}
    </div>
  );
}
