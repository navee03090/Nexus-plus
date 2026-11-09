"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import topologyJson from "@/data/pakistan.json";
import { MAP_CITIES } from "@/lib/mapCities";

const WIDTH = 420;
const HEIGHT = 460;

type TopologyFile = Topology<{ pakistan: GeometryCollection }>;

export function PakistanMap({ counts }: { counts: Record<string, number> }) {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);

  const { outline, dots } = useMemo(() => {
    const topology = topologyJson as unknown as TopologyFile;
    const collection = feature(topology, topology.objects.pakistan);
    const projection = geoMercator().fitExtent(
      [
        [16, 16],
        [WIDTH - 16, HEIGHT - 16],
      ],
      collection as GeoPermissibleObjects
    );
    const path = geoPath(projection);
    const outline = path(collection as GeoPermissibleObjects) || "";
    const dots = MAP_CITIES.map((city) => {
      const point = projection(city.coordinates);
      const count = counts[city.name] || 0;
      const radius = count === 0 ? 4 : Math.min(13, 5 + Math.sqrt(count) * 2.2);
      return {
        name: city.name,
        count,
        x: point ? point[0] : 0,
        y: point ? point[1] : 0,
        radius,
      };
    }).filter((dot) => dot.x && dot.y);
    return { outline, dots };
  }, [counts]);

  const openCity = (city: string) => {
    router.push(`/opportunities?city=${encodeURIComponent(city)}`);
  };

  const activeDot = dots.find((dot) => dot.name === active);

  return (
    <div className="relative mx-auto w-full max-w-md" aria-label="Opportunity map of Pakistan">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img">
        <title>Pakistan, with opportunities by city</title>
        <path d={outline} fill="#151C25" stroke="rgba(61,139,255,0.85)" strokeWidth="1.5" />
        {dots.map((dot) => (
          <g key={dot.name} transform={`translate(${dot.x} ${dot.y})`}>
            <circle className="np-ping" r={dot.radius} fill="#3D8BFF" />
            <circle r={dot.radius} fill="#3D8BFF" />
            <circle
              r={Math.max(16, dot.radius + 8)}
              fill="transparent"
              className="cursor-pointer"
              tabIndex={0}
              role="link"
              aria-label={`${dot.name}, ${dot.count} ${dot.count === 1 ? "opportunity" : "opportunities"}`}
              onMouseEnter={() => setActive(dot.name)}
              onMouseLeave={() => setActive((current) => (current === dot.name ? null : current))}
              onFocus={() => setActive(dot.name)}
              onBlur={() => setActive((current) => (current === dot.name ? null : current))}
              onClick={() => openCity(dot.name)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openCity(dot.name);
                }
              }}
            />
          </g>
        ))}
      </svg>

      {activeDot ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-np border border-white/10 bg-np-bg px-2.5 py-1.5 text-xs text-np-text"
          style={{
            left: `${(activeDot.x / WIDTH) * 100}%`,
            top: `${((activeDot.y - activeDot.radius - 28) / HEIGHT) * 100}%`,
          }}
          role="tooltip"
        >
          <span className="font-semibold">{activeDot.name}</span>
          <span className="ml-1 tabular-nums text-np-muted">{activeDot.count}</span>
        </div>
      ) : null}
    </div>
  );
}
