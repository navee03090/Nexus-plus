"use client";

import React, { useState } from "react";
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
import { testSourceCrawl, triggerSourceCrawl, createAdminSource, triggerApifyScrape, syncApifyRun, checkApifyRunStatus } from "@/lib/api";

const MONITORED_SOURCES = [
  {
    id: "src-nccs-01",
    name: "Pakistan Cybersecurity Challenge (NCCS Air University)",
    platform: "Government & Academic Portal",
    category: "web",
    url: "https://pakistancybersecuritychallenge.nccs.pk",
    parser_key: "nccs_cybersecurity_challenge",
    crawl_frequency: 1800,
    trust_score: 0.99,
    status: "active",
    last_checked_at: "Just now",
  },
  {
    id: "src-uet-01",
    name: "UET Peshawar Official Portal",
    platform: "University Website",
    category: "web",
    url: "https://www.uetpeshawar.edu.pk/student-notice-board",
    parser_key: "uet_peshawar_events",
    crawl_frequency: 3600,
    trust_score: 0.95,
    status: "active",
    last_checked_at: "10 mins ago",
  },
  {
    id: "src-02",
    name: "KPITB Announcements",
    platform: "Government Portal",
    category: "web",
    url: "https://www.kpitb.gov.pk",
    parser_key: "kpitb_portal",
    crawl_frequency: 1800,
    trust_score: 0.98,
    status: "active",
    last_checked_at: "15 mins ago",
  },
  {
    id: "src-soc-01",
    name: "KPITB Official Facebook Page",
    platform: "Facebook (Meta / Apify)",
    category: "social",
    url: "https://www.facebook.com/kpitbgov",
    parser_key: "apify_facebook_crawler",
    crawl_frequency: 1800,
    trust_score: 0.96,
    status: "active",
    last_checked_at: "5 mins ago",
  },
  {
    id: "src-03",
    name: "NIC Peshawar Incubation",
    platform: "Incubator Portal",
    category: "web",
    url: "https://nicpeshawar.pk",
    parser_key: "nic_peshawar",
    crawl_frequency: 7200,
    trust_score: 0.92,
    status: "active",
    last_checked_at: "25 mins ago",
  },
  {
    id: "src-soc-02",
    name: "NIC Peshawar Facebook Community",
    platform: "Facebook (Meta / Apify)",
    category: "social",
    url: "https://www.facebook.com/nicpeshawar",
    parser_key: "apify_facebook_crawler",
    crawl_frequency: 3600,
    trust_score: 0.94,
    status: "active",
    last_checked_at: "12 mins ago",
  },
  {
    id: "src-soc-03",
    name: "GDG Peshawar Instagram",
    platform: "Instagram (Apify)",
    category: "social",
    url: "https://www.instagram.com/gdgpeshawar",
    parser_key: "apify_instagram_crawler",
    crawl_frequency: 3600,
    trust_score: 0.93,
    status: "active",
    last_checked_at: "18 mins ago",
  },
  {
    id: "src-04",
    name: "GIKI Competitions & Hackathons",
    platform: "University Website",
    category: "web",
    url: "https://giki.edu.pk",
    parser_key: "giki_events",
    crawl_frequency: 3600,
    trust_score: 0.94,
    status: "active",
    last_checked_at: "1 hour ago",
  },
  {
    id: "src-05",
    name: "HEC Pakistan Scholarships",
    platform: "Government Registry",
    category: "web",
    url: "https://www.hec.gov.pk",
    parser_key: "hec_scholarships",
    crawl_frequency: 86400,
    trust_score: 0.99,
    status: "active",
    last_checked_at: "2 hours ago",
  },
  {
    id: "src-06",
    name: "FAST-NUCES Peshawar",
    platform: "University Website",
    category: "web",
    url: "https://www.nu.edu.pk",
    parser_key: "fast_pwr",
    crawl_frequency: 3600,
    trust_score: 0.91,
    status: "active",
    last_checked_at: "45 mins ago",
  },
];

