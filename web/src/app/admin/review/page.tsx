"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertTriangle,
  FileText,
  Loader2,
} from "lucide-react";
import { fetchVerificationQueue, approveVerificationItem, rejectVerificationItem } from "@/lib/api";
import { signalBusy } from "@/components/TopProgress";
import { VerificationItem } from "@/types";

function shown(value?: string | null) {
  const text = (value || "").trim();
  return text || null;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function reviewFacts(item: VerificationItem) {
  const opp = item.opportunity;
  const title = shown(opp.title);
  const deadline = formatDate(opp.registration_deadline);
  const start = formatDate(opp.start_date);
  const url = shown(opp.registration_url) || shown(opp.application_url);
  const confidence = opp.ai_confidence == null ? null : Math.round(opp.ai_confidence * 100);
  const weakTitle = !title || title.length < 8 || /notice board|untitled/i.test(title);
  const missingCore = !deadline && !url;
  const lowConfidence = confidence != null && confidence < 70;
  const ready = !weakTitle && !missingCore && !lowConfidence;
  return { title, deadline, start, url, confidence, weakTitle, missingCore, lowConfidence, ready };
}

function Field({ label, value, missing }: { label: string; value?: string | null; missing?: boolean }) {
  const empty = !value;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-400">{label}</span>
        {empty && <span className="text-[10px] font-semibold text-amber-300">Missing</span>}
      </div>
      <div className={`rounded-xl border px-3 py-2.5 text-xs ${
        empty || missing
          ? "border-amber-500/30 bg-amber-500/5 text-amber-100"
          : "border-slate-800 bg-slate-950 text-slate-100"
      }`}>
        {value || "Not extracted"}
      </div>
    </div>
  );
}

export default function VerificationReviewPage() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"ok" | "error">("ok");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    fetchVerificationQueue().then((data) => {
      setItems(data.items || []);
      setLoadError(data.error || null);
      setIsLoading(false);
    });
  }, []);

  const current = items[selectedIdx];

  const handleAction = async (action: "approve" | "reject") => {
    if (!current || busyAction) return;
    const qId = current.queue_id;
    setBusyAction(action);
    signalBusy(true, action === "approve" ? "Publishing" : "Rejecting");
    const result = action === "approve"
      ? await approveVerificationItem(qId)
      : await rejectVerificationItem(qId, current.reason);
    signalBusy(false);
    setBusyAction(null);

    if (!result.success) {
      setNoticeTone("error");
      setActionNotice(action === "approve" ? "Publish failed. The item is still in the queue." : "Reject failed. The item is still in the queue.");
      return;
    }

    setNoticeTone("ok");
    setActionNotice(action === "approve" ? "Published." : "Rejected.");
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
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
        <p className="text-xs text-slate-400">Loading verification queue…</p>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto ${
          loadError ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        }`}>
          {loadError ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
        </div>
        <h2 className="text-xl font-bold text-white">{loadError ? "Verification queue did not load" : "Verification queue is clear"}</h2>
        <p className="text-xs text-slate-400">{loadError || "Nothing is waiting for a decision."}</p>
      </div>
    );
  }

  const facts = reviewFacts(current);
  const opp = current.opportunity;
  const raw = current.source_evidence;
  const sourceText = shown(raw.body_raw) || shown(raw.title_raw) || "No source text was saved.";

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Verification queue</h1>
          <p className="text-xs text-slate-400 mt-1">{items.length} waiting. Publish only when the title and a deadline or apply link are real.</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
          facts.ready ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-200"
        }`}>
          {facts.ready ? "Ready to publish" : "Needs a decision — likely reject"}
        </div>
      </div>

      {actionNotice && (
        <div className={`rounded-2xl border px-4 py-3 text-xs ${
          noticeTone === "error"
            ? "border-rose-500/40 bg-rose-950/50 text-rose-200"
            : "border-emerald-500/40 bg-emerald-950/50 text-emerald-200"
        }`}>
          {actionNotice}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 max-h-[640px] overflow-y-auto">
          {items.map((item, index) => {
            const row = reviewFacts(item);
            const active = index === selectedIdx;
            return (
              <button
                key={item.queue_id}
                onClick={() => setSelectedIdx(index)}
                className={`w-full text-left px-3 py-3 border-b border-slate-800/80 ${
                  active ? "bg-indigo-500/15" : "hover:bg-slate-800/50"
                }`}
              >
                <div className="text-xs font-semibold text-white line-clamp-2">{row.title || "Untitled"}</div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{row.confidence == null ? "No score" : `${row.confidence}%`}</span>
                  <span className={row.ready ? "text-emerald-300" : "text-amber-300"}>
                    {row.ready ? "Complete" : "Incomplete"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-200">Why it is here</div>
            <p className="mt-1 text-sm text-amber-50">{current.reason || "Needs a human check."}</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Source text
                </h2>
                {raw.canonical_url && (
                  <a href={raw.canonical_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-300 inline-flex items-center gap-1">
                    Open source <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
                {sourceText}
              </div>
              <p className="text-[10px] text-slate-500">If this is only a menu label or a page heading, reject it.</p>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-300">Extracted fields</h2>
                <span className="text-[11px] font-mono text-slate-300">
                  {facts.confidence == null ? "Confidence unknown" : `${facts.confidence}% confidence`}
                </span>
              </div>
              <Field label="Title" value={facts.title} missing={facts.weakTitle} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category" value={shown(opp.category_name)} />
                <Field label="Organization" value={shown(opp.organization_name)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Deadline" value={facts.deadline} missing={!facts.deadline} />
                <Field label="Starts" value={facts.start} />
              </div>
              <Field label="Apply link" value={facts.url} missing={!facts.url} />
              <Field label="Eligibility" value={shown(opp.eligibility_summary)} />
              <Field label="City" value={shown(opp.city)} />
            </section>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-400">
              Item {selectedIdx + 1} of {items.length}
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  disabled={selectedIdx === 0}
                  onClick={() => setSelectedIdx((index) => Math.max(0, index - 1))}
                  className="text-[11px] text-slate-300 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={selectedIdx >= items.length - 1}
                  onClick={() => setSelectedIdx((index) => Math.min(items.length - 1, index + 1))}
                  className="text-[11px] text-slate-300 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleAction("reject")}
                disabled={Boolean(busyAction)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/70 px-4 py-2 text-xs font-semibold text-rose-100 disabled:opacity-60"
              >
                {busyAction === "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                {busyAction === "reject" ? "Rejecting…" : "Reject"}
              </button>
              <button
                onClick={() => handleAction("approve")}
                disabled={Boolean(busyAction)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {busyAction === "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {busyAction === "approve" ? "Publishing…" : "Approve & publish"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
