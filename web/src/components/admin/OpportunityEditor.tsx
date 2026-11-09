"use client";

import React, { useMemo } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import { mediaUrl } from "@/lib/api";
import { Category } from "@/types";

export type OpportunityDraft = {
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
  featured: boolean;
  admin_note: string;
};

export const EMPTY_OPPORTUNITY_DRAFT: OpportunityDraft = {
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
  featured: false,
  admin_note: "",
};

export function toDateInput(value?: string | null) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export const WORD_LIMITS = {
  title: 25,
  summary: 60,
  description: 500,
  eligibility_summary: 120,
  admin_note: 80,
} as const;

export function wordCount(value?: string | null) {
  const text = (value || "").trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function overWordLimit(field: keyof typeof WORD_LIMITS, value?: string | null) {
  return wordCount(value) > WORD_LIMITS[field];
}

export function titleIsReal(title: string) {
  const text = title.trim();
  return text.length >= 8 && !/notice board|untitled/i.test(text) && !overWordLimit("title", text);
}

export function draftIsReady(draft: OpportunityDraft) {
  const hasCore = Boolean(draft.registration_deadline) || Boolean(draft.registration_url.trim());
  const withinWords =
    !overWordLimit("title", draft.title) &&
    !overWordLimit("summary", draft.summary) &&
    !overWordLimit("description", draft.description) &&
    !overWordLimit("eligibility_summary", draft.eligibility_summary) &&
    !overWordLimit("admin_note", draft.admin_note);
  return titleIsReal(draft.title) && hasCore && withinWords;
}

export function wordLimitErrors(draft: OpportunityDraft): string[] {
  const fields: Array<keyof typeof WORD_LIMITS> = [
    "title",
    "summary",
    "description",
    "eligibility_summary",
    "admin_note",
  ];
  return fields.filter((field) => overWordLimit(field, draft[field]));
}

export function correctionsFromDraft(draft: OpportunityDraft) {
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
    featured: draft.featured,
    admin_note: draft.admin_note || undefined,
  };
}

const inputClass = (flagged: boolean) =>
  `w-full rounded-xl border px-3 py-2.5 text-xs text-slate-100 outline-none focus:border-indigo-400 ${
    flagged ? "border-amber-500/50 bg-amber-500/10" : "border-slate-800 bg-slate-950"
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

type Props = {
  draft: OpportunityDraft;
  categories: Category[];
  fieldErrors?: string[];
  busy?: boolean;
  onChange: (patch: Partial<OpportunityDraft>) => void;
  onFlyerSelected?: (file: File) => void;
  showFeatured?: boolean;
  showAdminNote?: boolean;
};

export function OpportunityEditor({
  draft,
  categories,
  fieldErrors = [],
  busy = false,
  onChange,
  onFlyerSelected,
  showFeatured = true,
  showAdminNote = true,
}: Props) {
  const flagged = (name: string) => fieldErrors.includes(name) || (
    name in WORD_LIMITS && overWordLimit(name as keyof typeof WORD_LIMITS, draft[name as keyof OpportunityDraft] as string)
  );
  const titleMissing = !draft.title.trim() || draft.title.trim().length < 8 || /notice board|untitled/i.test(draft.title);
  const coreMissing = !draft.registration_deadline && !draft.registration_url.trim();
  const preview = mediaUrl(draft.flyer_url);

  const categoryOptions = useMemo(() => {
    const names = categories.map((category) => category.name);
    if (draft.category_name && !names.includes(draft.category_name)) {
      return [draft.category_name, ...names];
    }
    return names;
  }, [categories, draft.category_name]);

  return (
    <div className="space-y-3">
      <div>
        <Label
          text="Title"
          missing={titleMissing}
          words={wordCount(draft.title)}
          limit={WORD_LIMITS.title}
        />
        <input
          value={draft.title}
          onChange={(event) => onChange({ title: event.target.value })}
          className={inputClass(titleMissing || flagged("title"))}
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
          onChange={(event) => onChange({ summary: event.target.value })}
          className={inputClass(flagged("summary"))}
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
          onChange={(event) => onChange({ description: event.target.value })}
          className={inputClass(flagged("description"))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label text="Category" missing={!draft.category_name} />
          <select
            value={draft.category_name}
            onChange={(event) => onChange({ category_name: event.target.value })}
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
            onChange={(event) => onChange({ organization_name: event.target.value })}
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
            onChange={(event) => onChange({ registration_deadline: event.target.value })}
            className={`${inputClass(coreMissing || flagged("registration_deadline"))} [color-scheme:dark]`}
          />
        </div>
        <div>
          <Label text="Starts" missing={!draft.start_date} />
          <input
            type="date"
            value={draft.start_date}
            onChange={(event) => onChange({ start_date: event.target.value })}
            className={`${inputClass(flagged("start_date"))} [color-scheme:dark]`}
          />
        </div>
      </div>
      <div>
        <Label text="Apply link" missing={coreMissing} />
        <input
          value={draft.registration_url}
          placeholder="https://"
          onChange={(event) => onChange({ registration_url: event.target.value })}
          className={inputClass(coreMissing || flagged("registration_url"))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label text="City" missing={!draft.city.trim()} />
          <input
            value={draft.city}
            onChange={(event) => onChange({ city: event.target.value })}
            className={inputClass(flagged("city"))}
          />
        </div>
        <div>
          <Label text="Venue" missing={!draft.venue.trim() && !draft.is_online} />
          <input
            value={draft.venue}
            onChange={(event) => onChange({ venue: event.target.value })}
            className={inputClass(flagged("venue"))}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-[11px] text-slate-300">
        <input
          type="checkbox"
          checked={draft.is_online}
          onChange={(event) => onChange({ is_online: event.target.checked })}
          className="accent-indigo-500"
        />
        Online event
      </label>
      {showFeatured && (
        <label className="flex items-center gap-2 text-[11px] text-slate-300">
          <input
            type="checkbox"
            checked={draft.featured}
            onChange={(event) => onChange({ featured: event.target.checked })}
            className="accent-indigo-500"
          />
          Featured on homepage
        </label>
      )}
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
          onChange={(event) => onChange({ eligibility_summary: event.target.value })}
          className={inputClass(flagged("eligibility_summary"))}
        />
      </div>
      <div>
        <Label text="Contact email" missing={!draft.contact_email.trim()} />
        <input
          type="email"
          value={draft.contact_email}
          onChange={(event) => onChange({ contact_email: event.target.value })}
          className={inputClass(flagged("contact_email"))}
        />
      </div>
      {showAdminNote && (
        <div>
          <Label
            text="Change note"
            words={wordCount(draft.admin_note)}
            limit={WORD_LIMITS.admin_note}
          />
          <input
            value={draft.admin_note}
            placeholder="Optional note for audit logs"
            onChange={(event) => onChange({ admin_note: event.target.value })}
            className={inputClass(flagged("admin_note"))}
          />
        </div>
      )}
      <div className="space-y-2 pt-1">
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
            No image yet.
          </div>
        )}
        {onFlyerSelected && (
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] font-semibold text-slate-200">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
            {busy ? "Uploading…" : preview ? "Replace image" : "Add image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) onFlyerSelected(file);
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
