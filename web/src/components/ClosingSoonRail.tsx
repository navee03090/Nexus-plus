"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import NumberFlow from "@number-flow/react";
import { Opportunity } from "@/types";

function remaining(deadline?: string | null) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) return null;
  return diff;
}

function Countdown({ deadline }: { deadline: string }) {
  const [diff, setDiff] = useState(() => remaining(deadline) ?? 0);

  useEffect(() => {
    const tick = () => setDiff(remaining(deadline) ?? 0);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadline]);

  const urgent = diff > 0 && diff < 48 * 60 * 60 * 1000;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / 60000);
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums text-xs text-np-muted">
      {urgent ? (
        <span className="relative inline-flex h-1.5 w-1.5" aria-hidden="true">
          <span className="np-ping absolute inset-0 rounded-full bg-np-danger" />
          <span className="h-1.5 w-1.5 rounded-full bg-np-danger" />
        </span>
      ) : null}
      {urgent ? (
        <>
          <NumberFlow value={hours} respectMotionPreference />
          <span>h</span>
          <NumberFlow value={minutes} format={{ minimumIntegerDigits: 2 }} respectMotionPreference />
          <span>m</span>
        </>
      ) : (
        <>
          <NumberFlow value={days} respectMotionPreference />
          <span>d left</span>
        </>
      )}
    </span>
  );
}

export function ClosingSoonRail({ items }: { items: Opportunity[] }) {
  const [emblaRef] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });
  if (items.length === 0) return null;

  return (
    <section className="w-full py-8" aria-label="Closing soon">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-lg font-bold text-np-text">Closing soon</h2>
          <Link href="/opportunities?urgency=urgent" className="text-sm text-np-accent">
            See all
          </Link>
        </div>
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/opportunities/${item.slug}`}
                className="min-w-0 flex-[0_0_260px] rounded-np-lg border border-white/[0.07] bg-np-surface p-4 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-np-accent/45 sm:flex-[0_0_300px]"
              >
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-np-accent">
                  {item.category_name || "Opportunity"}
                </div>
                <div className="line-clamp-2 text-sm font-semibold text-np-text">{item.title}</div>
                {item.registration_deadline ? (
                  <div className="mt-3">
                    <Countdown deadline={item.registration_deadline} />
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
