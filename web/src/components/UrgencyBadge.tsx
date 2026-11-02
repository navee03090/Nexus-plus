import React from "react";
import { Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

interface UrgencyBadgeProps {
  urgency?: string;
  label?: string;
  deadline?: string;
  className?: string;
}

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({
  urgency = "Normal",
  label,
  deadline,
  className = "",
}) => {
  let displayLabel = label;
  if (!displayLabel && deadline) {
    const diffDays = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      displayLabel = "Closed";
    } else if (diffDays === 0) {
      displayLabel = "Closes Today";
    } else if (diffDays === 1) {
      displayLabel = "Closes Tomorrow";
    } else {
      displayLabel = `Closes in ${diffDays} days`;
    }
  } else if (!displayLabel) {
    displayLabel = urgency;
  }

  const normalized = urgency.toLowerCase();

  if (normalized === "urgent" || (label && label.toLowerCase().includes("today"))) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        <AlertTriangle className="w-3.5 h-3.5" />
        {displayLabel}
      </span>
    );
  }

  if (normalized === "closing soon" || normalized === "high") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 ${className}`}
      >
        <Clock className="w-3.5 h-3.5" />
        {displayLabel}
      </span>
    );
  }

  if (normalized === "closed" || normalized === "expired") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 ${className}`}
      >
        <XCircle className="w-3.5 h-3.5" />
        {displayLabel}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${className}`}
    >
      <CheckCircle2 className="w-3.5 h-3.5" />
      {displayLabel}
    </span>
  );
};
