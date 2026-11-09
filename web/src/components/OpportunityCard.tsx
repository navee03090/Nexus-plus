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
  BadgeCheck,
  Sparkles,
} from "lucide-react";
import { Opportunity } from "@/types";
import { UrgencyBadge } from "./UrgencyBadge";
import { FlyerImage } from "./FlyerImage";
import { CategoryCover } from "./CategoryCover";
import { formatDate } from "@/lib/utils";
import { saveOpportunity } from "@/lib/api";
import {
  displaySummary,
  isExpired,
  knownOrganizer,
  locationLabel,
} from "@/lib/opportunityDisplay";

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
  const expired = isExpired(opportunity);
  const organizer = knownOrganizer(opportunity.organization_name);
  const summary = displaySummary(opportunity);
  const place = locationLabel(opportunity);
  const deadline = opportunity.registration_deadline;
  const when = deadline
    ? formatDate(deadline)
    : opportunity.start_date
      ? formatDate(opportunity.start_date)
      : "";

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

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-np-lg border border-white/[0.07] bg-np-surface transition-[transform,border-color,opacity] duration-200 hover:-translate-y-0.5 hover:border-np-accent/45 ${
        expired ? "opacity-60 hover:opacity-80" : ""
      }`}
      style={{ viewTransitionName: `card-${opportunity.slug}` }}
    >
      <div className="h-28 shrink-0">
        {opportunity.flyer_url ? (
          <FlyerImage
            src={opportunity.flyer_url}
            alt=""
            height={112}
            className="h-28 border-b border-white/10"
          />
        ) : (
          <CategoryCover category={opportunity.category_name} />
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-np-accent/25 bg-np-accent/15 px-2 py-0.5 text-[11px] font-semibold text-np-accent">
              {opportunity.category_name || "Opportunity"}
            </span>
            {expired ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-np-faint">
                Closed
              </span>
            ) : (
              <UrgencyBadge
                urgency={opportunity.deadline_urgency}
                label={opportunity.deadline_label}
                deadline={opportunity.registration_deadline}
              />
            )}
            {showMatchScore && opportunity.match_score ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-np-accent/25 bg-np-accent/10 px-2 py-0.5 text-[11px] font-semibold text-np-accent">
                <Sparkles className="h-3 w-3" />
                {opportunity.match_score}%
              </span>
            ) : null}
          </div>
          <button
            onClick={handleToggleSave}
            disabled={saving}
            aria-label={isSaved ? "Remove bookmark" : "Bookmark opportunity"}
            className="shrink-0 rounded-np p-2 text-np-muted transition-colors hover:bg-np-surface-2 hover:text-np-text"
          >
            {isSaved ? (
              <BookmarkCheck className="h-4 w-4 fill-np-accent text-np-accent" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        </div>

        <Link href={`/opportunities/${opportunity.slug}`} className="mb-2 block">
          <h3
            className="line-clamp-2 text-base font-semibold leading-snug text-np-text transition-colors group-hover:text-np-accent"
            style={{ viewTransitionName: `title-${opportunity.slug}` }}
          >
            {opportunity.title}
          </h3>
        </Link>

        {organizer ? (
          <div className="mb-3 flex items-center gap-1.5 text-sm text-np-muted">
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-np-accent" aria-hidden="true" />
            <span className="truncate">{organizer}</span>
          </div>
        ) : null}

        {summary ? (
          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-np-muted">{summary}</p>
        ) : null}

        <div className="mt-auto space-y-2 text-sm text-np-muted">
          {when ? (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-np-faint" />
              <span className="tabular-nums">
                {deadline ? "Deadline " : "Starts "}
                <span className="font-medium text-np-text">{when}</span>
              </span>
            </div>
          ) : null}
          {place ? (
            <div className="flex items-center gap-2">
              {opportunity.is_online ? (
                <Globe className="h-3.5 w-3.5 shrink-0 text-np-accent" />
              ) : (
                <MapPin className="h-3.5 w-3.5 shrink-0 text-np-faint" />
              )}
              <span className="truncate">{place}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-end border-t border-white/10 pt-4">
          <Link
            href={`/opportunities/${opportunity.slug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-np-accent"
          >
            <span>View</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
};
