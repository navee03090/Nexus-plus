import React from "react";
import { ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";

interface VerificationBadgeProps {
  status: string;
  trustScore?: number;
  sourcesCount?: number;
  className?: string;
  showScore?: boolean;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  status,
  trustScore,
  sourcesCount = 1,
  className = "",
  showScore = false,
}) => {
  const normalized = status.toLowerCase();

  if (
    normalized === "source_verified" ||
    normalized === "verified" ||
    (trustScore && trustScore >= 0.85)
  ) {
    return (
      <span
        title={
          sourcesCount > 1
            ? `Verified across ${sourcesCount} official sources`
            : "Verified against the original official source"
        }
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-np-verify/10 text-np-verify border border-np-verify/30 ${className}`}
      >
        <ShieldCheck className="w-3 h-3" />
        {sourcesCount > 1 ? (
          <span>Verified · {sourcesCount}</span>
        ) : (
          <span>Verified</span>
        )}
        {showScore && trustScore !== undefined && (
          <span className="opacity-80">{Math.round(trustScore * 100)}%</span>
        )}
      </span>
    );
  }

  if (normalized === "pending_verification" || normalized === "review_needed") {
    return (
      <span
        title="Awaiting editorial verification"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-np-warn/10 text-np-warn border border-np-warn/30 ${className}`}
      >
        <ShieldAlert className="w-3 h-3" />
        <span>In review</span>
      </span>
    );
  }

  return (
    <span
      title="Structured from source material"
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-np-accent/10 text-np-accent border border-np-accent/30 ${className}`}
    >
      <Sparkles className="w-3 h-3" />
      <span>Listed</span>
      {showScore && trustScore !== undefined && (
        <span className="opacity-80">{Math.round(trustScore * 100)}%</span>
      )}
    </span>
  );
};