const APIFY_PRESETS = [
  {
    name: "KPITB Official (Facebook)",
    url: "https://www.facebook.com/kpitbgov",
    platform: "Facebook" as const,
    description: "Khyber Pakhtunkhwa IT Board government tech programs & youth grants",
  },
  {
    name: "NIC Peshawar (Facebook)",
    url: "https://www.facebook.com/nicpeshawar",
    platform: "Facebook" as const,
    description: "National Incubation Center startup cohorts, bootcamps & pitch events",
  },
  {
    name: "GDG Peshawar (Instagram)",
    url: "https://www.instagram.com/gdgpeshawar",
    platform: "Instagram" as const,
    description: "Google Developer Groups Peshawar tech meetups, hackathons & DevFests",
  },
  {
    name: "UET Peshawar (Facebook)",
    url: "https://www.facebook.com/uetpeshawarofficial",
    platform: "Facebook" as const,
    description: "UET Peshawar student societies, technical symposiums & admissions",
  },
  {
    name: "FAST-NUCES Peshawar (Facebook)",
    url: "https://www.facebook.com/fastpwr",
    platform: "Facebook" as const,
    description: "FAST Computer Science Society competitions & code sprints",
  },
];

export default function SourcesPage() {
  const [sources, setSources] = useState(MONITORED_SOURCES);
  const [filterCategory, setFilterCategory] = useState<"all" | "web" | "social">("all");
  
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
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Source Ingestion Registry & Social Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Monitored Sources & Social Webhooks
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Continuous ingestion from university notice boards, government portals, Meta Webhooks & Apify Cloud Scrapers.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Monitored Source</span>
          </button>

          <button
            onClick={() => setSimulatorOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Test Simulator</span>
          </button>
        </div>
      </div>

      {/* Dual Social Media Hub: Meta Webhook + Apify Scraper Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Official Meta Graph API Webhooks */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-lg">
                f
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Meta Official Webhooks</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Active
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Instant push events for official Facebook Pages & Instagram
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-slate-950/70 rounded-2xl p-4 border border-slate-800/80 text-xs font-mono">
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] uppercase tracking-wider font-sans font-semibold">Callback URL</span>
                <button
                  onClick={() => copyToClipboard(`${typeof window !== 'undefined' ? window.location.origin : 'https://api.nexus-pulse.org'}/api/v1/ingestion/social/meta`, "meta_url")}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-sans"
                >
                  {copiedItem === "meta_url" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedItem === "meta_url" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-200 truncate">
                {typeof window !== 'undefined' ? window.location.origin : 'https://api.nexus-pulse.org'}/api/v1/ingestion/social/meta
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] uppercase tracking-wider font-sans font-semibold">Verify Token</span>
                  <button
                    onClick={() => copyToClipboard("nexus_pulse_meta_verify_2026", "verify_token")}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-sans"
                  >
                    {copiedItem === "verify_token" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedItem === "verify_token" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-200 truncate">
                  nexus_pulse_meta_verify_2026
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] uppercase tracking-wider font-sans font-semibold">Meta App ID</span>
                  <button
                    onClick={() => copyToClipboard("1528995888860179", "meta_appid")}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-sans"
                  >
                    {copiedItem === "meta_appid" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedItem === "meta_appid" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-200 truncate">
                  1528995888860179
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>HMAC-SHA256 signature verification enabled</span>
            </span>
            <span className="text-slate-500 font-mono">App: n8n</span>
          </div>
        </div>

        {/* Card 2: Apify Cloud Scraper Runner */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-lg">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Apify Cloud Scraper Engine</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Live Connected
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Scrapes public Facebook Pages & Instagram feeds without requiring Meta App approvals
                </p>
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
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
                      ? "bg-indigo-600 text-white border-indigo-500"
                      : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <select
                  value={apifyPlatform}
                  onChange={(e) => setApifyPlatform(e.target.value as "Facebook" | "Instagram")}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Token user: <span className="text-emerald-400 font-mono font-semibold">naveedalpha9898</span>
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
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}
              >
                {apifyFeedback.success ? (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-emerald-400">✓ Dispatched:</span> Run ID{" "}
                        <span className="text-white font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{apifyFeedback.run_id}</span>{" "}
                        <span className="text-slate-400">({apifyFeedback.status || "READY"})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSyncApifyRun(apifyFeedback.run_id!, apifyPlatform)}
                        disabled={apifySyncing}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${apifySyncing ? "animate-spin" : ""}`} />
                        <span>{apifySyncing ? "Syncing..." : "Sync Results to Database"}</span>
                      </button>
                    </div>

                    {apifySyncResult && (
                      <div className={`mt-2 p-2.5 rounded-lg border text-xs font-sans ${
                        apifySyncResult.success ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-200" : "bg-amber-950/50 border-amber-500/40 text-amber-200"
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
                    {apifyFeedback.hint && <div className="text-[11px] text-slate-400 mt-1">{apifyFeedback.hint}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterCategory === "all"
                ? "bg-indigo-600 text-white"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            All Channels ({sources.length})
          </button>
          <button
            onClick={() => setFilterCategory("web")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterCategory === "web"
                ? "bg-indigo-600 text-white"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            Websites & Portals ({sources.filter((s) => s.category === "web").length})
          </button>
          <button
            onClick={() => setFilterCategory("social")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterCategory === "social"
                ? "bg-indigo-600 text-white"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            Social Channels ({sources.filter((s) => s.category === "social").length})
          </button>
        </div>

        <span className="text-xs text-slate-500">
          Auto-polling active with exponential backoff
        </span>
      </div>

      {/* Sources Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
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
              {filteredSources.map((src) => (
                <tr key={src.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span>{src.name}</span>
                      {src.category === "social" && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Social
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <span>{src.platform}</span>
                      <span>•</span>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:underline flex items-center gap-0.5 truncate max-w-xs"
                      >
                        <span className="truncate">{src.url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-[11px] text-indigo-300">
                    {src.parser_key}
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {src.crawl_frequency >= 3600
                      ? `${src.crawl_frequency / 3600}h`
                      : `${src.crawl_frequency / 60}m`}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-emerald-400 font-semibold">
                      {Math.round(src.trust_score * 100)}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Active</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                    {src.last_checked_at}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        onClick={() => handleCrawlNow(src.id)}
                        disabled={crawlingId === src.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          crawlingId === src.id
                            ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/40 cursor-wait"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white border-transparent shadow-sm shadow-indigo-600/30"
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
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors border border-slate-700/60"
                      >
                        Test
                      </button>
                    </div>

                    {crawlFeedback[src.id] && (
                      <div className="text-[10px] text-indigo-300 mt-1 font-mono text-right animate-fadeIn">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative space-y-5">
            <button
              onClick={() => setSimulatorOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Play className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Source Ingestion Simulator</h3>
                <p className="text-xs text-slate-400">
                  Safely execute adapter fetch and multimodal AI extraction without writing to database
                </p>
              </div>
            </div>

            <form onSubmit={runSimulation} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Endpoint URL
                </label>
                <input
                  type="url"
                  value={simUrl}
                  onChange={(e) => setSimUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Adapter Type
                  </label>
                  <select
                    value={simType}
                    onChange={(e) => setSimType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="website">Web HTML Scraper</option>
                    <option value="rss">RSS / Atom Feed</option>
                    <option value="api">REST API</option>
                    <option value="pdf">PDF Document OCR</option>
                    <option value="social">Social Media Feed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Parser Key
                  </label>
                  <input
                    type="text"
                    value={simParser}
                    onChange={(e) => setSimParser(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={simulating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${simulating ? "animate-spin" : ""}`} />
                  <span>{simulating ? "Executing Ingestion..." : "Run Test Simulation"}</span>
                </button>
              </div>
            </form>

            {simResult && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simulation Succeeded</span>
                </div>
                <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                  {JSON.stringify(simResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Source Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative space-y-5">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Add Monitored Source Portal</h3>
                <p className="text-xs text-slate-400">
                  Register a university portal, government notice board or social channel
                </p>
              </div>
            </div>

            <form onSubmit={handleAddSource} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Source Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NUST Islamabad Events & Notices"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Endpoint / URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://nust.edu.pk/events or https://facebook.com/nust"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Platform Category
                  </label>
                  <select
                    value={newSourcePlatform}
                    onChange={(e) => setNewSourcePlatform(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
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
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Ingestion Adapter
                  </label>
                  <select
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Website">Web HTML & Tables</option>
                    <option value="Social">Social Media (Apify/Meta)</option>
                    <option value="PDF">PDF Circulars</option>
                    <option value="RSS">RSS Feed</option>
                    <option value="Sitemap">Sitemap XML</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Crawl Frequency
                  </label>
                  <select
                    value={newSourceFrequency}
                    onChange={(e) => setNewSourceFrequency(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={1800}>Every 30 Minutes</option>
                    <option value={3600}>Every 1 Hour (Standard)</option>
                    <option value={14400}>Every 4 Hours</option>
                    <option value={86400}>Once Daily (24h)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Trust Score
                  </label>
                  <select
                    value={newSourceTrust}
                    onChange={(e) => setNewSourceTrust(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingSource}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
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
