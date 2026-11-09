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
        <div className="flex items-center gap-2 text-xs font-semibold text-np-accent mb-1">
          <FileText className="w-4 h-4" />
          <span>System Provenance & Security Audit</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Audit Logs & Diagnostics
        </h1>
        <p className="text-xs text-np-muted mt-1">
          Approvals, rejects, and admin actions written by the API. Empty until someone uses Review.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-5 rounded-np-lg bg-np-surface border border-np-border space-y-2">
          <div className="flex items-center gap-2 font-bold text-white">
            <Globe className="w-4 h-4 text-np-verify" />
            <span>Timezone & Locale</span>
          </div>
          <div className="text-np-muted">
            Timezone: <span className="text-np-text font-mono">Asia/Karachi (PKT)</span>
          </div>
          <div className="text-np-muted">
            Initial Region: <span className="text-np-text font-mono">Peshawar / KPK</span>
          </div>
        </div>

        <div className="p-5 rounded-np-lg bg-np-surface border border-np-border space-y-2">
          <div className="flex items-center gap-2 font-bold text-white">
            <ShieldCheck className="w-4 h-4 text-np-accent" />
            <span>Publish rules</span>
          </div>
          <div className="text-np-muted">
            Auto-crawl: <span className="text-np-text font-mono">off</span>
          </div>
          <div className="text-np-muted">
            Weak extracts: <span className="text-np-warn font-semibold font-mono">verification queue</span>
          </div>
        </div>

        <div className="p-5 rounded-np-lg bg-np-surface border border-np-border space-y-2">
          <div className="flex items-center gap-2 font-bold text-white">
            <HardDrive className="w-4 h-4 text-np-online" />
            <span>Listings</span>
          </div>
          <div className="text-np-muted">
            Public site reads: <span className="text-np-text font-mono">Supabase</span>
          </div>
          <div className="text-np-muted">
            Crawls & review: <span className="text-np-text font-mono">Render API</span>
          </div>
        </div>
      </div>

      <div className="rounded-np-lg bg-np-surface border border-np-border overflow-hidden shadow-xl">
        <div className="p-5 border-b border-np-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Audit Log Trail</h2>
          <span className="text-xs text-np-faint font-mono">{logs.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-np-muted">
            <thead className="bg-np-bg/80 text-[11px] font-semibold uppercase tracking-wider text-np-muted border-b border-np-border">
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
                  <td colSpan={5} className="px-6 py-10 text-center text-np-faint">
                    Loading audit logs…
                  </td>
                </tr>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-np-faint">
                    No audit events yet.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-np-surface-2/40 transition-colors">
                  <td className="px-6 py-4 font-mono font-semibold text-np-accent text-[11px]">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 font-medium text-white">
                    {log.entity_type} {log.entity_id ? String(log.entity_id).slice(0, 8) : ""}
                  </td>
                  <td className="px-6 py-4 font-mono text-np-muted text-[11px]">
                    {log.admin_user_id ? String(log.admin_user_id).slice(0, 8) : "system"}
                  </td>
                  <td className="px-6 py-4 text-np-muted text-[11px]">
                    {log.after_state ? JSON.stringify(log.after_state) : "—"}
                  </td>
                  <td className="px-6 py-4 font-mono text-np-faint text-[11px]">{formatWhen(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
