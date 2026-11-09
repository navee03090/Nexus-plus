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

export const OpportunityActionButtons: React.FC<OpportunityActionButtonsProps> = ({
  opportunity,
}) => {
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
          className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-np text-xs font-medium border transition-colors ${
            isSaved
              ? "bg-np-verify/10 text-np-verify border-np-verify/40"
              : "bg-np-surface-2 text-np-text border-np-border hover:border-np-border-strong"
          }`}
        >
          {isSaved ? (
            <>
              <BookmarkCheck className="w-3.5 h-3.5 fill-np-verify" />
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
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-np bg-np-surface-2 text-np-text border border-np-border hover:border-np-border-strong text-xs font-medium transition-colors"
        >
          <Share2 className="w-3.5 h-3.5 text-np-accent" />
          <span>Share</span>
        </button>

        <button
          onClick={() => setReportOpen(true)}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-np bg-np-surface-2 text-np-muted border border-np-border hover:text-np-danger hover:border-np-danger/40 text-xs font-medium transition-colors"
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
