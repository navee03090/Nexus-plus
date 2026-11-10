"use client";

import React from "react";
import NumberFlow from "@number-flow/react";

type StatItem = {
  value: number;
  label: string;
  suffix?: string;
  colorClass?: string;
};

export function StatsCounters({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 text-center sm:gap-6 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="p-3">
          <div className={`text-2xl font-bold tabular-nums sm:text-3xl ${item.colorClass || "text-np-accent"}`}>
            <NumberFlow value={item.value} suffix={item.suffix} respectMotionPreference />
          </div>
          <div className="mt-1 text-sm text-np-muted">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
