"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertTriangle,
  FileText,
  ImageIcon,
  Loader2,
  Save,
} from "lucide-react";
import {
  ReviewCorrection,
  approveVerificationItem,
  fetchCategories,
  fetchVerificationQueue,
  mediaUrl,
  rejectVerificationItem,
  saveVerificationItem,
  uploadVerificationFlyer,
} from "@/lib/api";
import { signalBusy } from "@/components/TopProgress";
import { WORD_LIMITS, overWordLimit, wordCount } from "@/components/admin/OpportunityEditor";
import { Category, Opportunity, VerificationItem } from "@/types";

type Draft = {
  title: string;
  summary: string;
  description: string;
  category_name: string;
  organization_name: string;
  city: string;
  venue: string;
  is_online: boolean;
  start_date: string;
  registration_deadline: string;
  registration_url: string;
  eligibility_summary: string;
  contact_email: string;
  flyer_url: string;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  summary: "",
  description: "",
  category_name: "",
  organization_name: "",
  city: "",
  venue: "",
  is_online: false,
  start_date: "",
  registration_deadline: "",
  registration_url: "",
  eligibility_summary: "",
  contact_email: "",
  flyer_url: "",
};

function shown(value?: string | null) {
  const text = (value || "").trim();
  return text || null;
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function draftFrom(item: VerificationItem): Draft {
  const opp = item.opportunity;
  return {
    title: opp.title || "",
    summary: opp.summary || "",
    description: opp.description || "",
    category_name: opp.category_name || "",
    organization_name: opp.organization_name || "",
    city: opp.city || "",
    venue: opp.venue || "",
    is_online: Boolean(opp.is_online),
    start_date: toDateInput(opp.start_date),
    registration_deadline: toDateInput(opp.registration_deadline),
    registration_url: opp.registration_url || opp.application_url || "",
    eligibility_summary: opp.eligibility_summary || "",
    contact_email: opp.contact_email || "",
    flyer_url: opp.flyer_url || "",
  };
}

function correctionsFrom(draft: Draft): ReviewCorrection {
  return {
    title: draft.title,
    summary: draft.summary,
    description: draft.description,
    category_name: draft.category_name,
    organization_name: draft.organization_name,
    city: draft.city,
    venue: draft.venue,
    is_online: draft.is_online,
    start_date: draft.start_date,
    registration_deadline: draft.registration_deadline,
    registration_url: draft.registration_url,
    eligibility_summary: draft.eligibility_summary,
    contact_email: draft.contact_email,
  };
}

function titleIsReal(title: string) {
  const text = title.trim();
  return text.length >= 8 && !/notice board|untitled/i.test(text) && !overWordLimit("title", text);
}

function draftIsReady(draft: Draft) {
  const hasCore = Boolean(draft.registration_deadline) || Boolean(draft.registration_url.trim());
  const withinWords =
    !overWordLimit("title", draft.title) &&
    !overWordLimit("summary", draft.summary) &&
    !overWordLimit("description", draft.description) &&
    !overWordLimit("eligibility_summary", draft.eligibility_summary);
  return titleIsReal(draft.title) && hasCore && withinWords;
}

function mergeOpportunity(item: VerificationItem, saved?: Partial<Opportunity>): VerificationItem {
  if (!saved) return item;
  return { ...item, opportunity: { ...item.opportunity, ...saved } };
}

function textFromSaved(saved: Partial<Opportunity>, key: keyof Opportunity, fallback: string) {
  if (!(key in saved)) return fallback;
  const value = saved[key];
  return value == null ? "" : String(value);
}

function overlayDraft(base: Draft, saved?: Partial<Opportunity>, flyerUrl?: string): Draft {
  if (!saved) return { ...base, flyer_url: flyerUrl || base.flyer_url };
  return {
    title: textFromSaved(saved, "title", base.title),
    summary: textFromSaved(saved, "summary", base.summary),
    description: textFromSaved(saved, "description", base.description),
    category_name: textFromSaved(saved, "category_name", base.category_name),
    organization_name: textFromSaved(saved, "organization_name", base.organization_name),
    city: textFromSaved(saved, "city", base.city),
    venue: textFromSaved(saved, "venue", base.venue),
    is_online: "is_online" in saved ? Boolean(saved.is_online) : base.is_online,
    start_date: "start_date" in saved ? toDateInput(saved.start_date) : base.start_date,
    registration_deadline: "registration_deadline" in saved ? toDateInput(saved.registration_deadline) : base.registration_deadline,
    registration_url: textFromSaved(saved, "registration_url", base.registration_url),
    eligibility_summary: textFromSaved(saved, "eligibility_summary", base.eligibility_summary),
    contact_email: textFromSaved(saved, "contact_email", base.contact_email),
    flyer_url: flyerUrl || textFromSaved(saved, "flyer_url", base.flyer_url),
  };
}

const inputClass = (flagged: boolean) =>
  `w-full rounded-xl border px-3 py-2.5 text-xs text-slate-100 outline-none focus:border-indigo-400 ${
    flagged
      ? "border-amber-500/50 bg-amber-500/10"
      : "border-slate-800 bg-slate-950"
  }`;

function Label({
  text,
  missing,
  words,
  limit,
}: {
  text: string;
  missing?: boolean;
  words?: number;
  limit?: number;
}) {
  const over = limit != null && words != null && words > limit;
  return (
    <div className="mb-1 flex items-center justify-between gap-2">
      <span className="text-[11px] font-semibold text-slate-400">{text}</span>
      <div className="flex items-center gap-2">
        {limit != null && words != null && (
          <span className={`text-[10px] font-mono ${over ? "text-amber-300 font-semibold" : "text-slate-500"}`}>
            {words}/{limit} words
          </span>
        )}
        {missing && <span className="text-[10px] font-semibold text-amber-300">Missing</span>}
        {over && <span className="text-[10px] font-semibold text-amber-300">Too long</span>}
      </div>
    </div>
  );
}

export default function VerificationReviewPage() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [baseline, setBaseline] = useState("");
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
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
    fetchCategories().then(setCategories);
  }, []);

  const current = items[selectedIdx];
  const queueId = current?.queue_id;

  useEffect(() => {
    if (!queueId) return;
    const item = items.find((entry) => entry.queue_id === queueId);
    if (!item) return;
    const next = draftFrom(item);
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setFieldErrors([]);
    // Reload the form only when the selected queue item changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueId]);

  const dirty = baseline !== "" && JSON.stringify(draft) !== baseline;
  const ready = draftIsReady(draft);
  const confidence = current?.opportunity.ai_confidence == null
    ? null
    : Math.round(current.opportunity.ai_confidence * 100);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const categoryOptions = useMemo(() => {
    const names = categories.map((category) => category.name);
    if (draft.category_name && !names.includes(draft.category_name)) {
      return [draft.category_name, ...names];
    }
    return names;
  }, [categories, draft.category_name]);

  const flagged = (name: string) => fieldErrors.includes(name);

  const selectIndex = (index: number) => {
    if (index === selectedIdx || index < 0 || index >= items.length) return;
    if (dirty && !window.confirm("Details on this item are not saved yet. Switch anyway?")) return;
    setSelectedIdx(index);
  };

  const patchDraft = (patch: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const applySaved = (queueItemId: string, saved?: Partial<Opportunity>, flyerUrl?: string) => {
    const patch = {
      ...saved,
      ...(flyerUrl ? { flyer_url: flyerUrl } : {}),
    };
    setItems((prev) => prev.map((item) => (
      item.queue_id === queueItemId ? mergeOpportunity(item, patch) : item
    )));
    if (queueItemId !== queueId) return;
    if (flyerUrl && !saved) {
      setDraft((prev) => ({ ...prev, flyer_url: flyerUrl }));
      setBaseline((prev) => {
        if (!prev) return prev;
        const parsed = JSON.parse(prev) as Draft;
        parsed.flyer_url = flyerUrl;
        return JSON.stringify(parsed);
      });
      return;
    }
    const next = overlayDraft(draft, saved, flyerUrl);
    setDraft(next);
    setBaseline(JSON.stringify(next));
  };

  const handleSave = async () => {
    if (!current || busyAction) return;
    setBusyAction("save");
    signalBusy(true, "Saving details");
    const result = await saveVerificationItem(current.queue_id, correctionsFrom(draft));
    signalBusy(false);
    setBusyAction(null);
    if (!result.success) {
      setNoticeTone("error");
      setActionNotice(result.error || "Save failed. The item is still in the queue.");
      setFieldErrors(result.fields || []);
      if (result.opportunity) applySaved(current.queue_id, result.opportunity);
      return;
    }
    applySaved(current.queue_id, result.opportunity);
    setFieldErrors([]);
    setNoticeTone("ok");
    setActionNotice("Details saved. The item is still waiting for publish.");
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleFlyer = async (file: File | null) => {
    if (!current || !file || busyAction) return;
    setBusyAction("flyer");
    signalBusy(true, "Uploading image");
    const result = await uploadVerificationFlyer(current.queue_id, file);
    signalBusy(false);
    setBusyAction(null);
    if (!result.success || !result.flyer_url) {
      setNoticeTone("error");
      setActionNotice(result.error || "Image upload failed.");
      setFieldErrors(result.fields || ["flyer"]);
      return;
    }
    applySaved(current.queue_id, undefined, result.flyer_url);
    setFieldErrors((prev) => prev.filter((name) => name !== "flyer"));
    setNoticeTone("ok");
    setActionNotice("Image added.");
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleAction = async (action: "approve" | "reject") => {
    if (!current || busyAction) return;
    const qId = current.queue_id;
    setBusyAction(action);
    signalBusy(true, action === "approve" ? "Publishing" : "Rejecting");
    if (action === "reject") {
      const result = await rejectVerificationItem(qId, current.reason);
      signalBusy(false);
      setBusyAction(null);
      if (!result.success) {
        setNoticeTone("error");
        setActionNotice("Reject failed. The item is still in the queue.");
        return;
      }
    } else {
      const result = await approveVerificationItem(qId, correctionsFrom(draft));
      signalBusy(false);
      setBusyAction(null);
      if (!result.success) {
        setNoticeTone("error");
        setActionNotice(result.error || "Publish failed. The item is still in the queue.");
        setFieldErrors(result.fields || []);
        if (result.opportunity) applySaved(qId, result.opportunity);
        return;
      }
    }

    setNoticeTone("ok");
    setActionNotice(action === "approve" ? "Published." : "Rejected.");
    setFieldErrors([]);
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

  const raw = current.source_evidence;
  const sourceText = shown(raw.body_raw) || shown(raw.title_raw) || "No source text was saved.";
  const preview = mediaUrl(draft.flyer_url);
  const titleMissing = !draft.title.trim() || draft.title.trim().length < 8 || /notice board|untitled/i.test(draft.title);
  const coreMissing = !draft.registration_deadline && !draft.registration_url.trim();

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Verification queue</h1>
          <p className="text-xs text-slate-400 mt-1">
            {items.length} waiting. Fill the real title and a deadline or apply link, then publish.
          </p>
        </div>
        <div className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
          ready ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-200"
        }`}>
          {ready ? "Ready to publish" : "Fill missing details"}
          {dirty ? " · Unsaved" : ""}
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
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 max-h-[820px] overflow-y-auto">
          {items.map((item, index) => {
            const active = index === selectedIdx;
            const rowDraft = active ? draft : draftFrom(item);
            const rowReady = draftIsReady(rowDraft);
            const rowConfidence = item.opportunity.ai_confidence == null
              ? null
              : Math.round(item.opportunity.ai_confidence * 100);
            return (
              <button
                key={item.queue_id}
                onClick={() => selectIndex(index)}
                className={`w-full text-left px-3 py-3 border-b border-slate-800/80 ${
                  active ? "bg-indigo-500/15" : "hover:bg-slate-800/50"
                }`}
              >
                <div className="text-xs font-semibold text-white line-clamp-2">{rowDraft.title.trim() || "Untitled"}</div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{rowConfidence == null ? "No score" : `${rowConfidence}%`}</span>
                  <span className={rowReady ? "text-emerald-300" : "text-amber-300"}>
                    {rowReady ? "Complete" : "Incomplete"}
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
              <p className="text-[10px] text-slate-500">Source text stays as crawled. Edits go on the event, then you publish.</p>

              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-300 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    Event image
                  </h3>
                  {flagged("flyer") && <span className="text-[10px] font-semibold text-amber-300">Check image</span>}
                </div>
                {preview ? (
                  <img src={preview} alt="" className="max-h-48 w-full rounded-xl border border-slate-800 object-contain bg-slate-950" />
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950 px-3 py-8 text-center text-[11px] text-slate-500">
                    No image yet. Add a poster or photo for this event.
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] font-semibold text-slate-200">
                  {busyAction === "flyer" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                  {busyAction === "flyer" ? "Uploading…" : preview ? "Replace image" : "Add image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={Boolean(busyAction)}
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      event.target.value = "";
                      handleFlyer(file);
                    }}
                  />
                </label>
                <p className="text-[10px] text-slate-500">JPEG, PNG, or WebP, up to 5 MB. The image is stored as soon as you choose it.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-300">Event details</h2>
                <span className="text-[11px] font-mono text-slate-300">
                  {confidence == null ? "Confidence unknown" : `${confidence}% confidence`}
                </span>
              </div>

              <div>
                <Label
                  text="Title"
                  missing={titleMissing}
                  words={wordCount(draft.title)}
                  limit={WORD_LIMITS.title}
                />
                <input
                  value={draft.title}
                  onChange={(event) => patchDraft({ title: event.target.value })}
                  className={inputClass(titleMissing || flagged("title") || overWordLimit("title", draft.title))}
                />
              </div>
              <div>
                <Label
                  text="Summary"
                  missing={!draft.summary.trim()}
                  words={wordCount(draft.summary)}
                  limit={WORD_LIMITS.summary}
                />
                <textarea
                  value={draft.summary}
                  rows={2}
                  onChange={(event) => patchDraft({ summary: event.target.value })}
                  className={inputClass(flagged("summary") || overWordLimit("summary", draft.summary))}
                />
              </div>
              <div>
                <Label
                  text="Description"
                  missing={!draft.description.trim()}
                  words={wordCount(draft.description)}
                  limit={WORD_LIMITS.description}
                />
                <textarea
                  value={draft.description}
                  rows={4}
                  onChange={(event) => patchDraft({ description: event.target.value })}
                  className={inputClass(flagged("description") || overWordLimit("description", draft.description))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label text="Category" missing={!draft.category_name} />
                  <select
                    value={draft.category_name}
                    onChange={(event) => patchDraft({ category_name: event.target.value })}
                    className={inputClass(flagged("category_name"))}
                  >
                    <option value="">Not set</option>
                    {categoryOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label text="Organization" missing={!draft.organization_name.trim()} />
                  <input
                    value={draft.organization_name}
                    onChange={(event) => patchDraft({ organization_name: event.target.value })}
                    className={inputClass(flagged("organization_name"))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label text="Deadline" missing={coreMissing} />
                  <input
                    type="date"
                    value={draft.registration_deadline}
                    onChange={(event) => patchDraft({ registration_deadline: event.target.value })}
                    className={`${inputClass(coreMissing || flagged("registration_deadline"))} [color-scheme:dark]`}
                  />
                </div>
                <div>
                  <Label text="Starts" missing={!draft.start_date} />
                  <input
                    type="date"
                    value={draft.start_date}
                    onChange={(event) => patchDraft({ start_date: event.target.value })}
                    className={`${inputClass(flagged("start_date"))} [color-scheme:dark]`}
                  />
                </div>
              </div>
              <div>
                <Label text="Apply link" missing={coreMissing} />
                <input
                  value={draft.registration_url}
                  placeholder="https://"
                  onChange={(event) => patchDraft({ registration_url: event.target.value })}
                  className={inputClass(coreMissing || flagged("registration_url"))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label text="City" missing={!draft.city.trim()} />
                  <input
                    value={draft.city}
                    onChange={(event) => patchDraft({ city: event.target.value })}
                    className={inputClass(flagged("city"))}
                  />
                </div>
                <div>
                  <Label text="Venue" missing={!draft.venue.trim() && !draft.is_online} />
                  <input
                    value={draft.venue}
                    onChange={(event) => patchDraft({ venue: event.target.value })}
                    className={inputClass(flagged("venue"))}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-slate-300">
                <input
                  type="checkbox"
                  checked={draft.is_online}
                  onChange={(event) => patchDraft({ is_online: event.target.checked })}
                  className="accent-indigo-500"
                />
                Online event
              </label>
              <div>
                <Label
                  text="Eligibility"
                  missing={!draft.eligibility_summary.trim()}
                  words={wordCount(draft.eligibility_summary)}
                  limit={WORD_LIMITS.eligibility_summary}
                />
                <textarea
                  value={draft.eligibility_summary}
                  rows={2}
                  onChange={(event) => patchDraft({ eligibility_summary: event.target.value })}
                  className={inputClass(flagged("eligibility_summary") || overWordLimit("eligibility_summary", draft.eligibility_summary))}
                />
              </div>
              <div>
                <Label text="Contact email" missing={!draft.contact_email.trim()} />
                <input
                  type="email"
                  value={draft.contact_email}
                  onChange={(event) => patchDraft({ contact_email: event.target.value })}
                  className={inputClass(flagged("contact_email"))}
                />
              </div>
            </section>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-400">
              Item {selectedIdx + 1} of {items.length}
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  disabled={selectedIdx === 0}
                  onClick={() => selectIndex(selectedIdx - 1)}
                  className="text-[11px] text-slate-300 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={selectedIdx >= items.length - 1}
                  onClick={() => selectIndex(selectedIdx + 1)}
                  className="text-[11px] text-slate-300 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={Boolean(busyAction) || !dirty}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-100 disabled:opacity-60"
              >
                {busyAction === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {busyAction === "save" ? "Saving…" : "Save details"}
              </button>
              <button
                type="button"
                onClick={() => handleAction("reject")}
                disabled={Boolean(busyAction)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/70 px-4 py-2 text-xs font-semibold text-rose-100 disabled:opacity-60"
              >
                {busyAction === "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                {busyAction === "reject" ? "Rejecting…" : "Reject"}
              </button>
              <button
                type="button"
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
