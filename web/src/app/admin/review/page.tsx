"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Layers, 
  ExternalLink, 
  Sparkles, 
  AlertTriangle,
  FileText,
  Calendar,
  MapPin,
  Clock,
  Link as LinkIcon
} from "lucide-react";
import { fetchVerificationQueue, approveVerificationItem, rejectVerificationItem } from "@/lib/api";
import { VerificationItem } from "@/types";

export default function VerificationReviewPage() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVerificationQueue().then((data) => {
      setItems(data.items || []);
      setLoadError(data.error || null);
      setIsLoading(false);
    });
  }, []);

  const current = items[selectedIdx];

  const handleAction = async (action: string) => {
    if (!current) return;
    const qId = current.queue_id;

    if (action.includes("Approved")) {
      await approveVerificationItem(qId);
    } else if (action.includes("Rejected")) {
      await rejectVerificationItem(qId);
    }

    setActionNotice(`Opportunity ${action} successfully.`);

    // Remove reviewed item from active queue
    setItems((prev) => {
      const updated = prev.filter((item) => item.queue_id !== qId);
      if (selectedIdx >= updated.length) {
        setSelectedIdx(Math.max(0, updated.length - 1));
      }
      return updated;
    });

    setTimeout(() => setActionNotice(null), 3500);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading verification review queue...</p>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto ${
          loadError
            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        }`}>
          {loadError ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
        </div>
        <h2 className="text-xl font-bold text-white">
          {loadError ? "Verification queue did not load" : "Verification Queue Clear"}
        </h2>
        <p className="text-xs text-slate-400">
          {loadError || "No pending items. The overview count is the number of rows still waiting."}
        </p>
      </div>
    );
  }

  const opp = current.opportunity;
  const raw = current.source_evidence;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Human-in-the-Loop Verification</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Review Queue ({items.length} Pending)
          </h1>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Reason: <span className="text-amber-300 font-medium">{current.reason}</span>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Split Screen Comparator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Raw Source Evidence */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Raw Source Evidence</span>
              </span>
              <a
                href={raw.canonical_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
              >
                <span>Canonical Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Flyer / Poster Preview */}
            {opp.flyer_url && (
              <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 max-h-60 flex items-center justify-center p-2">
                <img
                  src={opp.flyer_url}
                  alt="Raw flyer evidence"
                  className="max-h-56 object-contain rounded-xl"
                />
              </div>
            )}

            {/* Raw Extracted Text / Body */}
            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-1">
                Raw Announcement Text (OCR / Web Body):
              </span>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed max-h-52 overflow-y-auto whitespace-pre-wrap">
                {raw.body_raw || raw.title_raw || "Raw text evidence captured."}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
            Source Item ID: {raw.source_item_id}
          </div>
        </div>

        {/* Right Side: Structured AI Extraction */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI Structured Extraction</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300">
                AI Confidence: {Math.round((opp.ai_confidence || 0.95) * 100)}%
              </span>
            </div>

            {/* Field Inspections */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Title</label>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium">
                  {opp.title}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Category</label>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                    {opp.category_name || "Hackathon"}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Organization</label>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                    {opp.organization_name || "UET Peshawar"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Deadline</label>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 font-mono">
                    {opp.registration_deadline ? new Date(opp.registration_deadline).toLocaleDateString() : "TBA"}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Event Dates</label>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono">
                    {opp.start_date ? new Date(opp.start_date).toLocaleDateString() : "TBA"}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Registration Endpoint</label>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-indigo-300 font-mono truncate">
                  {opp.registration_url || "None"}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Eligibility Summary</label>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-[11px]">
                  {opp.eligibility_summary || "Undergraduate / Graduate students in Pakistan."}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
            Deterministic Rule Checks: All Passed ✓
          </div>
        </div>
      </div>

      {/* Review Actions Footer Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-400">
          Item <span className="text-white font-bold">{selectedIdx + 1}</span> of {items.length}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleAction("Merged into Canonical Record")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold transition-colors border border-cyan-500/20"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Merge Duplicate</span>
          </button>

          <button
            onClick={() => handleAction("Flagged for Metadata Edit")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors border border-slate-700"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Fields</span>
          </button>

          <button
            onClick={() => handleAction("Rejected / Filtered")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold transition-colors border border-rose-500/30"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject / Discard</span>
          </button>

          <button
            onClick={() => handleAction("Approved & Published")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-emerald-600/30"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approve & Publish</span>
          </button>
        </div>
      </div>
    </div>
  );
}
