import React from "react";
import { FileText, ShieldCheck, Database, HardDrive, Key, Globe } from "lucide-react";

const AUDIT_LOGS = [
  {
    id: "log-1",
    action: "DEADLINE_EXTENSION_DETECTED",
    entity: "KP AI & Cybersecurity Hackathon 2026",
    actor: "system_change_detector",
    details: "Extended deadline from 2026-10-12 to 2026-10-18 based on KPITB circular",
    timestamp: "2026-10-03 11:00:00 PKT",
  },
  {
    id: "log-2",
    action: "DUPLICATE_MERGE",
    entity: "NIC Peshawar Cohort 8",
    actor: "system_deduplicator",
    details: "Merged raw evidence s-item-02 into canonical event 00000001-0000-0000-0000-000000000002",
    timestamp: "2026-10-02 14:30:00 PKT",
  },
  {
    id: "log-3",
    action: "MANUAL_APPROVAL",
    entity: "GIKI Annual All-Pakistan Mathematics Olympiad",
    actor: "admin_editorial",
    details: "Approved event following flyer OCR verification",
    timestamp: "2026-10-02 09:15:00 PKT",
  },
  {
    id: "log-4",
    action: "SOURCE_ADDED",
    entity: "FAST-NUCES Peshawar Portal",
    actor: "admin_editorial",
    details: "Added adapter with parser_key fast_pwr and crawl_frequency 3600s",
    timestamp: "2026-10-01 16:40:00 PKT",
  },
];

export default function AdminSettingsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-1">
          <FileText className="w-4 h-4" />
          <span>System Provenance & Security Audit</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Audit Logs & Diagnostics
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Immutable audit trails of opportunity modifications, approvals, and crawl operations
        </p>
      </div>

      {/* System Settings & Invariants Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-white">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Timezone & Locale</span>
          </div>
          <div className="text-slate-400">
            Timezone: <span className="text-slate-200 font-mono">Asia/Karachi (PKT)</span>
          </div>
          <div className="text-slate-400">
            Initial Region: <span className="text-slate-200 font-mono">Peshawar / KPK</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-white">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Model Invariants</span>
          </div>
          <div className="text-slate-400">
            AI Engine: <span className="text-slate-200 font-mono">gemini-2.5-flash</span>
          </div>
          <div className="text-slate-400">
            Hallucination Mode: <span className="text-emerald-400 font-semibold font-mono">Zero Tolerated</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-white">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>Storage & Embeddings</span>
          </div>
          <div className="text-slate-400">
            Vector Dimension: <span className="text-slate-200 font-mono">768 (text-embedding-004)</span>
          </div>
          <div className="text-slate-400">
            Index Method: <span className="text-slate-200 font-mono">HNSW Cosine</span>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Audit Log Trail</h2>
          <span className="text-xs text-slate-500 font-mono">Append-Only Immutable Records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Entity</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Audit Details</th>
                <th className="px-6 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {AUDIT_LOGS.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 font-mono font-semibold text-indigo-400 text-[11px]">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 font-medium text-white">{log.entity}</td>
                  <td className="px-6 py-4 font-mono text-slate-400 text-[11px]">{log.actor}</td>
                  <td className="px-6 py-4 text-slate-300 text-[11px]">{log.details}</td>
                  <td className="px-6 py-4 font-mono text-slate-500 text-[11px]">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
