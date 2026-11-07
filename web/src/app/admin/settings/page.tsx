"use client";

import React, { useEffect, useState } from "react";
import { FileText, ShieldCheck, HardDrive, Globe } from "lucide-react";
import { fetchAuditLogs } from "@/lib/api";

function formatWhen(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function AdminSettingsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs()
      .then((data) => setLogs(data || []))
      .finally(() => setLoading(false));
  }, []);

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
          Approvals, rejects, and admin actions written by the API. Empty until someone uses Review.
        </p>
      </div>

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
            <span>Publish rules</span>
          </div>
          <div className="text-slate-400">
            Auto-crawl: <span className="text-slate-200 font-mono">off</span>
          </div>
          <div className="text-slate-400">
            Weak extracts: <span className="text-amber-300 font-semibold font-mono">verification queue</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-white">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>Listings</span>
          </div>
          <div className="text-slate-400">
            Public site reads: <span className="text-slate-200 font-mono">Supabase</span>
          </div>
          <div className="text-slate-400">
            Crawls & review: <span className="text-slate-200 font-mono">Render API</span>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Audit Log Trail</h2>
          <span className="text-xs text-slate-500 font-mono">{logs.length} records</span>
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
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    Loading audit logs…
                  </td>
                </tr>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No audit events yet.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 font-mono font-semibold text-indigo-400 text-[11px]">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 font-medium text-white">
                    {log.entity_type} {log.entity_id ? String(log.entity_id).slice(0, 8) : ""}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-400 text-[11px]">
                    {log.admin_user_id ? String(log.admin_user_id).slice(0, 8) : "system"}
                  </td>
                  <td className="px-6 py-4 text-slate-300 text-[11px]">
                    {log.after_state ? JSON.stringify(log.after_state) : "—"}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500 text-[11px]">{formatWhen(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
