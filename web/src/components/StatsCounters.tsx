"use client";

import React, { useEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";

type StatItem = {
  value: number;
  label: string;
  suffix?: string;
  colorClass?: string;
};

function StatValue({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        if (reduced) {
          setDisplay(value);
          setShown(true);
          return;
        }
        setDisplay(0);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setDisplay(value);
            setShown(true);
          });
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref} className={shown ? "opacity-100" : "opacity-0"} style={{ transition: "opacity 180ms linear" }}>
      <NumberFlow value={display} suffix={suffix} respectMotionPreference />
    </span>
  );
}

export function StatsCounters({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 text-center sm:gap-6 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="p-3">
          <div className={`text-2xl font-bold tabular-nums sm:text-3xl ${item.colorClass || "text-np-accent"}`}>
            <StatValue value={item.value} suffix={item.suffix} />
          </div>
          <div className="mt-1 text-sm text-np-muted">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
