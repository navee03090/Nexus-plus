import React from "react";
import Link from "next/link";
import { Bookmark, Compass, Sparkles, Clock } from "lucide-react";
import { OpportunityCard } from "@/components/OpportunityCard";
import { fetchSavedOpportunities } from "@/lib/api";

export const revalidate = 0;

export default async function SavedPage() {
  const savedList = await fetchSavedOpportunities();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 flex flex-col">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 text-xs text-indigo-400 font-semibold mb-2">
          <Bookmark className="w-4 h-4 fill-indigo-400" />
          <span>Personal Bookmarks</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Saved Opportunities ({savedList.length})
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Keep track of important deadlines, hackathon registrations, and grants.
        </p>
      </div>

      {savedList.length === 0 ? (
        <div className="text-center py-24 bg-slate-900/40 rounded-3xl border border-slate-800 my-auto">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Saved Opportunities Yet</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-6">
            Bookmark hackathons, scholarships, and startup calls you plan to apply for to track upcoming deadline reminders.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/opportunities"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Opportunities</span>
            </Link>
            <Link
              href="/for-you"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>View Recommendations</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedList.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} showMatchScore={false} />
          ))}
        </div>
      )}
    </div>
  );
}
