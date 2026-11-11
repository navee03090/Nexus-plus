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
import OfficeModelCheck from "@/components/OfficeModelCheck";

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
  const office = diagnostics.office_model || {};
  const extractionPct = Math.round((stats.ai_extraction_success_rate || 0) * 100);
  const healthOk = health?.status === "healthy";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-np-verify mb-1">
            <span className={`w-2 h-2 rounded-full ${healthOk ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
            <span>
              {healthOk ? "API reachable" : "API degraded or waking"} • crawl {crawlMode}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-np-text tracking-tight">
            Pipeline Health
          </h1>
          <p className="text-xs text-np-muted mt-1">
            Live counts from the database. Weak crawls go to the verification queue.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <Link
            href="/admin/opportunities"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-np-border bg-np-surface hover:bg-np-surface-2 text-np-text text-xs font-semibold transition-colors"
          >
            <Sparkles className="w-4 h-4 text-np-accent" />
            <span>Published catalog</span>
          </Link>
          <Link
            href="/admin/review"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-np-accent hover:bg-[#5a9dff] text-white text-xs font-semibold transition-colors shadow-lg shadow-np"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Open Review Queue</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-np-lg bg-np-surface border border-np-border space-y-2">
          <div className="flex items-center justify-between text-xs text-np-muted">
            <span>Sources Monitored</span>
            <Radio className="w-4 h-4 text-np-verify" />
          </div>
          <div className="text-3xl font-extrabold text-np-text font-mono">
            {stats.sources_monitored}
          </div>
          <div className="text-[11px] text-np-verify flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3 h-3" />
            <span>{stats.active_sources} active</span>
          </div>
        </div>

        <Link href="/admin/opportunities" className="p-5 rounded-np-lg bg-np-surface border border-np-border space-y-2 block hover:border-np-accent/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-np-muted">
            <span>Canonical Opportunities</span>
            <Sparkles className="w-4 h-4 text-np-accent" />
          </div>
          <div className="text-3xl font-extrabold text-np-accent font-mono">
            {stats.opportunities_published}
          </div>
          <div className="text-[11px] text-np-muted">
            {stats.opportunities_discovered} total rows · manage live catalog
          </div>
        </Link>

        <div className="p-5 rounded-np-lg bg-np-surface border border-np-border space-y-2">
          <div className="flex items-center justify-between text-xs text-np-muted">
            <span>Duplicates Merged</span>
            <Layers className="w-4 h-4 text-np-online" />
          </div>
          <div className="text-3xl font-extrabold text-np-online font-mono">
            {stats.duplicates_resolved}
          </div>
          <div className="text-[11px] text-np-muted">
            Linked source items minus unique events
          </div>
        </div>

        <div className="p-5 rounded-np-lg bg-np-surface border border-np-border space-y-2">
          <div className="flex items-center justify-between text-xs text-np-muted">
            <span>Verification Queue</span>
            <AlertTriangle className="w-4 h-4 text-np-warn" />
          </div>
          <div className="text-3xl font-extrabold text-np-warn font-mono">
            {stats.pending_verification}
          </div>
          <div className="text-[11px] text-np-muted">
            Awaiting editorial confirmation
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-np-lg bg-np-surface/80 border border-np-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-np-text flex items-center gap-2">
              <Activity className="w-4 h-4 text-np-accent" />
              <span>Live services</span>
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-np-surface-2 text-np-muted">
              {extractionPct}% successful crawl runs
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-np-bg border border-np-border">
              <span className="text-np-muted">Database</span>
              <span className={dbStatus === "healthy" ? "text-np-verify font-medium" : "text-np-warn font-medium"}>
                {dbStatus}
                {diagnostics.database?.latency_ms != null ? ` • ${diagnostics.database.latency_ms}ms` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-np-bg border border-np-border">
              <span className="text-np-muted">AI provider</span>
              <span className={aiStatus === "healthy" ? "text-np-verify font-medium" : "text-np-warn font-medium"}>
                {aiStatus} • {activeProvider} {activeModel !== "—" ? `(${activeModel})` : ""}
              </span>
            </div>
            <OfficeModelCheck initial={office} />
          </div>
        </div>

        <div className="p-6 rounded-np-lg bg-np-surface/80 border border-np-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-np-text flex items-center gap-2">
              <Layers className="w-4 h-4 text-np-online" />
              <span>How publishing works</span>
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-np-online/15 text-np-online">
              Queue first
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-np-bg border border-np-border">
              <span className="text-np-muted">Auto-publish needs a real title plus a deadline or apply URL</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-np-bg border border-np-border">
              <span className="text-np-muted">Everything else waits in Verification Queue</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-np-bg border border-np-border">
              <span className="text-np-muted">Websites: Add Source then Crawl Now. Facebook/Instagram: Apify or Curator</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-np-lg bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-np-accent/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-np-text">Add a website and crawl it</h3>
          <p className="text-xs text-np-muted mt-0.5">
            Test a URL, save it as a source, then run Crawl Now. Auto-crawl stays off until Qwen is connected.
          </p>
        </div>
        <Link
          href="/admin/sources"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-np-accent hover:bg-[#5a9dff] text-white text-xs font-semibold transition-colors shrink-0"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Open Sources</span>
        </Link>
      </div>
    </div>
  );
}
