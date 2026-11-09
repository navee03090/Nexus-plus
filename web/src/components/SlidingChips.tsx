"use client";

import React from "react";
import Link from "next/link";
import { LayoutGroup, motion } from "motion/react";

export type Chip = {
  id: string;
  label: string;
  href: string;
  active: boolean;
};

export function SlidingChips({ chips, group }: { chips: Chip[]; group: string }) {
  return (
    <LayoutGroup id={group}>
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <Link
            key={chip.id}
            href={chip.href}
            aria-current={chip.active ? "true" : undefined}
            className={`relative rounded-np px-3 py-1.5 text-xs font-medium ${
              chip.active ? "text-np-accent" : "text-np-muted hover:text-np-text"
            }`}
          >
            {chip.active ? (
              <motion.span
                layoutId={`${group}-pill`}
                className="absolute inset-0 rounded-np border border-np-accent/40 bg-np-accent/15"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            ) : null}
            <span className="relative z-10">{chip.label}</span>
          </Link>
        ))}
      </div>
    </LayoutGroup>
  );
}
