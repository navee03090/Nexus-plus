import React from "react";
import { HomeChrome, LivePill, MapFrame, StatsPlaceholder } from "@/components/HomeChrome";

export default function HomeLoading() {
  return (
    <HomeChrome
      pill={<LivePill />}
      map={<MapFrame />}
      stats={<StatsPlaceholder />}
      categories={<div className="h-9" />}
      listings={
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-np-lg border border-white/[0.07] bg-np-surface">
              <div className="h-28 border-b border-white/[0.07] bg-np-surface-2" />
              <div className="space-y-3 p-5">
                <div className="h-3 w-24 rounded-full bg-np-surface-2" />
                <div className="h-4 w-full rounded bg-np-surface-2" />
                <div className="h-4 w-2/3 rounded bg-np-surface-2" />
              </div>
            </div>
          ))}
        </div>
      }
    />
  );
}
