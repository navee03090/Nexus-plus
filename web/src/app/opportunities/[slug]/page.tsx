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
  AlertTriangle, 
  Building2, 
  Mail, 
  Phone, 
  Tag, 
  History, 
  Layers, 
  Share2, 
  Bookmark, 
  Sparkles,
  ArrowLeft,
  FileText
} from "lucide-react";
import { fetchOpportunityBySlug } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { VerificationBadge } from "@/components/VerificationBadge";
import { CalendarButton } from "@/components/CalendarButton";
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
      {/* Back to Directory Link */}
      <div className="mb-6">
        <Link
          href="/opportunities"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Opportunities</span>
        </Link>
      </div>

      {/* Main Grid: Left Content (2 cols on lg) vs Right Sidebar (1 col on lg) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-600/90 text-white">
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

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
              {opportunity.title}
            </h1>

            {/* Organizer metadata row */}
            <div className="flex items-center gap-3 pt-2 text-xs text-slate-300">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200">
                {opportunity.organization_name ? opportunity.organization_name.charAt(0) : "O"}
              </div>
              <div>
                <div className="font-semibold text-slate-100">
                  {opportunity.organization_name || "Official Institution"}
                </div>
                <div className="text-slate-400 text-[11px]">
                  {opportunity.city}, {opportunity.country}
                </div>
              </div>
            </div>
          </div>

          {/* Flyer Image Preview if present */}
          {opportunity.flyer_url && (
            <div className="rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl">
              <img
                src={opportunity.flyer_url}
                alt={`${opportunity.title} Flyer`}
                className="w-full max-h-[500px] object-contain bg-slate-950 p-2"
              />
              <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Official announcement flyer extracted with zero-hallucination OCR</span>
                </span>
                <a
                  href={opportunity.flyer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <span>View Original Flyer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Detailed Description */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-white tracking-tight">About This Opportunity</h2>
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line space-y-4">
              {opportunity.description || opportunity.summary}
            </div>
          </div>

          {/* Eligibility & Target Audience */}
          {(opportunity.eligibility_summary || opportunity.target_audience.length > 0) && (
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <span>Eligibility & Target Audience</span>
              </h2>

              {opportunity.eligibility_summary && (
                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-900/40 text-xs sm:text-sm text-indigo-200">
                  <span className="font-semibold text-white block mb-1">Eligibility Criteria:</span>
                  {opportunity.eligibility_summary}
                </div>
              )}

              {opportunity.target_audience.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-300 block mb-2">
                    Who should apply:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {opportunity.target_audience.map((aud, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium"
                      >
                        {aud}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Multi-Source Provenance Panel */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>Multi-Source Provenance & Evidence</span>
              </h2>
              <span className="text-[11px] text-emerald-400 font-mono">
                {sources.length} Verified Sources
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              In accordance with Nexus Pulse core architecture, original sources remain the immutable source of truth. The following announcements were ingested, cross-verified, and canonicalized for this event:
            </p>

            <div className="space-y-3">
              {sources.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                  Ingested from official portal registry.
                </div>
              ) : (
                sources.map((src) => (
                  <div
                    key={src.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">
                          {src.source_name || "Official Announcement"}
                        </span>
                        {src.is_primary_source && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Primary Source
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                          {src.platform}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-1 truncate max-w-md">
                        {src.canonical_url}
                      </div>
                    </div>

                    <a
                      href={src.canonical_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors shrink-0"
                    >
                      <span>View Source</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))
              )}
            </div>

            {opportunity.provenance_reasons && opportunity.provenance_reasons.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-semibold text-slate-300 mb-2">Audit Rationale:</div>
                <ul className="space-y-1 text-xs text-slate-400">
                  {opportunity.provenance_reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Change History Log (Deadline extensions, Venue updates) */}
          {changes.length > 0 && (
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>Detected Updates & Change History</span>
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Nexus Pulse automatically audits announcements for deadline extensions, venue changes, or postponements:
              </p>
              <div className="space-y-3">
                {changes.map((chg) => (
                  <div
                    key={chg.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-amber-500/20 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-300 uppercase tracking-wider text-[11px]">
                        {chg.change_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(chg.detected_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-300">
                      Field: <strong className="text-white font-mono">{chg.field_name}</strong>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-[11px] font-mono">
                      {chg.old_value && (
                        <div className="p-2 rounded bg-slate-900 text-rose-300 border border-rose-900/40">
                          Previous: {chg.old_value}
                        </div>
                      )}
                      {chg.new_value && (
                        <div className="p-2 rounded bg-slate-900 text-emerald-300 border border-emerald-900/40">
                          Updated: {chg.new_value}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Action Box */}
        <div className="space-y-6">
          <div className="sticky top-24 p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md space-y-6">
            {/* Primary Action Button */}
            {opportunity.registration_url ? (
              <a
                href={opportunity.registration_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-transform active:scale-[0.98]"
              >
                <span>Register / Apply Now</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <div className="w-full py-3.5 px-4 rounded-2xl bg-slate-800 text-slate-400 text-xs text-center font-medium">
                Registration details inside official announcement
              </div>
            )}

            {/* Quick Actions (Save, Share, Report, Calendar) */}
            <OpportunityActionButtons opportunity={opportunity} />

            {/* Event Key Facts Table */}
            <div className="pt-4 border-t border-slate-800 space-y-3.5 text-xs">
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                  <Clock className="w-4 h-4 text-rose-400" />
                  <span>Deadline:</span>
                </span>
                <span className="font-semibold text-slate-200 text-right">
                  {opportunity.registration_deadline
                    ? formatDate(opportunity.registration_deadline)
                    : "Not specified"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>Event Date:</span>
                </span>
                <span className="font-semibold text-slate-200 text-right">
                  {opportunity.start_date ? formatDate(opportunity.start_date) : "TBA"}
                  {opportunity.end_date && ` - ${formatDate(opportunity.end_date)}`}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                  {opportunity.is_online ? (
                    <Globe className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <MapPin className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Location:</span>
                </span>
                <span className="font-semibold text-slate-200 text-right">
                  {opportunity.is_online ? "Online / Virtual" : opportunity.venue || opportunity.city}
                </span>
              </div>

              {opportunity.contact_email && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>Contact:</span>
                  </span>
                  <a
                    href={`mailto:${opportunity.contact_email}`}
                    className="text-indigo-400 hover:text-indigo-300 font-mono text-[11px] truncate"
                  >
                    {opportunity.contact_email}
                  </a>
                </div>
              )}
            </div>

            {/* Tags section */}
            {opportunity.tags.length > 0 && (
              <div className="pt-4 border-t border-slate-800">
                <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Tags:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {opportunity.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/opportunities?q=${encodeURIComponent(tag)}`}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition-colors"
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
    </div>
  );
}
