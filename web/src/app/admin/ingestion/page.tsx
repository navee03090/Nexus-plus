"use client";

import React, { useEffect, useState } from "react";
import { Database, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { fetchIngestionRuns } from "@/lib/api";

function formatWhen(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function IngestionRunsPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIngestionRuns()
      .then((data) => setRuns(data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-np-online mb-1">
          <Database className="w-4 h-4" />
          <span>Telemetry & Crawler Execution</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Ingestion Runs & Evidence Logs
        </h1>
        <p className="text-xs text-np-muted mt-1">
          Real crawl history from the API. Empty until you click Crawl Now on a source.
        </p>
      </div>

      <div className="rounded-np-lg bg-np-surface border border-np-border overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-np-muted">
            <thead className="bg-np-bg/80 text-[11px] font-semibold uppercase tracking-wider text-np-muted border-b border-np-border">
              <tr>
                <th className="px-6 py-4">Run ID & Source</th>
                <th className="px-6 py-4">Discovered</th>
                <th className="px-6 py-4">Processed</th>
                <th className="px-6 py-4">Duplicates</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Executed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-np-faint">
                    Loading crawl runs…
                  </td>
                </tr>
              )}
              {!loading && runs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-np-faint">
                    No ingestion runs yet.
                  </td>
                </tr>
              )}
              {runs.map((run) => {
                const ok = run.status === "success" || run.status === "completed";
                return (
                  <tr key={run.id} className="hover:bg-np-surface-2/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{run.source}</div>
                      <div className="text-[11px] text-np-faint font-mono mt-0.5">{run.id}</div>
                      {run.error_message && (
                        <div className="text-[11px] text-np-warn mt-1 max-w-xs truncate">{run.error_message}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono">{run.items_found ?? 0}</td>
                    <td className="px-6 py-4 font-mono text-np-verify font-semibold">{run.items_processed ?? 0}</td>
                    <td className="px-6 py-4 font-mono text-np-online">{run.items_duplicated ?? 0}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        ok
                          ? "bg-emerald-500/20 text-np-verify border-np-verify/30"
                          : "bg-amber-500/20 text-np-warn border-np-warn/30"
                      }`}>
                        {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        <span>{run.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-np-muted">
                      {run.duration_seconds != null ? `${run.duration_seconds}s` : "—"}
                    </td>
                    <td className="px-6 py-4 text-np-muted font-mono text-[11px]">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatWhen(run.started_at)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
