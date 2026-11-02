"use client";

import React from "react";
import { Database, CheckCircle2, Clock, AlertCircle, RefreshCw } from "lucide-react";

const RECENT_RUNS = [
  {
    id: "run-001",
    source: "KPITB Press Announcements",
    type: "website",
    items_discovered: 3,
    items_created: 1,
    duplicates_detected: 2,
    status: "completed",
    duration: "4.2s",
    timestamp: "12 mins ago",
  },
  {
    id: "run-002",
    source: "UET Peshawar Events Portal",
    type: "website",
    items_discovered: 2,
    items_created: 1,
    duplicates_detected: 1,
    status: "completed",
    duration: "3.8s",
    timestamp: "24 mins ago",
  },
  {
    id: "run-003",
    source: "NIC Peshawar Cohort Feed",
    type: "api",
    items_discovered: 1,
    items_created: 1,
    duplicates_detected: 0,
    status: "completed",
    duration: "1.9s",
    timestamp: "45 mins ago",
  },
  {
    id: "run-004",
    source: "GIKI Competitions RSS",
    type: "rss",
    items_discovered: 2,
    items_created: 1,
    duplicates_detected: 1,
    status: "completed",
    duration: "2.1s",
    timestamp: "1 hour ago",
  },
  {
    id: "run-005",
    source: "HEC Pakistan Scholarship Gazette",
    type: "website",
    items_discovered: 4,
    items_created: 2,
    duplicates_detected: 2,
    status: "completed",
    duration: "6.5s",
    timestamp: "2 hours ago",
  },
];

export default function IngestionRunsPage() {
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
          Audit history of scheduled crawler executions and raw evidence ingestion runs
        </p>
      </div>

      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Run ID & Source</th>
                <th className="px-6 py-4">Discovered</th>
                <th className="px-6 py-4">New Canonical</th>
                <th className="px-6 py-4">Duplicates Merged</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Executed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {RECENT_RUNS.map((run) => (
                <tr key={run.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">{run.source}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{run.id}</div>
                  </td>
                  <td className="px-6 py-4 font-mono">{run.items_discovered}</td>
                  <td className="px-6 py-4 font-mono text-emerald-400 font-semibold">{run.items_created}</td>
                  <td className="px-6 py-4 font-mono text-cyan-400">{run.duplicates_detected}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Success</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-400">{run.duration}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">{run.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
