import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string): string {
  if (!dateString) return "Date to be announced";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return "To be announced";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function getGoogleCalendarUrl(
  title: string,
  details: string,
  location: string,
  startDateStr: string,
  endDateStr?: string
): string {
  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const titleEnc = encodeURIComponent(title);
  const detailsEnc = encodeURIComponent(details);
  const locationEnc = encodeURIComponent(location || "Pakistan");

  let datesParam = "";
  try {
    const start = new Date(startDateStr);
    const end = endDateStr ? new Date(endDateStr) : new Date(start.getTime() + 2 * 3600 * 1000);
    const format = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    datesParam = `&dates=${format(start)}/${format(end)}`;
  } catch {}

  return `${base}&text=${titleEnc}&details=${detailsEnc}&location=${locationEnc}${datesParam}`;
}

export function generateGoogleCalendarUrl(opp: {
  title: string;
  summary: string;
  start_date?: string;
  venue?: string;
  registration_url?: string;
}) {
  return getGoogleCalendarUrl(
    opp.title,
    `${opp.summary}\n\nRegistration URL: ${opp.registration_url || "See NEXUS PULSE"}`,
    opp.venue || "Pakistan",
    opp.start_date || new Date().toISOString()
  );
}
