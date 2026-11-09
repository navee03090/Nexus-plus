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
    const diffDays = Math.ceil(
      (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays < 0) {
      displayLabel = "Closed";
    } else if (diffDays === 0) {
      displayLabel = "Closes today";
    } else if (diffDays === 1) {
      displayLabel = "Closes tomorrow";
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
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-np-danger/10 text-np-danger border border-np-danger/30 ${className}`}
      >
        <AlertTriangle className="w-3 h-3" />
        {displayLabel}
      </span>
    );
  }

  if (normalized === "closing soon" || normalized === "high") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-np-warn/10 text-np-warn border border-np-warn/30 ${className}`}
      >
        <Clock className="w-3 h-3" />
        {displayLabel}
      </span>
    );
  }

  if (normalized === "closed" || normalized === "expired") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-np-surface-2 text-np-faint border border-np-border ${className}`}
      >
        <XCircle className="w-3 h-3" />
        {displayLabel}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-np-verify/10 text-np-verify border border-np-verify/30 ${className}`}
    >
      <CheckCircle2 className="w-3 h-3" />
      {displayLabel}
    </span>
  );
};
