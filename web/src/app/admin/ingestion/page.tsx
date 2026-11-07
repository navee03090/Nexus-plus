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
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 mb-1">
          <Database className="w-4 h-4" />
          <span>Telemetry & Crawler Execution</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Ingestion Runs & Evidence Logs
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Real crawl history from the API. Empty until you click Crawl Now on a source.
        </p>
      </div>

      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
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
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Loading crawl runs…
                  </td>
                </tr>
              )}
              {!loading && runs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    No ingestion runs yet.
                  </td>
                </tr>
              )}
              {runs.map((run) => {
                const ok = run.status === "success" || run.status === "completed";
                return (
                  <tr key={run.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{run.source}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{run.id}</div>
                      {run.error_message && (
                        <div className="text-[11px] text-amber-400 mt-1 max-w-xs truncate">{run.error_message}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono">{run.items_found ?? 0}</td>
                    <td className="px-6 py-4 font-mono text-emerald-400 font-semibold">{run.items_processed ?? 0}</td>
                    <td className="px-6 py-4 font-mono text-cyan-400">{run.items_duplicated ?? 0}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        ok
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      }`}>
                        {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        <span>{run.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">
                      {run.duration_seconds != null ? `${run.duration_seconds}s` : "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
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
