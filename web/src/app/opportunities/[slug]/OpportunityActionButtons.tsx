"use client";

import React, { useState } from "react";
import { Bookmark, BookmarkCheck, Share2, AlertTriangle } from "lucide-react";
import { Opportunity } from "@/types";
import { CalendarButton } from "@/components/CalendarButton";
import { ShareModal } from "@/components/ShareModal";
import { ReportModal } from "@/components/ReportModal";
import { saveOpportunity } from "@/lib/api";

interface OpportunityActionButtonsProps {
  opportunity: Opportunity;
}

export const OpportunityActionButtons: React.FC<OpportunityActionButtonsProps> = ({ opportunity }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const handleToggleSave = async () => {
    setSaving(true);
    try {
      const res = await saveOpportunity(opportunity.id);
      setIsSaved(res.saved);
    } catch {
      setIsSaved(!isSaved);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <CalendarButton opportunity={opportunity} className="w-full" />

        <button
          onClick={handleToggleSave}
          disabled={saving}
          className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
            isSaved
              ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
              : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700/60"
          }`}
        >
          {isSaved ? (
            <>
              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              <span>Saved</span>
            </>
          ) : (
            <>
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save</span>
            </>
          )}
        </button>

        <button
          onClick={() => setShareOpen(true)}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700/60 text-xs font-medium transition-colors"
        >
          <Share2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Share</span>
        </button>

        <button
          onClick={() => setReportOpen(true)}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:text-rose-400 hover:bg-slate-700/60 text-xs font-medium transition-colors"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Report</span>
        </button>
      </div>

      <ShareModal
        opportunity={opportunity}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />

      <ReportModal
        opportunity={opportunity}
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </>
  );
};
