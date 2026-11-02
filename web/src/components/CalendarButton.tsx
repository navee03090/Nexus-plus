"use client";

import React, { useState } from "react";
import { Calendar, ChevronDown, Download, ExternalLink } from "lucide-react";
import { Opportunity } from "@/types";
import { getGoogleCalendarUrl } from "@/lib/utils";

interface CalendarButtonProps {
  opportunity: Opportunity;
  className?: string;
}

export const CalendarButton: React.FC<CalendarButtonProps> = ({ opportunity, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);

  const googleUrl = getGoogleCalendarUrl(
    opportunity.title,
    opportunity.description || opportunity.summary,
    opportunity.venue || (opportunity.is_online ? "Online" : opportunity.city),
    opportunity.start_date || opportunity.registration_deadline || new Date().toISOString(),
    opportunity.end_date
  );

  const downloadIcs = () => {
    const startDate = opportunity.start_date ? new Date(opportunity.start_date) : new Date();
    const endDate = opportunity.end_date ? new Date(opportunity.end_date) : new Date(startDate.getTime() + 2 * 3600 * 1000);

    const formatIcsDate = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Nexus Pulse//Opportunity Intelligence//EN",
      "BEGIN:VEVENT",
      `UID:${opportunity.id}@nexuspulse.org`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${opportunity.title.replace(/\n/g, " ")}`,
      `DESCRIPTION:${(opportunity.summary || "").replace(/\n/g, "\\n")}`,
      `LOCATION:${(opportunity.venue || (opportunity.is_online ? "Online" : opportunity.city)).replace(/\n/g, " ")}`,
      opportunity.registration_url ? `URL:${opportunity.registration_url}` : "",
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `${opportunity.slug || "event"}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div className="flex items-center rounded-lg bg-slate-800 border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors">
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-700/60 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          <span>Add to Calendar</span>
        </a>
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Calendar options"
          className="p-2 text-slate-400 hover:text-white border-l border-slate-700 hover:bg-slate-700/60 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-48 rounded-lg bg-slate-900 border border-slate-800 shadow-xl z-50 py-1 text-xs">
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>Google Calendar</span>
            </a>
            <button
              onClick={downloadIcs}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Apple / Outlook (.ics)</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
