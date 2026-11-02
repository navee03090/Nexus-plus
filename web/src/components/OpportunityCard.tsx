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
  Building2,
  Sparkles,
  Layers
} from "lucide-react";
import { Opportunity } from "@/types";
import { UrgencyBadge } from "./UrgencyBadge";
import { VerificationBadge } from "./VerificationBadge";
import { formatDate } from "@/lib/utils";
import { saveOpportunity } from "@/lib/api";

interface OpportunityCardProps {
  opportunity: Opportunity;
  showMatchScore?: boolean;
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

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl glass-panel glass-panel-hover overflow-hidden transition-all duration-300">
      {/* Top Banner / Flyer Thumbnail */}
      <div className="relative h-44 w-full bg-slate-900 overflow-hidden border-b border-slate-800/80">
        {opportunity.flyer_url ? (
          <img
            src={opportunity.flyer_url}
            alt={opportunity.title}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex items-center justify-center p-6 text-center">
            <span className="text-4xl opacity-30 select-none">⚡</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

        {/* Floating Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-600/90 text-white backdrop-blur-md shadow-sm border border-indigo-400/30">
              {opportunity.category_name || "Opportunity"}
            </span>

            {showMatchScore && opportunity.match_score && (
              <span 
                title={opportunity.match_reasons?.join(" • ")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/90 text-slate-950 backdrop-blur-md shadow-sm"
              >
                <Sparkles className="w-3 h-3 fill-slate-950" />
                <span>{opportunity.match_score}% Match</span>
              </span>
            )}
          </div>

          <button
            onClick={handleToggleSave}
            disabled={saving}
            aria-label="Bookmark opportunity"
            className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white backdrop-blur-md border border-white/10 transition-colors shadow-sm"
          >
            {isSaved ? (
              <BookmarkCheck className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Organizer info overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 shrink-0">
            {opportunity.organization_name ? opportunity.organization_name.charAt(0) : "O"}
          </div>
          <span className="text-xs font-medium text-slate-200 truncate drop-shadow-sm">
            {opportunity.organization_name || "Official Institution"}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Title */}
          <Link href={`/opportunities/${opportunity.slug}`} className="block group/link mb-2">
            <h3 className="text-base font-semibold text-slate-100 group-hover/link:text-indigo-400 transition-colors line-clamp-2 leading-snug">
              {opportunity.title}
            </h3>
          </Link>

          {/* Summary */}
          <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
            {opportunity.summary}
          </p>

          {/* Match Reasons (if personalized) */}
          {showMatchScore && opportunity.match_reasons && opportunity.match_reasons.length > 0 && (
            <div className="mb-4 p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-900/40 text-[11px] text-indigo-300 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="line-clamp-1 truncate">
                <span className="font-medium text-indigo-200">Why matched: </span>
                {opportunity.match_reasons[0]}
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="space-y-2 mb-4 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {opportunity.start_date ? formatDate(opportunity.start_date) : "TBA"}
                {opportunity.end_date && ` - ${formatDate(opportunity.end_date)}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {opportunity.is_online ? (
                <>
                  <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-cyan-300">Online / Virtual</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{opportunity.venue || opportunity.city}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer info: Urgency & Provenance Badges + Details link */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <UrgencyBadge
              urgency={opportunity.deadline_urgency}
              label={opportunity.deadline_label}
              deadline={opportunity.registration_deadline}
            />
            <VerificationBadge
              status={opportunity.verification_status}
              trustScore={opportunity.trust_score}
              sourcesCount={sourcesCount}
            />
          </div>

          <Link
            href={`/opportunities/${opportunity.slug}`}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors shrink-0 ml-auto"
          >
            <span>View</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
