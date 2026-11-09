import React from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { HeroHeadline } from "@/components/HeroHeadline";
import { TrustPipeline } from "@/components/TrustPipeline";

export function LivePill({ count }: { count?: number | null }) {
  return (
    <p className="np-fade-up mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-np-surface px-3 py-1 text-xs font-medium text-np-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-np-accent" aria-hidden="true" />
      <span className="tabular-nums">
        {typeof count === "number" ? `${count} live opportunities` : "Live opportunities"}
      </span>
      <span className="text-np-faint">·</span>
      <span>updated today</span>
    </p>
  );
}

export function MapFrame() {
  return (
    <div
      className="mx-auto h-[420px] w-full max-w-md rounded-np-lg border border-white/[0.07] bg-np-surface"
      aria-hidden="true"
    />
  );
}

const STAT_LABELS = [
  "Sources monitored",
  "Live opportunities",
  "Closing this week",
  "Organizations listed",
];

export function StatsPlaceholder() {
  return (
    <div className="grid grid-cols-2 gap-4 text-center sm:gap-6 md:grid-cols-4">
      {STAT_LABELS.map((label) => (
        <div key={label} className="p-3">
          <div className="text-2xl font-bold tabular-nums text-np-accent sm:text-3xl">—</div>
          <div className="mt-1 text-sm text-np-muted">{label}</div>
        </div>
      ))}
    </div>
  );
}

export function HomeChrome({
  pill,
  map,
  stats,
  closing,
  categories,
  listings,
}: {
  pill: React.ReactNode;
  map: React.ReactNode;
  stats: React.ReactNode;
  closing?: React.ReactNode;
  categories?: React.ReactNode;
  listings?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <section className="relative overflow-hidden border-b border-white/[0.07] pb-14 pt-16 md:pb-20 md:pt-24">
        <div className="np-grain pointer-events-none absolute inset-0 -z-10 opacity-[0.07]" aria-hidden="true" />
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(260px,0.9fr)] lg:gap-6 lg:px-8">
          <div className="text-center lg:text-left">
            {pill}
            <HeroHeadline />
            <p className="np-fade-up np-delay-2 mx-auto mb-10 max-w-2xl text-base leading-relaxed text-np-muted sm:text-lg lg:mx-0">
              Scholarships, hackathons, fellowships, incubators, and research programs — sourced from
              official portals and confirmed before they go live.
            </p>
            <div className="np-fade-up np-delay-3 mx-auto mb-8 max-w-2xl lg:mx-0">
              <form action="/opportunities" method="GET" className="relative flex items-center">
                <Search className="pointer-events-none absolute left-4 h-5 w-5 text-np-faint" />
                <input
                  type="text"
                  name="q"
                  placeholder="Search scholarships, hackathons, grants, cities…"
                  className="w-full rounded-np-xl border border-white/[0.08] bg-np-surface py-4 pl-12 pr-28 text-sm text-np-text placeholder:text-np-faint transition-colors focus:border-np-accent focus:outline-none focus:ring-1 focus:ring-np-accent sm:text-base"
                />
                <button type="submit" className="np-btn-primary absolute right-2 px-4 py-2.5 text-sm">
                  Search
                </button>
              </form>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-np-muted lg:justify-start">
                <span className="text-np-faint">Popular:</span>
                <Link href="/opportunities?category=scholarship" className="underline decoration-np-border hover:text-np-accent">
                  HEC Scholarships
                </Link>
                <span className="text-np-border-strong">·</span>
                <Link href="/opportunities?category=hackathon" className="underline decoration-np-border hover:text-np-accent">
                  Hackathons
                </Link>
                <span className="text-np-border-strong">·</span>
                <Link href="/opportunities?city=Karachi" className="underline decoration-np-border hover:text-np-accent">
                  Karachi
                </Link>
                <span className="text-np-border-strong">·</span>
                <Link href="/opportunities?q=internship" className="underline decoration-np-border hover:text-np-accent">
                  Internships
                </Link>
              </div>
            </div>
            <div className="np-fade-up np-delay-4 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link href="/opportunities" className="np-btn-primary px-6">
                <span>Explore opportunities</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          {map}
        </div>
      </section>

      <section className="border-b border-white/[0.07] bg-np-surface py-7">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{stats}</div>
      </section>

      {closing}

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-np-text">Browse by category</h2>
          <Link href="/opportunities" className="text-sm text-np-accent hover:text-[#7aadff]">
            View all →
          </Link>
        </div>
        {categories}
      </section>

      <section className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-np-text sm:text-2xl">Latest verified opportunities</h2>
            <p className="mt-1 text-sm text-np-muted">
              Active programs for students, researchers, and founders across Pakistan
            </p>
          </div>
          <Link href="/opportunities" className="flex items-center gap-1.5 text-sm font-semibold text-np-accent hover:text-[#7aadff]">
            <span>Explore all</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {listings}
      </section>

      <section className="border-y border-white/[0.07] bg-np-bg py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-np-text sm:text-3xl">How listings stay trustworthy</h2>
            <p className="mt-2 text-sm text-np-muted">Official channels in, one record out, with a link back to the source.</p>
          </div>
          <TrustPipeline />
        </div>
      </section>

      <section className="pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-np-faint">Every opportunity links back to its original source.</p>
        </div>
      </section>
    </div>
  );
}
