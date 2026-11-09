import React from "react";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { OpportunityCard } from "@/components/OpportunityCard";
import { StatsCounters } from "@/components/StatsCounters";
import { TrustPipeline } from "@/components/TrustPipeline";
import { fetchOpportunities, fetchAdminStats, fetchCategories } from "@/lib/api";
import { closesWithinDays, prepareListings } from "@/lib/opportunityDisplay";

export const revalidate = 60;

export default async function HomePage() {
  const [opportunities, stats, categories] = await Promise.all([
    fetchOpportunities({ limit: 50 }),
    fetchAdminStats(),
    fetchCategories(),
  ]);

  const liveListings = prepareListings(opportunities);
  const featuredList = liveListings.slice(0, 6);
  const closingThisWeek = liveListings.filter((item) => closesWithinDays(item, 7)).length;
  const statItems = [
    { value: stats.sources_monitored ?? 0, label: "Sources monitored", colorClass: "text-np-accent" },
    { value: liveListings.length, label: "Live opportunities", colorClass: "text-np-accent" },
    { value: closingThisWeek, label: "Closing this week", colorClass: "text-np-accent" },
    {
      value: stats.organizations_listed ?? stats.source_links ?? 0,
      label: "Organizations listed",
      colorClass: "text-np-accent",
    },
  ];
  if ((stats.duplicates_resolved ?? 0) > 0) {
    statItems.splice(2, 0, {
      value: stats.duplicates_resolved ?? 0,
      label: "Duplicates merged",
      colorClass: "text-np-accent",
    });
  }

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative overflow-hidden border-b border-white/[0.07] pt-16 pb-14 md:pt-24 md:pb-20">
        <div className="np-grain pointer-events-none absolute inset-0 -z-10 opacity-[0.07]" aria-hidden="true" />

        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="np-fade-up mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-np-surface px-3 py-1 text-xs font-medium text-np-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-np-accent" aria-hidden="true" />
            <span className="tabular-nums">{liveListings.length} live opportunities</span>
            <span className="text-np-faint">·</span>
            <span>updated today</span>
          </p>

          <h1 className="np-fade-up np-delay-1 mx-auto mb-5 max-w-3xl text-4xl font-bold leading-[1.15] tracking-tight text-np-text sm:text-5xl md:text-[3.25rem]">
            Find <span className="font-serif text-[1.05em] font-normal italic text-np-accent">verified</span> opportunities across Pakistan
          </h1>

          <p className="np-fade-up np-delay-2 text-base sm:text-lg text-np-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Scholarships, hackathons, fellowships, incubators, and research programs —
            sourced from official portals and confirmed before they go live.
          </p>

          <div className="np-fade-up np-delay-3 max-w-2xl mx-auto mb-8">
            <form action="/opportunities" method="GET" className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-np-faint pointer-events-none" />
              <input
                type="text"
                name="q"
                placeholder="Search scholarships, hackathons, grants, cities…"
                className="w-full rounded-np-xl border border-white/[0.08] bg-np-surface py-4 pl-12 pr-28 text-sm text-np-text placeholder:text-np-faint transition-colors focus:border-np-accent focus:outline-none focus:ring-1 focus:ring-np-accent sm:text-base"
              />
              <button type="submit" className="absolute right-2 np-btn-primary py-2.5 px-4 text-sm">
                Search
              </button>
            </form>

            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-np-muted flex-wrap">
              <span className="text-np-faint">Popular:</span>
              <Link href="/opportunities?category=scholarship" className="hover:text-np-accent underline decoration-np-border">
                HEC Scholarships
              </Link>
              <span className="text-np-border-strong">·</span>
              <Link href="/opportunities?category=hackathon" className="hover:text-np-accent underline decoration-np-border">
                Hackathons
              </Link>
              <span className="text-np-border-strong">·</span>
              <Link href="/opportunities?city=Karachi" className="hover:text-np-accent underline decoration-np-border">
                Karachi
              </Link>
              <span className="text-np-border-strong">·</span>
              <Link href="/opportunities?q=internship" className="hover:text-np-accent underline decoration-np-border">
                Internships
              </Link>
            </div>
          </div>

          <div className="np-fade-up np-delay-4 flex flex-wrap items-center justify-center gap-3">
            <Link href="/opportunities" className="np-btn-primary px-6">
              <span>Explore opportunities</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-white/[0.07] bg-np-surface py-7">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <StatsCounters items={statItems} />
        </div>
      </section>

      <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-lg font-bold text-np-text">Browse by category</h2>
          <Link href="/opportunities" className="text-sm text-np-accent hover:text-[#7aadff]">
            View all →
          </Link>
        </div>
        <div className="np-stagger flex items-center gap-2.5 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/opportunities?category=${cat.slug}`}
              className="np-chip shrink-0 whitespace-nowrap"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <div className="np-fade-up flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-np-text tracking-tight">
              Latest verified opportunities
            </h2>
            <p className="text-sm text-np-muted mt-1">
              Active programs for students, researchers, and founders across Pakistan
            </p>
          </div>
          <Link
            href="/opportunities"
            className="flex items-center gap-1.5 text-sm font-semibold text-np-accent hover:text-[#7aadff] transition-colors"
          >
            <span>Explore all</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {featuredList.length === 0 ? (
          <div className="text-center py-16 np-panel">
            <p className="text-sm text-np-muted">No active opportunities found yet. Check back soon.</p>
          </div>
        ) : (
          <div className="np-stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredList.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} showMatchScore={false} />
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-white/[0.07] bg-np-bg py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-np-text sm:text-3xl">
              How listings stay trustworthy
            </h2>
            <p className="mt-2 text-sm text-np-muted">
              Official channels in, one record out, with a link back to the source.
            </p>
          </div>
          <TrustPipeline />
        </div>
      </section>

      <section className="pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-np-faint">
            Every opportunity links back to its original source.
          </p>
        </div>
      </section>
    </div>
  );
}
