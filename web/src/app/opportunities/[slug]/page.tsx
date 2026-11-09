import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  MapPin,
  Globe,
  ExternalLink,
  ShieldCheck,
  Clock,
  Building2,
  Mail,
  Tag,
  History,
  Layers,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { fetchOpportunityBySlug, fetchOpportunities } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { VerificationBadge } from "@/components/VerificationBadge";
import { OpportunityCard } from "@/components/OpportunityCard";
import { FlyerImage } from "@/components/FlyerImage";
import { OpportunityActionButtons } from "./OpportunityActionButtons";

interface OpportunityDetailPageProps {
  params: {
    slug: string;
  };
}

export const revalidate = 30;

export default async function OpportunityDetailPage({ params }: OpportunityDetailPageProps) {
  const opportunity = await fetchOpportunityBySlug(params.slug);

  if (!opportunity) {
    notFound();
  }

  const sources = opportunity.sources || [];
  const changes = opportunity.changes || [];

  const relatedPool = await fetchOpportunities({
    category: opportunity.category_slug || undefined,
    limit: 12,
  });
  const related = relatedPool
    .filter((o) => o.id !== opportunity.id && o.slug !== opportunity.slug)
    .slice(0, 3);

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 ${opportunity.registration_url ? "pb-24 lg:pb-10" : ""}`}>
      <div className="mb-6">
        <Link
          href="/opportunities"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-np-muted hover:text-np-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to opportunities</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 sm:p-8 np-panel space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-np-accent/15 text-np-accent border border-np-accent/25">
                {opportunity.category_name || "Opportunity"}
              </span>
              <UrgencyBadge
                urgency={opportunity.deadline_urgency}
                label={opportunity.deadline_label}
                deadline={opportunity.registration_deadline}
              />
              <VerificationBadge
                status={opportunity.verification_status}
                trustScore={opportunity.trust_score}
                sourcesCount={sources.length}
                showScore={true}
              />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-np-text tracking-tight leading-snug">
              {opportunity.title}
            </h1>

            <div className="flex items-center gap-3 pt-1 text-sm text-np-muted">
              <div className="w-9 h-9 rounded-np bg-np-surface-2 border border-np-border flex items-center justify-center font-bold text-np-accent">
                {opportunity.organization_name ? opportunity.organization_name.charAt(0) : "O"}
              </div>
              <div>
                <div className="font-semibold text-np-text">
                  {opportunity.organization_name || "Official institution"}
                </div>
                <div className="text-np-faint text-xs">
                  {opportunity.city}
                  {opportunity.country ? `, ${opportunity.country}` : ""}
                </div>
              </div>
            </div>
          </div>

          {opportunity.flyer_url && (
            <div className="rounded-np-lg overflow-hidden bg-np-surface border border-np-border shadow-np">
              <FlyerImage
                src={opportunity.flyer_url}
                alt={`${opportunity.title} flyer`}
                contain
                priority
                className="p-2"
              />
              <div className="px-4 py-2.5 bg-np-surface border-t border-np-border flex items-center justify-between text-xs text-np-muted gap-3">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-np-accent" />
                  <span>Official announcement flyer</span>
                </span>
                <a
                  href={opportunity.flyer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-np-accent hover:text-[#7aadff] flex items-center gap-1 shrink-0"
                >
                  <span>View original</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          <div className="p-6 sm:p-8 np-panel space-y-4">
            <h2 className="text-lg font-bold text-np-text tracking-tight">About this opportunity</h2>
            <div className="text-sm sm:text-[15px] text-np-muted leading-relaxed whitespace-pre-line">
              {opportunity.description || opportunity.summary}
            </div>
          </div>

          {(opportunity.eligibility_summary || opportunity.target_audience.length > 0) && (
            <div className="p-6 sm:p-8 np-panel space-y-4">
              <h2 className="text-lg font-bold text-np-text tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-np-accent" />
                <span>Eligibility & audience</span>
              </h2>

              {opportunity.eligibility_summary && (
                <div className="p-4 rounded-np bg-np-accent/10 border border-np-accent/20 text-sm text-np-text">
                  <span className="font-semibold block mb-1">Eligibility criteria</span>
                  <span className="text-np-muted">{opportunity.eligibility_summary}</span>
                </div>
              )}

              {opportunity.target_audience.length > 0 && (
                <div>
                  <span className="text-sm font-semibold text-np-muted block mb-2">Who should apply</span>
                  <div className="flex flex-wrap gap-2">
                    {opportunity.target_audience.map((aud, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-np bg-np-surface-2 border border-np-border text-sm text-np-text font-medium"
                      >
                        {aud}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="p-6 sm:p-8 np-panel space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-np-text tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-np-verify" />
                <span>Sources & evidence</span>
              </h2>
              <span className="text-xs text-np-verify font-medium">
                {sources.length || 1} source{(sources.length || 1) === 1 ? "" : "s"}
              </span>
            </div>

            <p className="text-sm text-np-muted leading-relaxed">
              Original sources remain the source of truth. Open a source below to verify details on the
              official page before you apply.
            </p>

            <div className="space-y-3">
              {sources.length === 0 ? (
                <div className="p-4 rounded-np bg-np-surface-2 border border-np-border text-sm text-np-muted">
                  Ingested from the official portal registry.
                </div>
              ) : (
                sources.map((src) => (
                  <div
                    key={src.id}
                    className="p-4 rounded-np bg-np-surface-2 border border-np-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-np-text">
                          {src.source_name || "Official announcement"}
                        </span>
                        {src.is_primary_source && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-np-verify/15 text-np-verify border border-np-verify/30">
                            Primary
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] bg-np-bg text-np-faint border border-np-border">
                          {src.platform}
                        </span>
                      </div>
                      <div className="text-xs text-np-faint mt-1 truncate max-w-md">
                        {src.canonical_url}
                      </div>
                    </div>

                    <a
                      href={src.canonical_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="np-btn-secondary text-xs shrink-0 py-2"
                    >
                      <span>View source</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))
              )}
            </div>

            {opportunity.provenance_reasons && opportunity.provenance_reasons.length > 0 && (
              <div className="pt-2">
                <div className="text-sm font-semibold text-np-muted mb-2">Why we trust this listing</div>
                <ul className="space-y-1 text-sm text-np-muted">
                  {opportunity.provenance_reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-np-verify font-bold">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {changes.length > 0 && (
            <div className="p-6 sm:p-8 np-panel space-y-4">
              <h2 className="text-lg font-bold text-np-text tracking-tight flex items-center gap-2">
                <History className="w-5 h-5 text-np-warn" />
                <span>Detected updates</span>
              </h2>
              <p className="text-sm text-np-muted leading-relaxed">
                Deadline extensions, venue changes, or postponements tracked automatically:
              </p>
              <div className="space-y-3">
                {changes.map((chg) => (
                  <div
                    key={chg.id}
                    className="p-4 rounded-np bg-np-surface-2 border border-np-warn/20 text-sm space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-np-warn uppercase tracking-wider text-xs">
                        {chg.change_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-np-faint">
                        {new Date(chg.detected_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-np-muted">
                      Field: <strong className="text-np-text">{chg.field_name}</strong>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs">
                      {chg.old_value && (
                        <div className="p-2 rounded bg-np-bg text-np-danger border border-np-danger/30">
                          Previous: {chg.old_value}
                        </div>
                      )}
                      {chg.new_value && (
                        <div className="p-2 rounded bg-np-bg text-np-verify border border-np-verify/30">
                          Updated: {chg.new_value}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {related.length > 0 && (
            <div className="space-y-4 pt-2">
              <h2 className="text-lg font-bold text-np-text tracking-tight">Related opportunities</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {related.map((opp) => (
                  <OpportunityCard key={opp.id} opportunity={opp} showMatchScore={false} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="lg:sticky lg:top-24 p-6 sm:p-7 np-panel shadow-np-lg space-y-6">
            {opportunity.registration_url ? (
              <a
                href={opportunity.registration_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full np-btn-primary py-3.5 text-sm shadow-np"
              >
                <span>Register / Apply</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <div className="w-full py-3.5 px-4 rounded-np bg-np-surface-2 text-np-muted text-sm text-center font-medium border border-np-border">
                Registration details are on the official announcement
              </div>
            )}

            <OpportunityActionButtons opportunity={opportunity} />

            <div className="pt-4 border-t border-np-border space-y-3.5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-np-muted flex items-center gap-1.5 shrink-0">
                  <Clock className="w-4 h-4 text-np-danger" />
                  <span>Deadline</span>
                </span>
                <span className="font-semibold text-np-text text-right">
                  {opportunity.registration_deadline
                    ? formatDate(opportunity.registration_deadline)
                    : "Not specified"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <span className="text-np-muted flex items-center gap-1.5 shrink-0">
                  <Calendar className="w-4 h-4 text-np-accent" />
                  <span>Event date</span>
                </span>
                <span className="font-semibold text-np-text text-right">
                  {opportunity.start_date ? formatDate(opportunity.start_date) : "TBA"}
                  {opportunity.end_date && ` – ${formatDate(opportunity.end_date)}`}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <span className="text-np-muted flex items-center gap-1.5 shrink-0">
                  {opportunity.is_online ? (
                    <Globe className="w-4 h-4 text-np-online" />
                  ) : (
                    <MapPin className="w-4 h-4 text-np-faint" />
                  )}
                  <span>Location</span>
                </span>
                <span className="font-semibold text-np-text text-right">
                  {opportunity.is_online ? "Online / Virtual" : opportunity.venue || opportunity.city}
                </span>
              </div>

              {opportunity.contact_email && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-np-muted flex items-center gap-1.5 shrink-0">
                    <Mail className="w-4 h-4 text-np-faint" />
                    <span>Contact</span>
                  </span>
                  <a
                    href={`mailto:${opportunity.contact_email}`}
                    className="text-np-accent hover:text-[#7aadff] text-xs truncate"
                  >
                    {opportunity.contact_email}
                  </a>
                </div>
              )}

              <div className="flex items-start justify-between gap-3">
                <span className="text-np-muted flex items-center gap-1.5 shrink-0">
                  <Building2 className="w-4 h-4 text-np-faint" />
                  <span>Organizer</span>
                </span>
                <span className="font-semibold text-np-text text-right">
                  {opportunity.organization_name || "Official institution"}
                </span>
              </div>
            </div>

            {opportunity.tags.length > 0 && (
              <div className="pt-4 border-t border-np-border">
                <div className="text-sm font-semibold text-np-muted mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-np-accent" />
                  <span>Tags</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {opportunity.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/opportunities?q=${encodeURIComponent(tag)}`}
                      className="px-2.5 py-1 rounded-np bg-np-bg hover:bg-np-surface-2 border border-np-border text-xs text-np-muted transition-colors"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky apply */}
      {opportunity.registration_url && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-np-border bg-np-bg/95 backdrop-blur-md p-3">
          <a
            href={opportunity.registration_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full np-btn-primary py-3"
          >
            <span>Register / Apply</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}
