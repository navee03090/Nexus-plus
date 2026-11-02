import React from "react";
import { ShieldCheck, ShieldAlert, Sparkles, Layers } from "lucide-react";

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

  if (normalized === "source_verified" || normalized === "verified" || (trustScore && trustScore >= 0.85)) {
    return (
      <span
        title={
          sourcesCount > 1
            ? `Verified across ${sourcesCount} official sources with high cryptographic/provenance trust`
            : "Directly verified against original authoritative source"
        }
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 ${className}`}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        {sourcesCount > 1 ? (
          <span className="flex items-center gap-1">
            <span>Cross-Confirmed</span>
            <span className="px-1 py-0.2 text-[10px] bg-emerald-500/20 rounded font-mono">
              {sourcesCount} sources
            </span>
          </span>
        ) : (
          <span>Source Verified</span>
        )}
        {showScore && trustScore !== undefined && (
          <span className="text-[11px] text-emerald-400/80 font-mono ml-0.5">
            {Math.round(trustScore * 100)}%
          </span>
        )}
      </span>
    );
  }

  if (normalized === "pending_verification" || normalized === "review_needed") {
    return (
      <span
        title="Discovered by automated ingestion; awaiting editorial verification review"
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-500/30 ${className}`}
      >
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
        <span>In Verification</span>
      </span>
    );
  }

  return (
    <span
      title="Extracted with zero-hallucination multimodal AI pipelines"
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 ${className}`}
    >
      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
      <span>AI Extracted</span>
      {showScore && trustScore !== undefined && (
        <span className="text-[11px] text-indigo-400/80 font-mono ml-0.5">
          {Math.round(trustScore * 100)}%
        </span>
      )}
    </span>
  );
};
