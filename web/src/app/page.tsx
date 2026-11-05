import React from "react";
import Link from "next/link";
import { 
  Search, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  Radio, 
  Calendar, 
  MapPin, 
  Cpu, 
  Flame, 
  CheckCircle2, 
  Bell, 
  FileCheck
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
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden border-b border-slate-800/80">
        {/* Background decorative glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[200px] bg-emerald-600/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Tagline Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Never Miss the Opportunity That Matters</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none mb-6">
            AI-Powered Opportunity <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-indigo-200 to-emerald-400">
              Intelligence for Pakistan
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Continuous discovery across university portals, government bodies, tech incubators, and research institutes in Peshawar, Khyber Pakhtunkhwa, and nationwide. Cryptographically verified with multimodal AI and strict source provenance.
          </p>

          {/* Search Bar Form */}
          <div className="max-w-2xl mx-auto mb-10">
            <form action="/opportunities" method="GET" className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                name="q"
                placeholder="Search hackathons, scholarships, grants, internships, or cities..."
                className="w-full pl-12 pr-32 py-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white placeholder:text-slate-500 text-sm sm:text-base focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xl transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm transition-colors shadow-md shadow-indigo-600/30"
              >
                Discover
              </button>
            </form>

            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-400 flex-wrap">
              <span className="text-slate-500">Popular:</span>
              <Link href="/opportunities?q=AI" className="hover:text-indigo-400 underline decoration-slate-700">AI & Cyber</Link>
              <span>•</span>
              <Link href="/opportunities?category=hackathon" className="hover:text-indigo-400 underline decoration-slate-700">KP Hackathon</Link>
              <span>•</span>
              <Link href="/opportunities?q=UET+Peshawar" className="hover:text-indigo-400 underline decoration-slate-700">UET Peshawar</Link>
              <span>•</span>
              <Link href="/opportunities?category=scholarship" className="hover:text-indigo-400 underline decoration-slate-700">HEC Scholarships</Link>
            </div>
          </div>

          {/* Quick CTA Links */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/opportunities"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold border border-slate-700 transition-colors"
            >
              <span>Browse All Directory</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/for-you"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs sm:text-sm font-semibold border border-indigo-500/40 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Personalized For You</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Live Platform Intelligence Metrics Strip */}
      <section className="bg-slate-900/60 border-b border-slate-800/80 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                {stats.sources_monitored ?? 0}+
              </div>
              <div className="text-xs text-slate-400 mt-1">Official Sources Monitored</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
                {stats.opportunities_published ?? 0}
              </div>
              <div className="text-xs text-slate-400 mt-1">Canonical Opportunities</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400 font-mono">
                {stats.duplicates_resolved ?? 0}
              </div>
              <div className="text-xs text-slate-400 mt-1">Duplicates Merged</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono">
                100%
              </div>
              <div className="text-xs text-slate-400 mt-1">Provenance Backed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Pills Bar */}
      <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Opportunity Sectors</span>
          </h2>
          <Link href="/opportunities" className="text-xs text-indigo-400 hover:text-indigo-300">
            View All →
          </Link>
        </div>
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/opportunities?category=${cat.slug}`}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80 text-xs font-medium text-slate-200 transition-all shrink-0 whitespace-nowrap"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Opportunities Section */}
      <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Latest Verified Opportunities
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Active hackathons, startup cohorts, fellowships, and academic programs across KP and Pakistan
            </p>
          </div>
          <Link
            href="/opportunities"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <span>Explore All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {opportunities.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
            <p className="text-sm text-slate-400">No active opportunities found. Ingestion in progress.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredList.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} showMatchScore={false} />
            ))}
          </div>
        )}
      </section>

      {/* Architecture & Pipeline Explanation Section */}
      <section className="py-16 bg-slate-900/40 border-t border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950 border border-indigo-800/50 text-indigo-300 text-xs font-medium mb-3">
              <Cpu className="w-3.5 h-3.5" />
              <span>Multi-Stage Intelligence Pipeline</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              How Nexus Pulse Resolves Fragmented Announcements
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Unlike ordinary listing scrapers, Nexus Pulse enforces cryptographic provenance, multimodal flyer OCR, deterministic validation, and multi-stage deduplication.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold mb-4">
                  01
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  Continuous Raw Evidence Ingestion
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pluggable adapters monitor university portals, government gazettes, RSS feeds, official social media pages, and flyers across Peshawar and Pakistan. Every byte of raw evidence is preserved.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900 text-[11px] text-slate-500 font-mono">
                Evidence: HTML, PDF, Flyers, QR Codes
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold mb-4">
                  02
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  Multimodal AI & Deterministic Validation
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Gemini multimodal vision and OCR extract structured dates, eligibility, and registration endpoints. Strict Pydantic rules reject hallucinations, impossible dates, and broken URLs.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900 text-[11px] text-slate-500 font-mono">
                Standard: Zero Hallucination Guarantee
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold mb-4">
                  03
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  4-Stage Deduplication & Change Tracking
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Multiple postings of the same event across Twitter, Facebook, and websites merge into one canonical record. When deadlines extend or venues change, notifications trigger instantly.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900 text-[11px] text-slate-500 font-mono">
                Resolution: Exact Hash + Fuzzy + Vector
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Regional Focus & Community Banner */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="relative rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/20 p-8 sm:p-12 overflow-hidden">
          <div className="max-w-2xl relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-4 border border-emerald-500/30">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Initial Focus: Khyber Pakhtunkhwa & Peshawar</span>
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-4">
              Connecting KP Youth, Researchers, & Founders to Real Opportunities
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
              We monitor UET Peshawar, KPITB, NIC Peshawar, GIKI, HEC Pakistan, FAST Peshawar, and tech boards to ensure students and professionals never miss registration windows or seed funding calls.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/alerts"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm transition-colors shadow-lg shadow-emerald-600/20"
              >
                <Bell className="w-4 h-4" />
                <span>Configure Telegram & Email Alerts</span>
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm transition-colors border border-slate-700"
              >
                <FileCheck className="w-4 h-4 text-indigo-400" />
                <span>View Verification Queue</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
