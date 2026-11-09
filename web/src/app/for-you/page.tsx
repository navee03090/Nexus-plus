import React from "react";
import Link from "next/link";
import { Sparkles, Settings2, ShieldCheck } from "lucide-react";
import { OpportunityCard } from "@/components/OpportunityCard";
import { fetchRecommended } from "@/lib/api";
import { prepareListings } from "@/lib/opportunityDisplay";

export const revalidate = 0;

export default async function ForYouPage() {
  const recommendations = prepareListings(await fetchRecommended());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
      <div className="relative rounded-np-xl border border-np-border bg-np-surface p-6 sm:p-8 mb-10 shadow-np">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-np-verify/15 text-np-verify text-xs font-semibold border border-np-verify/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personalized stream</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-np-text tracking-tight">
              Tailored for your academic & career profile
            </h1>
            <p className="text-sm text-np-muted leading-relaxed">
              Matched against your major, university, and interests — across opportunities in Pakistan.
            </p>
          </div>

          <Link href="/profile" className="np-btn-secondary text-xs shrink-0">
            <Settings2 className="w-4 h-4 text-np-accent" />
            <span>Edit profile & preferences</span>
          </Link>
        </div>

        <div className="mt-6 pt-5 border-t border-np-border flex flex-wrap items-center gap-2 text-xs">
          <span className="text-np-faint font-medium">Active filters:</span>
          {["Undergraduate / BS", "Pakistan-wide", "AI & Machine Learning", "Cybersecurity", "Seed Grants & Startups"].map(
            (tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-np bg-np-accent/10 text-np-accent border border-np-accent/25 font-medium"
              >
                {tag}
              </span>
            )
          )}
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-np-text tracking-tight">
            Top recommendations ({recommendations.length})
          </h2>
          <p className="text-sm text-np-muted">Ranked with a short reason for each match</p>
        </div>
        <div className="text-xs text-np-muted flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-np-verify" />
          <span>Eligibility cues included where available</span>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-20 np-panel">
          <p className="text-sm text-np-muted">
            No personalized matches yet. Adjust your profile to see tailored events.
          </p>
        </div>
      ) : (
        <div className="np-stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recommendations.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} showMatchScore={true} />
          ))}
        </div>
      )}
    </div>
  );
}
