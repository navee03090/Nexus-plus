import React from "react";
import Link from "next/link";
import {
  Search,
  ArrowRight,
  MapPin,
  Compass,
  ShieldCheck,
  Radio,
  Layers,
} from "lucide-react";
import { OpportunityCard } from "@/components/OpportunityCard";
import { fetchOpportunities, fetchAdminStats, fetchCategories } from "@/lib/api";

export const revalidate = 60;

export default async function HomePage() {
  const [opportunities, stats, categories] = await Promise.all([
    fetchOpportunities({ limit: 6 }),
    fetchAdminStats(),
    fetchCategories(),
  ]);

  const featuredList = opportunities.slice(0, 6);

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative pt-16 pb-14 md:pt-24 md:pb-20 overflow-hidden border-b border-np-border">
        <div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(61,139,255,0.08),_transparent_55%)]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold tracking-wide text-np-accent mb-4">
            NexusPulse
          </p>

          <h1 className="text-4xl sm:text-5xl md:text-[3.25rem] font-bold text-np-text tracking-tight max-w-3xl mx-auto leading-[1.15] mb-5">
            Find verified opportunities across Pakistan
          </h1>

          <p className="text-base sm:text-lg text-np-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Scholarships, hackathons, fellowships, incubators, and research programs —
            sourced from official portals and confirmed before they go live.
          </p>

          <div className="max-w-2xl mx-auto mb-8">
            <form action="/opportunities" method="GET" className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-np-faint pointer-events-none" />
              <input
                type="text"
                name="q"
                placeholder="Search scholarships, hackathons, grants, cities…"
                className="w-full pl-12 pr-28 py-4 rounded-np-xl bg-np-surface border border-np-border text-np-text placeholder:text-np-faint text-sm sm:text-base shadow-np focus:outline-none focus:border-np-accent focus:ring-1 focus:ring-np-accent transition-colors"
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

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/opportunities" className="np-btn-primary px-6">
              <span>Explore opportunities</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-np-surface/60 border-b border-np-border py-7">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-bold text-np-text tabular-nums">
                {stats.sources_monitored ?? 0}+
              </div>
              <div className="text-sm text-np-muted mt-1">Sources monitored</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-bold text-np-verify tabular-nums">
                {stats.opportunities_published ?? 0}
              </div>
              <div className="text-sm text-np-muted mt-1">Published opportunities</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-bold text-np-accent tabular-nums">
                {stats.duplicates_resolved ?? 0}
              </div>
              <div className="text-sm text-np-muted mt-1">Duplicates merged</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-bold text-np-online tabular-nums">100%</div>
              <div className="text-sm text-np-muted mt-1">Source-backed listings</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-lg font-bold text-np-text">Browse by category</h2>
          <Link href="/opportunities" className="text-sm text-np-accent hover:text-[#7aadff]">
            View all →
          </Link>
        </div>
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-8">
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

        {opportunities.length === 0 ? (
          <div className="text-center py-16 np-panel">
            <p className="text-sm text-np-muted">No active opportunities found yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredList.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} showMatchScore={false} />
            ))}
          </div>
        )}
      </section>

      <section className="py-14 bg-np-surface/40 border-t border-b border-np-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-np-text tracking-tight">
              How NexusPulse keeps listings trustworthy
            </h2>
            <p className="text-sm text-np-muted mt-2">
              We collect announcements from official channels, structure the details, and publish
              only after verification — with a link back to the original source.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 np-panel flex flex-col">
              <div className="w-10 h-10 rounded-np bg-np-accent/10 text-np-accent border border-np-accent/20 flex items-center justify-center mb-4">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-np-text mb-2">Discover from official sources</h3>
              <p className="text-sm text-np-muted leading-relaxed">
                University portals, government boards, incubators, and research institutes across Pakistan.
              </p>
            </div>
            <div className="p-6 np-panel flex flex-col">
              <div className="w-10 h-10 rounded-np bg-np-verify/10 text-np-verify border border-np-verify/20 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-np-text mb-2">Verify before publishing</h3>
              <p className="text-sm text-np-muted leading-relaxed">
                Deadlines, eligibility, and apply links are checked so incomplete or invented details stay out.
              </p>
            </div>
            <div className="p-6 np-panel flex flex-col">
              <div className="w-10 h-10 rounded-np bg-np-online/10 text-np-online border border-np-online/20 flex items-center justify-center mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-np-text mb-2">Merge duplicates, track changes</h3>
              <p className="text-sm text-np-muted leading-relaxed">
                Multiple posts of the same event become one listing. Deadline extensions update the record.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="relative rounded-np-xl border border-np-border bg-np-surface p-8 sm:p-10 overflow-hidden shadow-np">
          <div className="max-w-2xl relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-np-verify/15 text-np-verify text-xs font-semibold mb-4 border border-np-verify/30">
              <MapPin className="w-3.5 h-3.5" />
              <span>Nationwide coverage</span>
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-np-text tracking-tight mb-3">
              Opportunities from major hubs across Pakistan
            </h3>
            <p className="text-sm text-np-muted mb-6 leading-relaxed">
              Browse programs in Islamabad, Lahore, Karachi, Peshawar, Quetta, Multan, Faisalabad,
              and online — including HEC, NIC networks, universities, and tech boards.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {["Islamabad", "Lahore", "Karachi", "Peshawar", "Online"].map((city) => (
                <Link
                  key={city}
                  href={
                    city === "Online"
                      ? "/opportunities?online=true"
                      : `/opportunities?city=${encodeURIComponent(city)}`
                  }
                  className="np-chip"
                >
                  {city}
                </Link>
              ))}
            </div>
            <Link href="/opportunities" className="np-btn-primary">
              <Compass className="w-4 h-4" />
              <span>Browse opportunities</span>
            </Link>
          </div>
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
