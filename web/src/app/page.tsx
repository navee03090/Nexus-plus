import React, { Suspense, cache } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { OpportunityGrid } from "@/components/OpportunityGrid";
import { StatsCounters } from "@/components/StatsCounters";
import { ClosingSoonRail } from "@/components/ClosingSoonRail";
import { HomeChrome, LivePill, MapFrame, StatsPlaceholder } from "@/components/HomeChrome";
import { fetchOpportunities, fetchAdminStats, fetchCategories } from "@/lib/api";
import { closesWithinDays, prepareListings } from "@/lib/opportunityDisplay";
import { MAP_CITIES } from "@/lib/mapCities";

const PakistanMap = dynamic(
  () => import("@/components/PakistanMap").then((mod) => mod.PakistanMap),
  { ssr: false, loading: () => <MapFrame /> }
);

export const revalidate = 60;

const loadHome = cache(async () => {
  const [opportunities, stats, categories] = await Promise.all([
    fetchOpportunities({ limit: 50 }),
    fetchAdminStats(),
    fetchCategories(),
  ]);

  const liveListings = prepareListings(opportunities);
  const closingSoon = liveListings
    .filter((item) => closesWithinDays(item, 7))
    .sort(
      (a, b) =>
        new Date(a.registration_deadline || 0).getTime() - new Date(b.registration_deadline || 0).getTime()
    );
  const statItems = [
    { value: stats.sources_monitored ?? 0, label: "Sources monitored", colorClass: "text-np-accent" },
    { value: liveListings.length, label: "Live opportunities", colorClass: "text-np-accent" },
    { value: closingSoon.length, label: "Closing this week", colorClass: "text-np-accent" },
    {
      value: stats.organizations_listed ?? stats.source_links ?? 0,
      label: "Organizations listed",
      colorClass: "text-np-accent",
    },
  ];
  if ((stats.duplicates_resolved ?? 0) > 0) {
    statItems.splice(2, 0, {
      value: stats.duplicates_resolved ?? 0,
      label: "Duplicates merged",
      colorClass: "text-np-accent",
    });
  }

  const cityCounts = Object.fromEntries(MAP_CITIES.map((city) => [city.name, 0])) as Record<string, number>;
  for (const item of liveListings) {
    const city = (item.city || "").trim().toLowerCase();
    const match = MAP_CITIES.find((entry) => entry.name.toLowerCase() === city);
    if (match) cityCounts[match.name] += 1;
  }

  return {
    liveCount: liveListings.length,
    featured: liveListings.slice(0, 6),
    closingSoon: closingSoon.slice(0, 8),
    statItems,
    cityCounts,
    categories,
  };
});

async function LiveCount() {
  const { liveCount } = await loadHome();
  return <LivePill count={liveCount} />;
}

async function HomeMap() {
  const { cityCounts } = await loadHome();
  return <PakistanMap counts={cityCounts} />;
}

async function HomeStats() {
  const { statItems } = await loadHome();
  return <StatsCounters items={statItems} />;
}

async function HomeClosing() {
  const { closingSoon } = await loadHome();
  return <ClosingSoonRail items={closingSoon} />;
}

async function HomeCategories() {
  const { categories } = await loadHome();
  return (
    <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
      {categories.map((cat) => (
        <Link key={cat.id} href={`/opportunities?category=${cat.slug}`} className="np-chip shrink-0 whitespace-nowrap">
          {cat.name}
        </Link>
      ))}
    </div>
  );
}

async function HomeListings() {
  const { featured } = await loadHome();
  if (featured.length === 0) {
    return (
      <div className="np-panel py-16 text-center">
        <p className="text-sm text-np-muted">No active opportunities found yet. Check back soon.</p>
      </div>
    );
  }
  return <OpportunityGrid items={featured} />;
}

function ListingFrame() {
  return (
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
  );
}

export default function HomePage() {
  return (
    <HomeChrome
      pill={
        <Suspense fallback={<LivePill />}>
          <LiveCount />
        </Suspense>
      }
      map={
        <Suspense fallback={<MapFrame />}>
          <HomeMap />
        </Suspense>
      }
      stats={
        <Suspense fallback={<StatsPlaceholder />}>
          <HomeStats />
        </Suspense>
      }
      closing={
        <Suspense fallback={null}>
          <HomeClosing />
        </Suspense>
      }
      categories={
        <Suspense fallback={<div className="h-9" />}>
          <HomeCategories />
        </Suspense>
      }
      listings={
        <Suspense fallback={<ListingFrame />}>
          <HomeListings />
        </Suspense>
      }
    />
  );
}
