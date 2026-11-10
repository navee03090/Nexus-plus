import React from "react";
import Link from "next/link";
import { OpportunityGrid } from "@/components/OpportunityGrid";
import { StatsCounters } from "@/components/StatsCounters";
import { ClosingSoonRail } from "@/components/ClosingSoonRail";
import { HomeChrome, LivePill } from "@/components/HomeChrome";
import { PakistanMap } from "@/components/PakistanMap";
import { fetchOpportunities, fetchAdminStats, fetchCategories } from "@/lib/api";
import { closesWithinDays, isExpired, prepareListings } from "@/lib/opportunityDisplay";
import { MAP_CITIES } from "@/lib/mapCities";

export const revalidate = 60;

export default async function HomePage() {
  const [opportunities, stats, categories] = await Promise.all([
    fetchOpportunities({ limit: 50, includePast: true }),
    fetchAdminStats(),
    fetchCategories(),
  ]);

  const listings = prepareListings(opportunities);
  const openListings = listings.filter((item) => !isExpired(item));
  const closingSoon = openListings
    .filter((item) => closesWithinDays(item, 7))
    .sort(
      (a, b) =>
        new Date(a.registration_deadline || 0).getTime() - new Date(b.registration_deadline || 0).getTime()
    );
  const statItems = [
    { value: stats.sources_monitored ?? 0, label: "Sources monitored", colorClass: "text-np-accent" },
    { value: openListings.length, label: "Live opportunities", colorClass: "text-np-accent" },
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
  for (const item of listings) {
    const city = (item.city || "").trim().toLowerCase();
    const match = MAP_CITIES.find((entry) => entry.name.toLowerCase() === city);
    if (match) cityCounts[match.name] += 1;
  }

  const featured = listings.slice(0, 6);

  return (
    <HomeChrome
      pill={<LivePill count={openListings.length} />}
      map={<PakistanMap counts={cityCounts} />}
      stats={<StatsCounters items={statItems} />}
      closing={<ClosingSoonRail items={closingSoon.slice(0, 8)} />}
      categories={
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/opportunities?category=${cat.slug}`} className="np-chip shrink-0 whitespace-nowrap">
              {cat.name}
            </Link>
          ))}
        </div>
      }
      listings={
        featured.length === 0 ? (
          <div className="np-panel py-16 text-center">
            <p className="text-sm text-np-muted">No opportunities found yet. Check back soon.</p>
          </div>
        ) : (
          <OpportunityGrid items={featured} />
        )
      }
    />
  );
}
