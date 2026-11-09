import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-np border border-white/[0.06] bg-np-surface-2",
        className
      )}
      aria-hidden="true"
    >
      <span className="absolute inset-0 -translate-x-full animate-np-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

export function OpportunityCardSkeleton() {
  return (
    <div className="rounded-np-lg border border-np-border bg-np-surface overflow-hidden">
      <div className="absolute" />
      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="pt-4 mt-2 border-t border-np-border flex justify-between">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
}

export function OpportunityGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" role="status" aria-label="Loading opportunities">
      {Array.from({ length: count }).map((_, i) => (
        <OpportunityCardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading opportunities…</span>
    </div>
  );
}

export function OpportunityDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full" role="status" aria-label="Loading opportunity">
      <Skeleton className="h-4 w-40 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 sm:p-8 np-panel space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-8 w-full max-w-xl" />
            <Skeleton className="h-8 w-full max-w-md" />
            <div className="flex items-center gap-3 pt-2">
              <Skeleton className="h-9 w-9 rounded-np" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </div>
          <div className="p-6 sm:p-8 np-panel space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="np-panel p-6 space-y-4 h-fit">
          <Skeleton className="h-12 w-full rounded-np" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <span className="sr-only">Loading opportunity details…</span>
    </div>
  );
}
