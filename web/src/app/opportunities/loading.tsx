import React from "react";
import { OpportunityGridSkeleton, Skeleton } from "@/components/Skeleton";

export default function OpportunitiesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="np-panel p-4 sm:p-5 mb-8 space-y-4">
        <Skeleton className="h-11 w-full rounded-np" />
        <div className="flex flex-wrap gap-2 pt-2 border-t border-np-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-np" />
          ))}
        </div>
      </div>
      <div className="flex justify-between mb-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-40" />
      </div>
      <OpportunityGridSkeleton count={6} />
    </div>
  );
}
