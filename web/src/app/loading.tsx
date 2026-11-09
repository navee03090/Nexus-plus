import React from "react";
import { OpportunityGridSkeleton, Skeleton } from "@/components/Skeleton";

export default function HomeLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <section className="pt-16 pb-14 md:pt-24 md:pb-20 border-b border-np-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <Skeleton className="h-4 w-28 mx-auto" />
          <Skeleton className="h-12 w-full max-w-2xl mx-auto" />
          <Skeleton className="h-12 w-full max-w-xl mx-auto" />
          <Skeleton className="h-5 w-full max-w-lg mx-auto" />
          <Skeleton className="h-14 w-full max-w-2xl mx-auto rounded-np-xl" />
          <Skeleton className="h-11 w-48 mx-auto rounded-np" />
        </div>
      </section>
      <section className="py-7 border-b border-np-border bg-np-surface/60">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 space-y-2 flex flex-col items-center">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </section>
      <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <Skeleton className="h-7 w-64 mb-8" />
        <OpportunityGridSkeleton count={3} />
      </section>
    </div>
  );
}
