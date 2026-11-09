"use client";

import React, { useState } from "react";
import { AlertTriangle, X, CheckCircle2, Send } from "lucide-react";
import { Opportunity } from "@/types";
import { reportOpportunity } from "@/lib/api";

interface ReportModalProps {
  opportunity: Opportunity;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ opportunity, isOpen, onClose }) => {
  const [reportType, setReportType] = useState("incorrect_date");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await reportOpportunity(opportunity.id, reportType, details);
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-np-bg/80 backdrop-blur-sm">
      <div className="bg-np-surface border border-np-border rounded-np-lg max-w-md w-full p-6 shadow-np-lg relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-np-muted hover:text-np-text transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-np-verify/10 text-np-verify border border-np-verify/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-np-text mb-2">Report submitted</h3>
            <p className="text-sm text-np-muted mb-6">
              Thanks for helping keep NexusPulse accurate. Our team will review this notice.
            </p>
            <button onClick={onClose} className="np-btn-secondary text-xs">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-np bg-np-warn/10 text-np-warn border border-np-warn/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-np-text">Report inaccuracy</h3>
                <p className="text-xs text-np-muted">Help us correct this listing</p>
              </div>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-medium text-np-muted mb-1.5">Issue type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="np-input"
                >
                  <option value="incorrect_date">Incorrect deadline or event date</option>
                  <option value="broken_link">Broken or inaccessible registration link</option>
                  <option value="duplicate_event">Duplicate of another opportunity</option>
                  <option value="incorrect_eligibility">Misleading eligibility or requirements</option>
                  <option value="cancelled_event">Event cancelled or postponed</option>
                  <option value="other">Other issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-np-muted mb-1.5">
                  Details & evidence links
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide correct dates, official announcement links, or notes…"
                  rows={3}
                  className="np-input resize-none"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={onClose} className="np-btn-secondary text-xs">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-np bg-np-danger hover:bg-[#e0666c] text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? "Submitting…" : "Submit report"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
