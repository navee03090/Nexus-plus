import React from "react";
import Link from "next/link";
import { Sparkles, User, Settings2, Sliders, ShieldCheck } from "lucide-react";
import { OpportunityCard } from "@/components/OpportunityCard";
import { fetchRecommended } from "@/lib/api";

export const revalidate = 0; // Dynamic personal feed

export default async function ForYouPage() {
  const recommendations = await fetchRecommended();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
      {/* Profile Header & Personalization Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/20 p-6 sm:p-8 mb-10 overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Personalized Opportunity Stream</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Tailored For Your Academic & Career Profile
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Matched against your major (Computer Systems Engineering), university (UET Peshawar), and interests in AI, Cybersecurity, and DeepTech incubation.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
            >
              <Settings2 className="w-4 h-4 text-indigo-400" />
              <span>Edit Profile & Preferences</span>
            </Link>
          </div>
        </div>

        {/* User Active Filter Tags */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Active Match Filters:</span>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 font-medium">
            🎓 Undergraduate / BS
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 font-medium">
            📍 Peshawar & Khyber Pakhtunkhwa
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 font-medium">
            💡 AI & Machine Learning
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 font-medium">
            🛡️ Cybersecurity
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 font-medium">
            🚀 Seed Grants & Startups
          </span>
        </div>
      </div>

      {/* Recommended Opportunities List */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Top Recommendations ({recommendations.length})
          </h2>
          <p className="text-xs text-slate-400">
            Ranked with explainable transparency ("Why this matches you")
          </p>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>All eligibility criteria pre-screened</span>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800">
          <p className="text-sm text-slate-400">No personalized matches yet. Adjust your profile to see tailored events.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} showMatchScore={true} />
          ))}
        </div>
      )}
    </div>
  );
}
