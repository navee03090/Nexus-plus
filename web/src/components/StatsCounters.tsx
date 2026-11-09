"use client";

import React, { useEffect, useRef, useState } from "react";

type StatItem = {
  value: number;
  label: string;
  suffix?: string;
  colorClass?: string;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function CountUp({
  value,
  suffix = "",
  active,
  reduced,
}: {
  value: number;
  suffix?: string;
  active: boolean;
  reduced: boolean;
}) {
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setDisplay(value);
      return;
    }

    const duration = 900;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, value, reduced]);

  return (
    <span className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

export function StatsCounters({ items }: { items: StatItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="grid grid-cols-2 gap-4 text-center sm:gap-6 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="p-3 np-fade-up">
          <div
            className={`text-2xl sm:text-3xl font-bold tabular-nums ${
              item.colorClass || "text-np-accent"
            }`}
          >
            <CountUp
              value={item.value}
              suffix={item.suffix}
              active={active}
              reduced={reduced}
            />
          </div>
          <div className="text-sm text-np-muted mt-1">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
