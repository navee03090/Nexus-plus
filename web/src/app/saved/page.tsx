import React from "react";
import Link from "next/link";
import { Bookmark, Compass, Sparkles } from "lucide-react";
import { OpportunityGrid } from "@/components/OpportunityGrid";
import { fetchSavedOpportunities } from "@/lib/api";
import { prepareListings } from "@/lib/opportunityDisplay";

export const revalidate = 0;

export default async function SavedPage() {
  const savedList = prepareListings(await fetchSavedOpportunities(), { showPast: true });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 flex flex-col">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 text-xs text-np-accent font-semibold mb-2">
          <Bookmark className="w-4 h-4 fill-np-accent" />
          <span>Personal bookmarks</span>
        </div>
        <h1 className="text-3xl font-bold text-np-text tracking-tight">
          Saved opportunities ({savedList.length})
        </h1>
        <p className="text-sm text-np-muted mt-1">
          Keep track of deadlines, hackathon registrations, and grants across Pakistan.
        </p>
      </div>

      {savedList.length === 0 ? (
        <div className="text-center py-24 np-panel my-auto">
          <div className="w-16 h-16 rounded-np-lg bg-np-accent/10 border border-np-accent/20 text-np-accent flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-np-text mb-2">No saved opportunities yet</h3>
          <p className="text-sm text-np-muted max-w-md mx-auto mb-6">
            Bookmark programs you plan to apply for so you can track upcoming deadlines.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/opportunities" className="np-btn-primary text-xs">
              <Compass className="w-4 h-4" />
              <span>Explore opportunities</span>
            </Link>
            <Link href="/for-you" className="np-btn-secondary text-xs">
              <Sparkles className="w-4 h-4 text-np-accent" />
              <span>View recommendations</span>
            </Link>
          </div>
        </div>
      ) : (
        <OpportunityGrid items={savedList} />
      )}
    </div>
  );
}
