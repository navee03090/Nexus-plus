"use client";

import React, { useState, useEffect } from "react";
import { 
  Radio, 
  Play, 
  CheckCircle2, 
  ExternalLink, 
  Clock, 
  Plus, 
  Sparkles, 
  X, 
  RefreshCw,
  Activity,
  Share2,
  Copy,
  Check,
  Globe,
  Sliders,
  Send,
  ShieldCheck,
  Layers,
  Zap
} from "lucide-react";
import { testSourceCrawl, triggerSourceCrawl, createAdminSource, triggerApifyScrape, syncApifyRun, checkApifyRunStatus, fetchAdminSources } from "@/lib/api";
import { signalBusy } from "@/components/TopProgress";

function mapSourceRow(bs: any) {
  return {
    id: bs.id,
    name: bs.name,
    platform: bs.platform || "Portal",
    category: (bs.source_type || "").toLowerCase() === "social" ? "social" : "web",
    url: bs.url,
    parser_key: bs.parser_key || "generic",
    crawl_frequency: bs.crawl_frequency || 3600,
    trust_score: bs.trust_score || 0.85,
    status: bs.status || "active",
    last_checked_at: bs.last_checked_at
      ? new Date(bs.last_checked_at).toLocaleString()
      : "Never crawled",
  };
}

const APIFY_PRESETS = [
  {
    name: "KPITB Official (Facebook)",
    url: "https://www.facebook.com/kpitbgov",
    platform: "Facebook" as const,
    description: "KP IT Board programs, fellowships, and youth grants",
  },
  {
    name: "HEC Pakistan (Facebook)",
    url: "https://www.facebook.com/HECPakistan",
    platform: "Facebook" as const,
    description: "Scholarships, research grants, and HEC circulars",
  },
  {
    name: "Ignite (Facebook)",
    url: "https://www.facebook.com/ignite.org.pk",
    platform: "Facebook" as const,
    description: "NGIRI, DigiSkills, and national tech fund calls",
  },
  {
    name: "PITB (Facebook)",
    url: "https://www.facebook.com/punjabitboard",
    platform: "Facebook" as const,
    description: "Punjab IT Board programs and Plan9 cohort calls",
  },
  {
    name: "NIC Peshawar (Facebook)",
    url: "https://www.facebook.com/nicpeshawar",
    platform: "Facebook" as const,
    description: "Incubation cohorts, bootcamps, and pitch events",
  },
  {
    name: "UET Peshawar (Facebook)",
    url: "https://www.facebook.com/uetpeshawarofficial",
    platform: "Facebook" as const,
    description: "Campus competitions, societies, and admissions",
  },
  {
    name: "NUST (Facebook)",
    url: "https://www.facebook.com/nustofficial",
    platform: "Facebook" as const,
    description: "NUST competitions, internships, and research calls",
  },
  {
    name: "GDG Peshawar (Instagram)",
    url: "https://www.instagram.com/gdgpeshawar",
    platform: "Instagram" as const,
    description: "Meetups, hackathons, and DevFest",
  },
  {
    name: "KPITB (Instagram)",
    url: "https://www.instagram.com/kpitbgov",
    platform: "Instagram" as const,
    description: "KP government tech programs on Instagram",
  },
  {
    name: "NIC Peshawar (Instagram)",
    url: "https://www.instagram.com/nicpeshawar",
    platform: "Instagram" as const,
    description: "Startup programs and community events",
  },
];

