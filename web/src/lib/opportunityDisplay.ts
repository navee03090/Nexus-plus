import { Opportunity } from "@/types";

const JUNK_TITLE =
  /^(vacancies|digital library|apply for admission|announcements.*|see all|home|contact)$/i;

const PLACEHOLDER =
  /^(date tba|tba|tbd|not specified.*|see details|peshawar or other city|n\/a|na|none|null|undefined|—|-|\.{2,})$/i;

const UNKNOWN_ORG =
  /^(verified organizer|official institution|official organizer|unknown organizer|unknown|organizer|n\/a|na|none)$/i;

export function meaningful(value?: string | null): string {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (!text || PLACEHOLDER.test(text)) return "";
  return text;
}

export function knownOrganizer(name?: string | null): string {
  const text = meaningful(name);
  if (!text || UNKNOWN_ORG.test(text)) return "";
  return text;
}

export function sameText(a?: string | null, b?: string | null): boolean {
  const left = (a || "").replace(/\s+/g, " ").trim().toLowerCase();
  const right = (b || "").replace(/\s+/g, " ").trim().toLowerCase();
  return Boolean(left) && left === right;
}

export function displaySummary(opportunity: Opportunity): string {
  const title = opportunity.title || "";
  const summary = meaningful(opportunity.summary);
  if (!summary || sameText(summary, title)) return "";
  return summary;
}

export function displayDescription(opportunity: Opportunity): string {
  const title = opportunity.title || "";
  const description = meaningful(opportunity.description);
  if (!description || sameText(description, title)) {
    const summary = displaySummary(opportunity);
    return summary;
  }
  return description;
}

export function isExpired(opportunity: Opportunity, now = Date.now()): boolean {
  if (!opportunity.registration_deadline) return false;
  const time = new Date(opportunity.registration_deadline).getTime();
  if (Number.isNaN(time)) return false;
  return time < now;
}

export function isDisplayable(opportunity: Opportunity): boolean {
  const title = (opportunity.title || "").replace(/\s+/g, " ").trim();
  if (!title || JUNK_TITLE.test(title)) return false;

  const hasDeadline = Boolean(opportunity.registration_deadline);
  const hasDate = Boolean(opportunity.start_date || opportunity.end_date);
  const description = (opportunity.description || "").trim();
  const summary = (opportunity.summary || "").trim();
  const body = description || summary;
  const bodyEqualsTitle = !body || sameText(body, title);

  if (!hasDeadline && !hasDate && bodyEqualsTitle) return false;
  return true;
}

export function closesWithinDays(opportunity: Opportunity, days: number, now = Date.now()): boolean {
  if (!opportunity.registration_deadline || isExpired(opportunity, now)) return false;
  const time = new Date(opportunity.registration_deadline).getTime();
  if (Number.isNaN(time)) return false;
  return time - now <= days * 86_400_000;
}

export function locationLabel(opportunity: Opportunity): string {
  if (opportunity.is_online) return "Online";
  return meaningful(opportunity.venue) || meaningful(opportunity.city);
}

function mentioned(corpus: string, token: string): boolean {
  const forms = [token];
  if (token.endsWith("s") && token.length > 4) forms.push(token.slice(0, -1));
  else forms.push(`${token}s`);
  return forms.some((form) => new RegExp(`\\b${form}\\b`, "i").test(corpus));
}

export function displayAudience(opportunity: Opportunity): string[] {
  const corpus = [
    opportunity.title,
    opportunity.summary,
    opportunity.description,
    opportunity.eligibility_summary,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const raw of opportunity.target_audience || []) {
    const label = raw.replace(/\s+/g, " ").trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key) || /^(general|everyone|all)$/i.test(label)) continue;
    if (/^(students?|developers?)$/i.test(key) && !mentioned(corpus, key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels;
}

type SortKey = "newest" | "deadline" | "trust" | string;

function compare(a: Opportunity, b: Opportunity, sort: SortKey): number {
  if (sort === "trust") return (b.trust_score || 0) - (a.trust_score || 0);
  if (sort === "deadline") {
    const at = a.registration_deadline ? new Date(a.registration_deadline).getTime() : Number.POSITIVE_INFINITY;
    const bt = b.registration_deadline ? new Date(b.registration_deadline).getTime() : Number.POSITIVE_INFINITY;
    if (at !== bt) return at - bt;
  }
  return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
}

export function prepareListings(
  items: Opportunity[],
  options?: { showPast?: boolean; sort?: SortKey }
): Opportunity[] {
  const sort = options?.sort || "newest";
  return items.filter(isDisplayable).sort((a, b) => compare(a, b, sort));
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    meta: {
      page: safePage,
      page_size: pageSize,
      total_items: total,
      total_pages: totalPages,
    },
  };
}
