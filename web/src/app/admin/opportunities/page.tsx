"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Save,
  Search,
  Sparkles,
  Star,
  Trash2,
  EyeOff,
  Clock3,
  UploadCloud,
} from "lucide-react";
import {
  expireAdminOpportunity,
  fetchAdminOpportunities,
  fetchCategories,
  publishAdminOpportunity,
  rejectAdminOpportunity,
  saveAdminOpportunity,
  unpublishAdminOpportunity,
  uploadAdminOpportunityFlyer,
} from "@/lib/api";
import { signalBusy } from "@/components/TopProgress";
import {
  EMPTY_OPPORTUNITY_DRAFT,
  OpportunityDraft,
  OpportunityEditor,
  correctionsFromDraft,
  draftIsReady,
  toDateInput,
} from "@/components/admin/OpportunityEditor";
import { Category, Opportunity } from "@/types";

type StatusFilter = "live" | "unpublished" | "rejected" | "expired" | "all";

function draftFromOpp(opp: Opportunity): OpportunityDraft {
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
    featured: Boolean(opp.featured),
    admin_note: "",
  };
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function statusTone(status?: string) {
  if (status === "published" || status === "updated") return "text-np-verify bg-np-verify/15";
  if (status === "pending_review") return "text-np-warn bg-np-warn/15";
  if (status === "rejected") return "text-np-danger bg-rose-500/15";
  if (status === "expired") return "text-np-muted bg-np-surface-2";
  return "text-np-muted bg-np-surface-2";
}

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "unpublished", label: "Unpublished" },
  { id: "expired", label: "Expired" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

export default function AdminOpportunitiesPage() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [liveCount, setLiveCount] = useState(0);
  const [status, setStatus] = useState<StatusFilter>("live");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<OpportunityDraft>(EMPTY_OPPORTUNITY_DRAFT);
  const [baseline, setBaseline] = useState("");
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"ok" | "error">("ok");

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId]
  );
  const dirty = baseline !== "" && JSON.stringify(draft) !== baseline;

  const showNotice = (message: string, tone: "ok" | "error" = "ok") => {
    setNoticeTone(tone);
    setNotice(message);
    setTimeout(() => setNotice(null), 3500);
  };

  const loadList = useCallback(async (keepId?: string | null) => {
    setIsLoading(true);
    const result = await fetchAdminOpportunities({
      q: query || undefined,
      status,
      category: category || undefined,
      sort: "published_at",
      limit: 50,
      offset: 0,
    });
    setItems(result.items);
    setTotal(result.total);
    setLiveCount(result.live_count);
    setLoadError(result.error || null);
    setIsLoading(false);

    const preferred = keepId && result.items.some((item) => item.id === keepId)
      ? keepId
      : result.items[0]?.id || null;
    setSelectedId(preferred);
    if (preferred) {
      const row = result.items.find((item) => item.id === preferred);
      if (row) {
        const next = draftFromOpp(row);
        setDraft(next);
        setBaseline(JSON.stringify(next));
        setFieldErrors([]);
      }
    } else {
      setDraft(EMPTY_OPPORTUNITY_DRAFT);
      setBaseline("");
    }
  }, [query, status, category]);

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    loadList(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadList]);

  const selectRow = (id: string) => {
    if (id === selectedId) return;
    if (dirty && !window.confirm("Details on this item are not saved yet. Switch anyway?")) return;
    const row = items.find((item) => item.id === id);
    if (!row) return;
    setSelectedId(id);
    const next = draftFromOpp(row);
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setFieldErrors([]);
  };

  const patchDraft = (patch: Partial<OpportunityDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const applySaved = (saved?: Partial<Opportunity>, flyerUrl?: string) => {
    if (!selectedId) return;
    setItems((prev) => prev.map((item) => {
      if (item.id !== selectedId) return item;
      return {
        ...item,
        ...saved,
        ...(flyerUrl ? { flyer_url: flyerUrl } : {}),
      };
    }));
    if (flyerUrl && !saved) {
      setDraft((prev) => ({ ...prev, flyer_url: flyerUrl }));
      setBaseline((prev) => {
        if (!prev) return prev;
        const parsed = JSON.parse(prev) as OpportunityDraft;
        parsed.flyer_url = flyerUrl;
        return JSON.stringify(parsed);
      });
      return;
    }
    const merged = {
      ...(selected || {}),
      ...saved,
      ...(flyerUrl ? { flyer_url: flyerUrl } : {}),
    } as Opportunity;
    const next = draftFromOpp(merged);
    next.admin_note = draft.admin_note;
    setDraft(next);
    setBaseline(JSON.stringify({ ...next, admin_note: "" }));
  };

  const handleSave = async () => {
    if (!selected || busyAction) return;
    setBusyAction("save");
    signalBusy(true, "Saving opportunity");
    const result = await saveAdminOpportunity(selected.id, correctionsFromDraft(draft));
    signalBusy(false);
    setBusyAction(null);
    if (!result.success) {
      showNotice(result.error || "Save failed.", "error");
      setFieldErrors(result.fields || []);
      if (result.opportunity) applySaved(result.opportunity);
      return;
    }
    applySaved(result.opportunity);
    setFieldErrors([]);
    showNotice("Saved. Public listing updated.");
    await loadList(selected.id);
  };

  const handleFlyer = async (file: File) => {
    if (!selected || busyAction) return;
    setBusyAction("flyer");
    signalBusy(true, "Uploading image");
    const result = await uploadAdminOpportunityFlyer(selected.id, file);
    signalBusy(false);
    setBusyAction(null);
    if (!result.success || !result.flyer_url) {
      showNotice(result.error || "Image upload failed.", "error");
      setFieldErrors(result.fields || ["flyer"]);
      return;
    }
    applySaved(undefined, result.flyer_url);
    setFieldErrors((prev) => prev.filter((name) => name !== "flyer"));
    showNotice("Image updated.");
  };

  const runStatusAction = async (
    action: "unpublish" | "reject" | "expire" | "publish" | "feature"
  ) => {
    if (!selected || busyAction) return;
    if (action === "reject" && !window.confirm("Soft-delete this opportunity? It will leave the public site.")) {
      return;
    }
    setBusyAction(action);
    signalBusy(true, action === "publish" ? "Publishing" : "Updating");

    let result;
    if (action === "unpublish") result = await unpublishAdminOpportunity(selected.id);
    else if (action === "reject") result = await rejectAdminOpportunity(selected.id, draft.admin_note || undefined);
    else if (action === "expire") result = await expireAdminOpportunity(selected.id);
    else if (action === "feature") {
      result = await saveAdminOpportunity(selected.id, {
        ...correctionsFromDraft(draft),
        featured: !draft.featured,
      });
    } else result = await publishAdminOpportunity(selected.id, correctionsFromDraft(draft));

    signalBusy(false);
    setBusyAction(null);

    if (!result.success) {
      showNotice(result.error || "Action failed.", "error");
      setFieldErrors(result.fields || []);
      if (result.opportunity) applySaved(result.opportunity);
      return;
    }

    setFieldErrors([]);
    showNotice(
      action === "unpublish" ? "Unpublished."
        : action === "reject" ? "Removed from public site."
        : action === "expire" ? "Marked expired."
        : action === "feature" ? (draft.featured ? "Removed from featured." : "Featured.")
        : "Published."
    );
    await loadList(selected.id);
  };

  const ready = draftIsReady(draft);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Published opportunities</h1>
          <p className="text-xs text-np-muted mt-1">
            {liveCount} live on the portal. Edit here and the public listing updates immediately.
          </p>
        </div>
        <div className="rounded-full px-3 py-1 text-[11px] font-semibold bg-np-accent/15 text-indigo-200">
          {total} in this view
        </div>
      </div>

      {notice && (
        <div className={`rounded-np-lg border px-4 py-3 text-xs ${
          noticeTone === "error"
            ? "border-np-danger/40 bg-np-danger/10 text-np-danger"
            : "border-np-verify/40 bg-emerald-950/50 text-np-verify"
        }`}>
          {notice}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatus(filter.id)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                status === filter.id
                  ? "bg-np-accent text-white"
                  : "bg-np-surface text-np-muted border border-np-border"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-np-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setQuery(searchInput.trim());
              }}
              placeholder="Search title, city, link…"
              className="w-full sm:w-64 rounded-xl border border-np-border bg-np-bg pl-9 pr-3 py-2 text-xs text-np-text outline-none focus:border-np-accent"
            />
          </div>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-xl border border-np-border bg-np-bg px-3 py-2 text-xs text-np-text outline-none focus:border-np-accent"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setQuery(searchInput.trim())}
            className="rounded-xl bg-np-surface-2 px-3 py-2 text-xs font-semibold text-np-text"
          >
            Search
          </button>
        </div>
      </div>

      {isLoading && items.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-np-accent mx-auto" />
          <p className="text-xs text-np-muted">Loading opportunities…</p>
        </div>
      ) : !selected ? (
        <div className="py-16 text-center space-y-3">
          <div className={`w-16 h-16 rounded-np-lg border flex items-center justify-center mx-auto ${
            loadError ? "bg-np-warn/10 text-np-warn border-np-warn/20" : "bg-np-verify/10 text-np-verify border-np-verify/20"
          }`}>
            {loadError ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>
          <h2 className="text-xl font-bold text-white">{loadError ? "Catalog did not load" : "No opportunities in this view"}</h2>
          <p className="text-xs text-np-muted">{loadError || "Try another filter or publish from the verification queue."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <div className="rounded-np-lg border border-np-border bg-np-surface max-h-[820px] overflow-y-auto">
            {items.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectRow(item.id)}
                  className={`w-full text-left px-3 py-3 border-b border-np-border ${
                    active ? "bg-np-accent/15" : "hover:bg-np-surface-2"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-semibold text-white line-clamp-2">{item.title || "Untitled"}</div>
                    {item.featured && <Star className="w-3.5 h-3.5 text-np-warn shrink-0" />}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-np-muted">
                    <span>{item.category_name || "Uncategorized"}</span>
                    <span className={`rounded-full px-1.5 py-0.5 ${statusTone(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-np-faint">
                    Deadline {formatDate(item.registration_deadline)}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            <div className="rounded-np-lg border border-np-border bg-np-surface px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-bold text-white">{draft.title || "Untitled"}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-np-muted">
                  <span className={`rounded-full px-2 py-0.5 ${statusTone(selected.status)}`}>{selected.status}</span>
                  <span>{selected.organization_name || "No organization"}</span>
                  <span>{selected.city || "No city"}</span>
                  {dirty && <span className="text-np-warn">Unsaved</span>}
                  {!ready && <span className="text-np-warn">Needs title + deadline or apply link</span>}
                </div>
              </div>
              {selected.slug && (
                <Link
                  href={`/opportunities/${selected.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-np-accent"
                >
                  Open on site <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            <section className="rounded-np-lg border border-np-border bg-np-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wide text-np-muted flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-np-accent" />
                  Edit opportunity
                </h2>
                <span className="text-[11px] text-np-muted">
                  Updated {formatDate(selected.updated_at)}
                </span>
              </div>
              <OpportunityEditor
                draft={draft}
                categories={categories}
                fieldErrors={fieldErrors}
                busy={busyAction === "flyer"}
                onChange={patchDraft}
                onFlyerSelected={handleFlyer}
              />
            </section>

            <div className="rounded-np-lg border border-np-border bg-np-surface px-4 py-3 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={Boolean(busyAction) || !dirty}
                className="inline-flex items-center gap-1.5 rounded-xl border border-np-border-strong bg-np-bg px-4 py-2 text-xs font-semibold text-np-text disabled:opacity-60"
              >
                {busyAction === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save details
              </button>
              <button
                type="button"
                onClick={() => runStatusAction("feature")}
                disabled={Boolean(busyAction)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-np-warn/30 bg-amber-950/40 px-4 py-2 text-xs font-semibold text-amber-100 disabled:opacity-60"
              >
                {busyAction === "feature" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                {draft.featured ? "Unfeature" : "Feature"}
              </button>
              {(selected.status === "pending_review" || selected.status === "updated" || selected.status === "expired") && (
                <button
                  type="button"
                  onClick={() => runStatusAction("publish")}
                  disabled={Boolean(busyAction)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-np-verify px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {busyAction === "publish" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  Publish
                </button>
              )}
              {(selected.status === "published" || selected.status === "updated") && (
                <button
                  type="button"
                  onClick={() => runStatusAction("unpublish")}
                  disabled={Boolean(busyAction)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 bg-np-bg px-4 py-2 text-xs font-semibold text-np-text disabled:opacity-60"
                >
                  {busyAction === "unpublish" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
                  Unpublish
                </button>
              )}
              <button
                type="button"
                onClick={() => runStatusAction("expire")}
                disabled={Boolean(busyAction) || selected.status === "expired"}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 bg-np-bg px-4 py-2 text-xs font-semibold text-np-text disabled:opacity-60"
              >
                {busyAction === "expire" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock3 className="w-3.5 h-3.5" />}
                Mark expired
              </button>
              <button
                type="button"
                onClick={() => runStatusAction("reject")}
                disabled={Boolean(busyAction) || selected.status === "rejected"}
                className="inline-flex items-center gap-1.5 rounded-xl border border-np-danger/40 bg-np-danger/15 px-4 py-2 text-xs font-semibold text-np-danger disabled:opacity-60"
              >
                {busyAction === "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