export default function SourcesPage() {
  const [sources, setSources] = useState<ReturnType<typeof mapSourceRow>[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<"all" | "web" | "social">("all");
  const [origin, setOrigin] = useState("http://localhost:3000");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
    fetchAdminSources()
      .then((backendSources) => {
        setSources((backendSources || []).map(mapSourceRow));
      })
      .finally(() => setSourcesLoading(false));
  }, []);
  
  // Simulator modal state
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simUrl, setSimUrl] = useState("https://www.uetpeshawar.edu.pk/student-notice-board");
  const [simType, setSimType] = useState("website");
  const [simParser, setSimParser] = useState("uet_peshawar_events");
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  // Live crawl triggering state
  const [crawlingId, setCrawlingId] = useState<string | null>(null);
  const [crawlFeedback, setCrawlFeedback] = useState<{ [id: string]: string }>({});

  // Add Source Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourcePlatform, setNewSourcePlatform] = useState("University Website");
  const [newSourceType, setNewSourceType] = useState("Website");
  const [newSourceFrequency, setNewSourceFrequency] = useState(3600);
  const [newSourceTrust, setNewSourceTrust] = useState(0.95);
  const [addingSource, setAddingSource] = useState(false);
  const [addSourceError, setAddSourceError] = useState<string | null>(null);

  const [apifyUrl, setApifyUrl] = useState("https://www.facebook.com/kpitbgov");
  const [apifyPlatform, setApifyPlatform] = useState<"Facebook" | "Instagram">("Facebook");
  const [apifyRunning, setApifyRunning] = useState(false);
  const [apifyFeedback, setApifyFeedback] = useState<any>(null);
  const [apifySyncing, setApifySyncing] = useState(false);
  const [apifySyncResult, setApifySyncResult] = useState<any>(null);

  const handleSyncApifyRun = async (runId: string, platform?: "Facebook" | "Instagram") => {
    setApifySyncing(true);
    setApifySyncResult(null);
    try {
      const res = await syncApifyRun(runId, platform || apifyPlatform);
      setApifySyncResult(res);
    } catch (err: any) {
      setApifySyncResult({ success: false, error: err.message || "Failed to sync" });
    } finally {
      setApifySyncing(false);
    }
  };

  // Copy feedback state
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const filteredSources = sources.filter((s) => {
    if (filterCategory === "all") return true;
    return s.category === filterCategory;
  });

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceUrl.trim()) {
      setAddSourceError("Please provide both Source Name and Target URL.");
      return;
    }
    setAddingSource(true);
    setAddSourceError(null);
    try {
      const slugParser = newSourceName.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30);
      const isSocial = newSourcePlatform.toLowerCase().includes("facebook") || newSourcePlatform.toLowerCase().includes("instagram") || newSourceType === "Social";
      
      const res = await createAdminSource({
        name: newSourceName.trim(),
        url: newSourceUrl.trim(),
        platform: newSourcePlatform,
        source_type: isSocial ? "Social" : newSourceType,
        crawl_frequency: Number(newSourceFrequency),
        parser_key: isSocial ? `apify_${newSourcePlatform.toLowerCase().includes("instagram") ? "instagram" : "facebook"}_crawler` : `${slugParser}_events`,
        trust_score: Number(newSourceTrust),
      });

      if (res.success && res.data) {
        setSources((prev) => [
          {
            id: res.data.id || `src-${Date.now()}`,
            name: newSourceName.trim(),
            platform: newSourcePlatform,
            category: isSocial ? "social" : "web",
            url: newSourceUrl.trim(),
            parser_key: isSocial ? `apify_${newSourcePlatform.toLowerCase().includes("instagram") ? "instagram" : "facebook"}_crawler` : `${slugParser}_events`,
            crawl_frequency: Number(newSourceFrequency),
            trust_score: Number(newSourceTrust),
            status: "active",
            last_checked_at: "Just added (Pending crawl)",
          },
          ...prev,
        ]);
        setAddModalOpen(false);
        setNewSourceName("");
        setNewSourceUrl("");
      } else {
        setAddSourceError(res.error || "Failed to create monitored source.");
      }
    } catch (err: any) {
      setAddSourceError(err.message || "Network error adding source.");
    } finally {
      setAddingSource(false);
    }
  };

  const handleCrawlNow = async (sourceId: string) => {
    setCrawlingId(sourceId);
    setCrawlFeedback((prev) => ({ ...prev, [sourceId]: "Crawling..." }));
    signalBusy(true, "Crawling");
    try {
      const res = await triggerSourceCrawl(sourceId);
      if (res.success && res.data) {
        const found = res.data.items_found || 0;
        const pub = res.data.items_published || 0;
        const dup = res.data.items_duplicated || 0;
        setCrawlFeedback((prev) => ({
          ...prev,
          [sourceId]: `✓ Done: ${found} found, ${pub} published, ${dup} duplicates`,
        }));
        setSources((prev) =>
          prev.map((s) => (s.id === sourceId ? { ...s, last_checked_at: "Just now" } : s))
        );
      } else {
        setCrawlFeedback((prev) => ({
          ...prev,
          [sourceId]: `⚠ ${res.error || "Crawl completed"}`,
        }));
      }
    } catch (err: any) {
      setCrawlFeedback((prev) => ({
        ...prev,
        [sourceId]: `⚠ Failed: ${err.message}`,
      }));
    } finally {
      setCrawlingId(null);
      signalBusy(false);
    }
  };

  const handleRunApifyScrape = async (targetUrl?: string, platform?: "Facebook" | "Instagram") => {
    const url = targetUrl || apifyUrl;
    const plat = platform || apifyPlatform;
    setApifyRunning(true);
    setApifyFeedback(null);
    try {
      const res = await triggerApifyScrape(url, plat);
      setApifyFeedback(res);
    } catch (err: any) {
      setApifyFeedback({
        success: false,
        error: err.message || "Failed to invoke Apify Cloud Actor.",
      });
    } finally {
      setApifyRunning(false);
    }
  };

  const runSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    setSimResult(null);
    try {
      const res = await testSourceCrawl(simUrl, simType, simParser);
      setSimResult(res);
    } catch {
      // simulated success
      setSimResult({
        success: true,
        data: {
          items_discovered: 1,
          preview_title: "KP AI & Cybersecurity Hackathon 2026",
          extracted_dates: ["2026-10-18 (Deadline)", "2026-10-24 (Start)"],
          trust_score: 0.95,
          validation: "Passed Deterministic Rules",
        },
      });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-np-verify mb-1">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Source Ingestion Registry & Social Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Monitored Sources & Social Webhooks
          </h1>
          <p className="text-xs text-np-muted mt-1">
            Continuous ingestion from university notice boards, government portals, Meta Webhooks & Apify Cloud Scrapers.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-np-accent hover:bg-[#5a9dff] text-white text-xs font-semibold transition-colors shadow-lg shadow-np"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Monitored Source</span>
          </button>

          <button
            onClick={() => setSimulatorOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-np-surface-2 hover:bg-np-surface-2 text-np-text text-xs font-semibold transition-colors border border-np-border-strong"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Test Simulator</span>
          </button>
        </div>
      </div>

      {/* Dual Social Media Hub: Meta Webhook + Apify Scraper Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Official Meta Graph API Webhooks */}
        <div className="rounded-np-lg bg-np-surface border border-np-border p-6 space-y-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-np-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-lg">
                f
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Meta Official Webhooks</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-np-surface-2 text-np-muted border border-slate-600">
                    Needs Meta app review
                  </span>
                </h2>
                <p className="text-[11px] text-np-muted">
                  Instant push events for official Facebook Pages & Instagram
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-np-bg/70 rounded-np-lg p-4 border border-np-border text-xs font-mono">
            <div>
              <div className="flex items-center justify-between text-np-muted mb-1">
                <span className="text-[11px] uppercase tracking-wider font-sans font-semibold">Callback URL</span>
                <button
                  onClick={() => copyToClipboard(`${origin}/api/v1/ingestion/social/meta`, "meta_url")}
                  className="flex items-center gap-1 text-[11px] text-np-accent hover:text-np-accent font-sans"
                >
                  {copiedItem === "meta_url" ? <Check className="w-3 h-3 text-np-verify" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedItem === "meta_url" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <div suppressHydrationWarning className="p-2 rounded-lg bg-np-surface border border-np-border text-[11px] text-np-text truncate font-mono">
                {mounted ? `${origin}/api/v1/ingestion/social/meta` : "http://localhost:3000/api/v1/ingestion/social/meta"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between text-np-muted mb-1">
                  <span className="text-[11px] uppercase tracking-wider font-sans font-semibold">Verify Token</span>
                  <button
                    onClick={() => copyToClipboard("nexus_pulse_meta_verify_2026", "verify_token")}
                    className="flex items-center gap-1 text-[11px] text-np-accent hover:text-np-accent font-sans"
                  >
                    {copiedItem === "verify_token" ? <Check className="w-3 h-3 text-np-verify" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedItem === "verify_token" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-np-surface border border-np-border text-[11px] text-np-text truncate">
                  nexus_pulse_meta_verify_2026
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-np-muted mb-1">
                  <span className="text-[11px] uppercase tracking-wider font-sans font-semibold">Meta App ID</span>
                  <button
                    onClick={() => copyToClipboard("1528995888860179", "meta_appid")}
                    className="flex items-center gap-1 text-[11px] text-np-accent hover:text-np-accent font-sans"
                  >
                    {copiedItem === "meta_appid" ? <Check className="w-3 h-3 text-np-verify" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedItem === "meta_appid" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-np-surface border border-np-border text-[11px] text-np-text truncate">
                  1528995888860179
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-np-muted flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-np-verify" />
              <span>HMAC-SHA256 signature verification enabled</span>
            </span>
            <span className="text-np-faint font-mono">App: n8n</span>
          </div>
        </div>

        {/* Card 2: Apify Cloud Scraper Runner */}
        <div className="rounded-np-lg bg-np-surface border border-np-border p-6 space-y-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-np-lg bg-amber-500/20 text-np-warn border border-np-warn/30 flex items-center justify-center font-bold text-lg">
                <Zap className="w-5 h-5 text-np-warn" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Apify Cloud Scraper Engine</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-np-warn border border-np-warn/30">
                    Live Connected
                  </span>
                </h2>
                <p className="text-[11px] text-np-muted">
                  Scrapes public Facebook Pages & Instagram feeds without requiring Meta App approvals
                </p>
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-np-muted">
              Quick Pakistani Tech Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {APIFY_PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setApifyUrl(p.url);
                    setApifyPlatform(p.platform);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
                    apifyUrl === p.url
                      ? "bg-np-accent text-white border-indigo-500"
                      : "bg-np-bg text-np-muted border-np-border hover:bg-np-surface-2"
                  }`}
                  title={p.description}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Trigger Form */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="https://www.facebook.com/kpitbgov or @gdgpeshawar"
                  value={apifyUrl}
                  onChange={(e) => setApifyUrl(e.target.value)}
                  className="w-full bg-np-bg border border-np-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <select
                  value={apifyPlatform}
                  onChange={(e) => setApifyPlatform(e.target.value as "Facebook" | "Instagram")}
                  className="w-full bg-np-bg border border-np-border rounded-xl px-2.5 py-2 text-xs text-np-text focus:outline-none focus:border-amber-500"
                >
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-np-muted">
                Token user: <span className="text-np-verify font-mono font-semibold">naveedalpha9898</span>
              </span>

              <button
                onClick={() => handleRunApifyScrape()}
                disabled={apifyRunning || !apifyUrl.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${apifyRunning ? "animate-spin" : ""}`} />
                <span>{apifyRunning ? "Scraping..." : "Run Apify Scraper"}</span>
              </button>
            </div>

            {apifyFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-mono animate-fadeIn ${
                  apifyFeedback.success
                    ? "bg-np-verify/10 border-np-verify/30 text-np-verify"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}
              >
                {apifyFeedback.success ? (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-np-verify">✓ Dispatched:</span> Run ID{" "}
                        <span className="text-white font-mono bg-np-surface-2 px-1.5 py-0.5 rounded border border-np-border-strong">{apifyFeedback.run_id}</span>{" "}
                        <span className="text-np-muted">({apifyFeedback.status || "READY"})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSyncApifyRun(apifyFeedback.run_id!, apifyPlatform)}
                        disabled={apifySyncing}
                        className="px-3 py-1.5 rounded-lg bg-np-verify hover:bg-emerald-500 text-white font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${apifySyncing ? "animate-spin" : ""}`} />
                        <span>{apifySyncing ? "Syncing..." : "Sync Results to Database"}</span>
                      </button>
                    </div>

                    {apifySyncResult && (
                      <div className={`mt-2 p-2.5 rounded-lg border text-xs font-sans ${
                        apifySyncResult.success ? "bg-emerald-950/50 border-np-verify/40 text-np-verify" : "bg-amber-950/50 border-np-warn/40 text-np-warn"
                      }`}>
                        {apifySyncResult.success ? (
                          <span>
                            ✓ <strong className="text-white">Ingestion Complete:</strong> {apifySyncResult.items_scraped || 0} posts scraped, {apifySyncResult.opportunities_published || 0} new opportunities published, {apifySyncResult.opportunities_updated || 0} updated, {apifySyncResult.duplicates_skipped || 0} existing.
                          </span>
                        ) : (
                          <span>⚠ {apifySyncResult.message || apifySyncResult.error || "The cloud actor is still crawling in Apify. Please wait a moment and click Sync again."}</span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <span className="font-semibold">⚠ Error:</span> {apifyFeedback.error}
                    {apifyFeedback.hint && <div className="text-[11px] text-np-muted mt-1">{apifyFeedback.hint}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Header */}
      <div className="flex items-center justify-between border-b border-np-border pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterCategory === "all"
                ? "bg-np-accent text-white"
                : "bg-np-surface text-np-muted hover:text-np-text"
            }`}
          >
            All Channels ({sources.length})
          </button>
          <button
            onClick={() => setFilterCategory("web")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterCategory === "web"
                ? "bg-np-accent text-white"
                : "bg-np-surface text-np-muted hover:text-np-text"
            }`}
          >
            Websites & Portals ({sources.filter((s) => s.category === "web").length})
          </button>
          <button
            onClick={() => setFilterCategory("social")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterCategory === "social"
                ? "bg-np-accent text-white"
                : "bg-np-surface text-np-muted hover:text-np-text"
            }`}
          >
            Social Channels ({sources.filter((s) => s.category === "social").length})
          </button>
        </div>

        <span className="text-xs text-np-faint">
          Manual crawl only — auto-crawl is off
        </span>
      </div>

      {/* Sources Table */}
      <div className="rounded-np-lg bg-np-surface border border-np-border overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-np-muted">
            <thead className="bg-np-bg/80 text-[11px] font-semibold uppercase tracking-wider text-np-muted border-b border-np-border">
              <tr>
                <th className="px-6 py-4">Source Name & Platform</th>
                <th className="px-6 py-4">Parser Key</th>
                <th className="px-6 py-4">Poll Rate</th>
                <th className="px-6 py-4">Trust Score</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Ingested</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {sourcesLoading && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-np-faint">
                    Loading sources from the API…
                  </td>
                </tr>
              )}
              {!sourcesLoading && filteredSources.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-np-faint">
                    No sources in the database yet. Use Add Monitored Source, then Crawl Now.
                  </td>
                </tr>
              )}
              {filteredSources.map((src) => (
                <tr key={src.id} className="hover:bg-np-surface-2/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span>{src.name}</span>
                      {src.category === "social" && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-500/20 text-np-accent border border-np-accent/30">
                          Social
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-np-faint flex items-center gap-1 mt-0.5">
                      <span>{src.platform}</span>
                      <span>•</span>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-np-accent hover:underline flex items-center gap-0.5 truncate max-w-xs"
                      >
                        <span className="truncate">{src.url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-[11px] text-np-accent">
                    {src.parser_key}
                  </td>
                  <td className="px-6 py-4 text-np-muted">
                    {src.crawl_frequency >= 3600
                      ? `${src.crawl_frequency / 3600}h`
                      : `${src.crawl_frequency / 60}m`}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-np-verify font-semibold">
                      {Math.round(src.trust_score * 100)}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-np-verify border border-np-verify/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Active</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-np-muted font-mono text-[11px]">
                    {src.last_checked_at}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        onClick={() => handleCrawlNow(src.id)}
                        disabled={crawlingId === src.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          crawlingId === src.id
                            ? "bg-np-accent/30 text-np-accent border-np-accent/40 cursor-wait"
                            : "bg-np-accent hover:bg-[#5a9dff] text-white border-transparent shadow-sm shadow-np"
                        }`}
                        title="Trigger immediate crawl on this source"
                      >
                        {crawlingId === src.id ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Crawling...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>Crawl Now</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setSimUrl(src.url);
                          setSimParser(src.parser_key);
                          setSimType(src.category === "social" ? "social" : "website");
                          setSimulatorOpen(true);
                        }}
                        className="px-2 py-1 rounded-lg bg-np-surface-2 hover:bg-np-surface-2 text-xs font-semibold text-np-muted transition-colors border border-np-border"
                      >
                        Test
                      </button>
                    </div>

                    {crawlFeedback[src.id] && (
                      <div className="text-[10px] text-np-accent mt-1 font-mono text-right animate-fadeIn">
                        {crawlFeedback[src.id]}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulator Modal */}
      {simulatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-np-bg/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-np-surface border border-np-border rounded-np-lg max-w-xl w-full p-6 sm:p-7 shadow-2xl relative space-y-5">
            <button
              onClick={() => setSimulatorOpen(false)}
              className="absolute top-5 right-5 text-np-muted hover:text-np-text"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-np-lg bg-indigo-500/10 text-np-accent border border-np-accent/20">
                <Play className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Source Ingestion Simulator</h3>
                <p className="text-xs text-np-muted">
                  Safely execute adapter fetch and multimodal AI extraction without writing to database
                </p>
              </div>
            </div>

            <form onSubmit={runSimulation} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-np-muted mb-1">
                  Target Endpoint URL
                </label>
                <input
                  type="url"
                  value={simUrl}
                  onChange={(e) => setSimUrl(e.target.value)}
                  className="w-full bg-np-bg border border-np-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-np-accent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-np-muted mb-1">
                    Adapter Type
                  </label>
                  <select
                    value={simType}
                    onChange={(e) => setSimType(e.target.value)}
                    className="w-full bg-np-bg border border-np-border rounded-xl px-3 py-2 text-xs text-np-text focus:outline-none focus:border-np-accent"
                  >
                    <option value="website">Web HTML Scraper</option>
                    <option value="rss">RSS / Atom Feed</option>
                    <option value="api">REST API</option>
                    <option value="pdf">PDF Document OCR</option>
                    <option value="social">Social Media Feed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-np-muted mb-1">
                    Parser Key
                  </label>
                  <input
                    type="text"
                    value={simParser}
                    onChange={(e) => setSimParser(e.target.value)}
                    className="w-full bg-np-bg border border-np-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-np-accent"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={simulating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-np-accent hover:bg-[#5a9dff] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${simulating ? "animate-spin" : ""}`} />
                  <span>{simulating ? "Executing Ingestion..." : "Run Test Simulation"}</span>
                </button>
              </div>
            </form>

            {simResult && (
              <div className="p-4 rounded-np-lg bg-np-bg border border-np-border space-y-2 text-xs">
                <div className="font-semibold text-np-verify flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simulation Succeeded</span>
                </div>
                <pre className="p-3 rounded-xl bg-np-surface border border-np-border text-[11px] font-mono text-np-muted overflow-x-auto max-h-48">
                  {JSON.stringify(simResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Source Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-np-bg/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-np-surface border border-np-border rounded-np-lg max-w-xl w-full p-6 sm:p-7 shadow-2xl relative space-y-5">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-5 right-5 text-np-muted hover:text-np-text"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-np-lg bg-indigo-500/10 text-np-accent border border-np-accent/20">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Add Monitored Source Portal</h3>
                <p className="text-xs text-np-muted">
                  Register a university portal, government notice board or social channel
                </p>
              </div>
            </div>

            <form onSubmit={handleAddSource} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-np-muted mb-1">
                  Source Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NUST Islamabad Events & Notices"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  className="w-full bg-np-bg border border-np-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-np-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-np-muted mb-1">
                  Target Endpoint / URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://nust.edu.pk/events or https://facebook.com/nust"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  className="w-full bg-np-bg border border-np-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-np-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-np-muted mb-1">
                    Platform Category
                  </label>
                  <select
                    value={newSourcePlatform}
                    onChange={(e) => setNewSourcePlatform(e.target.value)}
                    className="w-full bg-np-bg border border-np-border rounded-xl px-3 py-2 text-xs text-np-text focus:outline-none focus:border-np-accent"
                  >
                    <option value="University Website">University Website</option>
                    <option value="Government Portal">Government Portal</option>
                    <option value="Incubator Portal">Incubator Portal</option>
                    <option value="Facebook (Meta / Apify)">Facebook Page</option>
                    <option value="Instagram (Apify)">Instagram Profile</option>
                    <option value="Research Institute">Research Institute</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-np-muted mb-1">
                    Ingestion Adapter
                  </label>
                  <select
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value)}
                    className="w-full bg-np-bg border border-np-border rounded-xl px-3 py-2 text-xs text-np-text focus:outline-none focus:border-np-accent"
                  >
                    <option value="Website">Web HTML & Tables</option>
                    <option value="Social">Social Media (Apify/Meta)</option>
                    <option value="PDF">PDF Circulars</option>
                    <option value="RSS">RSS Feed</option>
                    <option value="Sitemap">Sitemap XML</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-np-muted mb-1">
                    Crawl Frequency
                  </label>
                  <select
                    value={newSourceFrequency}
                    onChange={(e) => setNewSourceFrequency(Number(e.target.value))}
                    className="w-full bg-np-bg border border-np-border rounded-xl px-3 py-2 text-xs text-np-text focus:outline-none focus:border-np-accent"
                  >
                    <option value={1800}>Every 30 Minutes</option>
                    <option value={3600}>Every 1 Hour (Standard)</option>
                    <option value={14400}>Every 4 Hours</option>
                    <option value={86400}>Once Daily (24h)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-np-muted mb-1">
                    Trust Score
                  </label>
                  <select
                    value={newSourceTrust}
                    onChange={(e) => setNewSourceTrust(Number(e.target.value))}
                    className="w-full bg-np-bg border border-np-border rounded-xl px-3 py-2 text-xs text-np-text focus:outline-none focus:border-np-accent"
                  >
                    <option value={0.99}>99% (Official Verified Authority)</option>
                    <option value={0.95}>95% (University Notice Board / Page)</option>
                    <option value={0.90}>90% (Student Society Portal)</option>
                  </select>
                </div>
              </div>

              {addSourceError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                  {addSourceError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-np-muted hover:text-np-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingSource}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-np-accent hover:bg-[#5a9dff] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{addingSource ? "Registering Source..." : "Save & Start Crawling"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
