"use client";

import React, { useState } from "react";
import { checkOfficeModel, type OfficeModelStatus } from "@/lib/api";

function checkedLabel(value?: string | null) {
  if (!value) return "";
  const when = new Date(value);
  if (Number.isNaN(when.getTime())) return "";
  return when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function OfficeModelCheck({ initial }: { initial: OfficeModelStatus }) {
  const [office, setOffice] = useState<OfficeModelStatus>(initial || {});
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = office.state === "live";
  const quiet = !office.state || office.state === "not_configured";
  const tone = live ? "text-np-verify" : quiet ? "text-np-muted" : "text-np-warn";
  const when = checkedLabel(office.checked_at);

  const runCheck = async () => {
    setChecking(true);
    setError(null);
    const next = await checkOfficeModel();
    setChecking(false);
    if (!next) {
      setError("The check did not finish. Press Check now again.");
      return;
    }
    setOffice(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-np-bg border border-np-border">
        <div className="min-w-0">
          <div className="text-np-muted">Office Qwen</div>
          <div className={`mt-1 font-medium ${tone}`}>
            {checking ? "Checking the office computer..." : office.label || "Not checked yet"}
            {!checking && live && office.model ? ` • ${office.model}` : ""}
            {!checking && office.latency_ms != null ? ` • ${office.latency_ms}ms` : ""}
            {!checking && when ? ` • checked ${when}` : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={runCheck}
          disabled={checking}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-np-accent hover:bg-[#5a9dff] disabled:opacity-60 text-white text-[11px] font-semibold"
        >
          {checking ? "Checking..." : "Check now"}
        </button>
      </div>
      {!checking && office.detail && (
        <p className="text-[11px] text-np-muted px-1">{office.detail}</p>
      )}
      {error && <p className="text-[11px] text-np-warn px-1">{error}</p>}
    </div>
  );
}
