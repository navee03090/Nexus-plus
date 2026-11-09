"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Globe,
  Bookmark,
  BookmarkCheck,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Opportunity } from "@/types";
import { UrgencyBadge } from "./UrgencyBadge";
import { VerificationBadge } from "./VerificationBadge";
import { FlyerImage } from "./FlyerImage";
import { formatDate } from "@/lib/utils";
import { saveOpportunity } from "@/lib/api";

interface OpportunityCardProps {
  opportunity: Opportunity;
  showMatchScore?: boolean;
}

function initials(name?: string) {
  if (!name) return "NP";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "NP";
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  showMatchScore = true,
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaving(true);
    try {
      const res = await saveOpportunity(opportunity.id);
      setIsSaved(res.saved);
    } catch {
      setIsSaved(!isSaved);
    } finally {
      setSaving(false);
    }
  };

  const sourcesCount = opportunity.sources?.length || 1;
  const deadline = opportunity.registration_deadline;

  return (
    <article className="group relative flex flex-col rounded-np-lg border border-np-border bg-np-surface overflow-hidden np-panel-hover hover:-translate-y-0.5 hover:shadow-np transition-[border-color,background-color,transform,box-shadow] duration-200">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-np-accent/70 group-hover:bg-np-accent transition-colors" />

      {opportunity.flyer_url && (
        <FlyerImage
          src={opportunity.flyer_url}
          alt=""
          height={112}
          className="border-b border-np-border"
        />
      )}

      <div className="p-5 flex-1 flex flex-col pl-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-np-accent/15 text-np-accent border border-np-accent/25">
              {opportunity.category_name || "Opportunity"}
            </span>
            <VerificationBadge
              status={opportunity.verification_status}
              trustScore={opportunity.trust_score}
              sourcesCount={sourcesCount}
            />
            {showMatchScore && opportunity.match_score ? (
              <span
                title={opportunity.match_reasons?.join(" • ")}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-np-verify/15 text-np-verify border border-np-verify/25"
              >
                <Sparkles className="w-3 h-3" />
                {opportunity.match_score}%
              </span>
            ) : null}
          </div>

          <button
            onClick={handleToggleSave}
            disabled={saving}
            aria-label={isSaved ? "Remove bookmark" : "Bookmark opportunity"}
            className="p-2 rounded-np text-np-muted hover:text-np-text hover:bg-np-surface-2 border border-transparent hover:border-np-border transition-colors shrink-0"
          >
            {isSaved ? (
              <BookmarkCheck className="w-4 h-4 text-np-verify fill-np-verify" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>
        </div>

        <Link href={`/opportunities/${opportunity.slug}`} className="block mb-2">
          <h3 className="text-base font-semibold text-np-text group-hover:text-np-accent transition-colors line-clamp-2 leading-snug">
            {opportunity.title}
          </h3>
        </Link>

        <div className="flex items-center gap-2 mb-3 text-sm text-np-muted">
          <span className="w-7 h-7 rounded-md bg-np-surface-2 border border-np-border flex items-center justify-center text-[10px] font-bold text-np-accent shrink-0">
            {initials(opportunity.organization_name)}
          </span>
          <span className="truncate">
            {opportunity.organization_name || "Official institution"}
          </span>
        </div>

        <p className="text-sm text-np-muted line-clamp-2 mb-4 leading-relaxed">
          {opportunity.summary}
        </p>

        {showMatchScore && opportunity.match_reasons && opportunity.match_reasons.length > 0 && (
          <div className="mb-4 p-2.5 rounded-np bg-np-accent/10 border border-np-accent/20 text-xs text-np-accent flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div className="line-clamp-2">
              <span className="font-medium text-np-text">Why matched: </span>
              {opportunity.match_reasons[0]}
            </div>
          </div>
        )}

        <div className="mt-auto space-y-2 text-sm text-np-muted">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-np-faint shrink-0" />
            <span>
              {deadline ? (
                <>
                  Deadline <span className="text-np-text font-medium">{formatDate(deadline)}</span>
                </>
              ) : opportunity.start_date ? (
                <>Starts {formatDate(opportunity.start_date)}</>
              ) : (
                "Date TBA"
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {opportunity.is_online ? (
              <>
                <Globe className="w-3.5 h-3.5 text-np-online shrink-0" />
                <span className="text-np-online">Online / Virtual</span>
              </>
            ) : (
              <>
                <MapPin className="w-3.5 h-3.5 text-np-faint shrink-0" />
                <span className="truncate">{opportunity.venue || opportunity.city || "Pakistan"}</span>
              </>
            )}
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-np-border flex items-center justify-between gap-2">
          <UrgencyBadge
            urgency={opportunity.deadline_urgency}
            label={opportunity.deadline_label}
            deadline={opportunity.registration_deadline}
          />
          <Link
            href={`/opportunities/${opportunity.slug}`}
            className="flex items-center gap-1 text-sm font-semibold text-np-accent hover:text-[#7aadff] transition-colors shrink-0"
          >
            <span>View</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
};
