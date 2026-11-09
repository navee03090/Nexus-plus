import React from "react";
import {
  GraduationCap,
  Code2,
  Briefcase,
  Rocket,
  Mic,
  CalendarDays,
  Layers,
  type LucideIcon,
} from "lucide-react";

const ICONS: { test: RegExp; icon: LucideIcon }[] = [
  { test: /scholar|grant|fellow/i, icon: GraduationCap },
  { test: /hack|compet|cyber/i, icon: Code2 },
  { test: /intern|job|career/i, icon: Briefcase },
  { test: /startup|incub|cohort/i, icon: Rocket },
  { test: /confer|summit/i, icon: Mic },
  { test: /workshop|train/i, icon: CalendarDays },
];

export function CategoryCover({
  category,
  className = "",
}: {
  category?: string | null;
  className?: string;
}) {
  const name = category || "Opportunity";
  const Icon = ICONS.find((item) => item.test.test(name))?.icon || Layers;

  return (
    <div
      className={`relative h-28 w-full overflow-hidden border-b border-white/10 bg-np-surface-2 ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(61,139,255,0.28),transparent_55%),linear-gradient(160deg,#121a24_0%,#0c1219_100%)]" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="absolute bottom-3 left-3 flex items-center gap-2 text-np-accent">
        <Icon className="w-4 h-4" />
        <span className="text-[11px] font-semibold tracking-wide uppercase">{name}</span>
      </div>
    </div>
  );
}
