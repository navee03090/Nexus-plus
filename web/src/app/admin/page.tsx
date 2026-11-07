import React from "react";
import Link from "next/link";
import { 
  Radio, 
  ShieldCheck, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Activity,
  Play
} from "lucide-react";
import { fetchLiveAdminStats, fetchDetailedHealth } from "@/lib/api";

export const revalidate = 10;

export default async function AdminDashboardPage() {
  const [stats, health] = await Promise.all([
    fetchLiveAdminStats(),
    fetchDetailedHealth(),
  ]);

  const diagnostics = health?.diagnostics || {};
  const dbStatus = diagnostics.database?.status || "unknown";
  const aiStatus = diagnostics.ai_provider?.status || "unknown";
  const crawlMode = diagnostics.crawler?.mode || (stats.auto_crawl ? "scheduled" : "manual");
  const activeProvider = diagnostics.ai_provider?.active_provider || "none";
  const activeModel = diagnostics.ai_provider?.model || "—";
  const localAi = diagnostics.ai_provider?.local;
  const extractionPct = Math.round((stats.ai_extraction_success_rate || 0) * 100);
  const healthOk = health?.status === "healthy";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <span className={`w-2 h-2 rounded-full ${healthOk ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
            <span>
              {healthOk ? "API reachable" : "API degraded or waking"} • crawl {crawlMode}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Pipeline Health
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Live counts from the database. Weak crawls go to the verification queue.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/review"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-indigo-600/30"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Open Review Queue</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Sources Monitored</span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {stats.sources_monitored}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3 h-3" />
            <span>{stats.active_sources} active</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Canonical Opportunities</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-indigo-400 font-mono">
            {stats.opportunities_published}
          </div>
          <div className="text-[11px] text-slate-400">
            {stats.opportunities_discovered} total rows
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Duplicates Merged</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-cyan-400 font-mono">
            {stats.duplicates_resolved}
          </div>
          <div className="text-[11px] text-slate-400">
            Linked source items minus unique events
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Verification Queue</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">
            {stats.pending_verification}
          </div>
          <div className="text-[11px] text-slate-400">
            Awaiting editorial confirmation
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>Live services</span>
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
              {extractionPct}% successful crawl runs
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-300">Database</span>
              <span className={dbStatus === "healthy" ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                {dbStatus}
                {diagnostics.database?.latency_ms != null ? ` • ${diagnostics.database.latency_ms}ms` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-300">AI provider</span>
              <span className={aiStatus === "healthy" ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                {aiStatus} • {activeProvider} {activeModel !== "—" ? `(${activeModel})` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-300">Office Qwen / local model</span>
              <span className="text-slate-300 font-medium">
                {localAi?.configured ? `${localAi.model}` : "Not connected yet"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>How publishing works</span>
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300">
              Queue first
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-300">Auto-publish needs a real title plus a deadline or apply URL</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-300">Everything else waits in Verification Queue</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-300">Websites: Add Source then Crawl Now. Facebook/Instagram: Apify or Curator</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Add a website and crawl it</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Test a URL, save it as a source, then run Crawl Now. Auto-crawl stays off until Qwen is connected.
          </p>
        </div>
        <Link
          href="/admin/sources"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shrink-0"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Open Sources</span>
        </Link>
      </div>
    </div>
  );
}
