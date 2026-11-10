"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  UploadCloud, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  QrCode, 
  FileText, 
  Image as ImageIcon, 
  X, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  MapPin,
  RefreshCw,
  Globe,
  Share2,
  Copy,
  ChevronRight
} from "lucide-react";
import { curateOpportunity, CuratorResult } from "@/lib/api";

type PlatformType = "LinkedIn" | "Facebook" | "Instagram" | "Twitter" | "Web";

const PLATFORMS: { name: PlatformType; color: string; bg: string; border: string; example: string }[] = [
  { 
    name: "LinkedIn", 
    color: "text-sky-400", 
    bg: "bg-sky-500/10", 
    border: "border-sky-500/30",
    example: "https://www.linkedin.com/posts/uetpeshawar_ai-hackathon-2026-activity-..."
  },
  { 
    name: "Facebook", 
    color: "text-blue-400", 
    bg: "bg-blue-500/10", 
    border: "border-blue-500/30",
    example: "https://www.facebook.com/kpitbgov/posts/pfbid02..."
  },
  { 
    name: "Instagram", 
    color: "text-pink-400", 
    bg: "bg-pink-500/10", 
    border: "border-pink-500/30",
    example: "https://www.instagram.com/p/DB12345..."
  },
  { 
    name: "Twitter", 
    color: "text-np-muted", 
    bg: "bg-slate-700/20", 
    border: "border-slate-600/30",
    example: "https://x.com/nicpeshawar/status/1842..."
  },
  { 
    name: "Web", 
    color: "text-np-verify", 
    bg: "bg-np-verify/10", 
    border: "border-np-verify/30",
    example: "https://www.uetpeshawar.edu.pk/student-notice-board"
  },
];

export default function AdminCuratorDropPage() {
  const [platform, setPlatform] = useState<PlatformType>("LinkedIn");
  const [sourceUrl, setSourceUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [tags, setTags] = useState("");
  const [flyerUrl, setFlyerUrl] = useState("");
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressStep, setProgressStep] = useState<string | null>(null);
  const [result, setResult] = useState<CuratorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOcr, setShowOcr] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global paste handler to capture flyer screenshots directly via Ctrl+V
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const pastedFile = items[i].getAsFile();
          if (pastedFile) {
            handleSelectedFile(pastedFile);
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleSelectedFile = (selectedFile: File) => {
    setFile(selectedFile);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith("image/")) {
        handleSelectedFile(droppedFile);
      } else {
        setError("Please drop a valid image file (.png, .jpg, .webp).");
      }
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceUrl.trim()) {
      setError("Please provide the canonical source URL (the post or notice link).");
      return;
    }

    if (!file && !flyerUrl.trim() && !rawText.trim()) {
      setError("Please provide either a flyer image, flyer image URL, or announcement text.");
      return;
    }

    setError(null);
    setResult(null);
    setIsSubmitting(true);
    setProgressStep("1/4 Ingesting raw evidence & verifying cryptographic hash...");

    const formData = new FormData();
    formData.append("source_url", sourceUrl.trim());
    formData.append("platform", platform);
    if (rawText.trim()) formData.append("raw_text", rawText.trim());
    if (tags.trim()) formData.append("tags", tags.trim());
    if (file) formData.append("flyer_file", file);
    if (flyerUrl.trim()) formData.append("flyer_url", flyerUrl.trim());

    // Simulated progress steps for better user feedback
    const timer1 = setTimeout(() => {
      setProgressStep("2/4 Decoding embedded QR codes & applying Otsu binarization OCR...");
    }, 900);

    const timer2 = setTimeout(() => {
      setProgressStep("3/4 Running multimodal Gemini 2.5 Flash reasoning & cross-referencing provenance...");
    }, 2200);

    const timer3 = setTimeout(() => {
      setProgressStep("4/4 Resolving canonical opportunity, checking duplicates & publishing...");
    }, 3800);

    try {
      const resp = await curateOpportunity(formData);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (resp.success && resp.data) {
        setResult(resp.data);
      } else {
        setError(resp.error || "Failed to process curation. Please review URL and try again.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during ingestion.");
    } finally {
      setIsSubmitting(false);
      setProgressStep(null);
    }
  };

  const resetForm = () => {
    setSourceUrl("");
    setRawText("");
    setTags("");
    setFlyerUrl("");
    handleRemoveFile();
    setResult(null);
    setError(null);
  };

  const activePlatformConfig = PLATFORMS.find((p) => p.name === platform) || PLATFORMS[0];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-np-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-np-accent mb-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>Curator Station • Phase 1 Ingestion Pipeline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Social Media & Flyer Ingestion
          </h1>
          <p className="text-xs sm:text-sm text-np-muted mt-1 max-w-2xl">
            Drop flyers, paste screenshots with <kbd className="px-1.5 py-0.5 rounded bg-np-surface-2 border border-np-border-strong text-np-muted font-mono text-[11px]">Ctrl+V</kbd>, or submit LinkedIn/Facebook post links. Nexus Pulse extracts structured data with QR decoding, OCR, and Gemini verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/review"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-np-surface-2 hover:bg-np-surface-2 text-np-text text-xs font-medium border border-np-border-strong transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-np-verify" />
            <span>Verification Queue</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Form (Left) & Extraction Live Output (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Form: 7 Columns */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className="p-6 rounded-np-lg bg-np-surface border border-np-border space-y-6 shadow-xl">
            
            {/* 1. Platform Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-np-muted mb-2">
                1. Select Announcement Platform
              </label>
              <div className="grid grid-cols-5 gap-2">
                {PLATFORMS.map((p) => {
                  const isSelected = platform === p.name;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setPlatform(p.name)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-semibold transition-all border ${
                        isSelected
                          ? `${p.bg} ${p.border} ${p.color} ring-1 ring-indigo-500`
                          : "bg-np-bg/60 border-np-border text-np-muted hover:text-np-text hover:border-np-border-strong"
                      }`}
                    >
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Source URL */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-np-muted">
                  2. Canonical Post / Source URL <span className="text-red-400">*</span>
                </label>
                <span className="text-[10px] text-np-faint">Immutable Provenance Source</span>
              </div>
              <div className="relative">
                <input
                  type="url"
                  required
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder={activePlatformConfig.example}
                  className="w-full px-4 py-2.5 rounded-xl bg-np-bg border border-np-border text-np-text placeholder-slate-600 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <p className="text-[11px] text-np-faint mt-1">
                Zero-hallucination guarantee: All public users can verify this opportunity against this exact link.
              </p>
            </div>

            {/* 3. Flyer Upload & Dropzone */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-np-muted">
                  3. Flyer / Poster Image
                </label>
                <span className="text-[10px] text-np-accent">
                  Tip: Press <kbd className="px-1 py-0.5 rounded bg-np-surface-2 text-np-muted font-mono text-[9px]">Ctrl+V</kbd> anywhere to paste screenshot
                </span>
              </div>

              {!previewUrl ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-np-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-np-border bg-np-bg/60 hover:border-np-border-strong hover:bg-np-bg"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-12 h-12 rounded-np-lg bg-np-accent/10 border border-np-accent/20 flex items-center justify-center text-np-accent mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-semibold text-np-text">
                    Click to browse or drag & drop poster
                  </div>
                  <div className="text-[11px] text-np-faint mt-1">
                    PNG, JPG, or WebP up to 15MB • Automatic QR & OCR extraction
                  </div>
                </div>
              ) : (
                <div className="relative rounded-np-lg overflow-hidden border border-np-border-strong bg-np-bg p-3 flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-np-surface border border-np-border flex-shrink-0 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Flyer Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-np-text truncate">
                      {file?.name || "Pasted Flyer Image"}
                    </div>
                    <div className="text-[11px] text-np-muted mt-0.5">
                      {file ? `${(file.size / 1024).toFixed(1)} KB` : "Clipboard Data"} • Ready for OCR & Vision
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-np-verify bg-np-verify/10 px-2 py-0.5 rounded-full border border-np-verify/20">
                        <CheckCircle2 className="w-3 h-3" /> Image Loaded
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 rounded-lg bg-np-surface-2 hover:bg-red-500/20 text-np-muted hover:text-red-400 transition-colors"
                    title="Remove Flyer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Alternative Flyer URL input */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-np-faint uppercase tracking-wider">or CDN URL:</span>
                <input
                  type="url"
                  value={flyerUrl}
                  onChange={(e) => setFlyerUrl(e.target.value)}
                  placeholder="https://.../poster.jpg (optional direct image link)"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-np-bg border border-np-border text-[11px] text-np-text placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* 4. Raw Post Text / Caption */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-np-muted">
                  4. Post Caption / Announcement Text
                </label>
                <span className="text-[10px] text-np-faint">Optional Context</span>
              </div>
              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste the caption, post body, speaker details, or registration instructions here..."
                className="w-full px-4 py-2.5 rounded-xl bg-np-bg border border-np-border text-np-text placeholder-slate-600 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            {/* 5. Optional Tags */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-np-muted mb-2">
                5. Tags / Taxonomy Hints (Comma Separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. Hackathon, AI, Peshawar, Undergraduate, KPITB"
                className="w-full px-4 py-2.5 rounded-xl bg-np-bg border border-np-border text-np-text placeholder-slate-600 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Ingestion Alert</div>
                  <p className="text-[11px] text-red-400/90 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-np-muted hover:text-np-text transition-colors"
              >
                Clear Form
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold text-white shadow-lg transition-all ${
                  isSubmitting
                    ? "bg-np-accent/50 cursor-not-allowed"
                    : "bg-np-accent hover:bg-[#5a9dff] shadow-np hover:scale-[1.01]"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Ingestion...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-np-accent" />
                    <span>Run Multimodal Extraction</span>
                  </>
                )}
              </button>
            </div>

            {/* Real-time Progress Stepper */}
            {isSubmitting && progressStep && (
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-np-accent">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  <span>{progressStep}</span>
                </div>
                <div className="w-full bg-np-surface rounded-full h-1 overflow-hidden">
                  <div className="bg-indigo-500 h-1 rounded-full animate-pulse w-3/4" />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Right Preview & Telemetry: 5 Columns */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Result Card */}
          {result ? (
            <div className="p-6 rounded-np-lg bg-np-surface border border-np-border space-y-5 shadow-2xl relative overflow-hidden animate-fadeIn">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  result.is_new
                    ? "bg-np-verify/10 text-np-verify border-np-verify/30"
                    : "bg-np-warn/10 text-np-warn border-np-warn/30"
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {result.is_new ? "New Opportunity Published" : "Existing Opportunity Updated"}
                </span>

                <div className="text-right">
                  <span className="text-[10px] text-np-faint block">Trust Score</span>
                  <span className="text-xs font-bold text-np-accent font-mono">
                    {Math.round(result.opportunity.trust_score * 100)}%
                  </span>
                </div>
              </div>

              {/* Flyer Thumbnail if available */}
              {result.opportunity.flyer_url && (
                <div className="w-full h-40 rounded-xl overflow-hidden bg-np-bg border border-np-border relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.opportunity.flyer_url}
                    alt={result.opportunity.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-np-bg/80 backdrop-blur text-[10px] font-mono text-np-muted border border-np-border">
                    Flyer Stored & Fingerprinted
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-base font-bold text-white leading-snug">
                  {result.opportunity.title}
                </h3>
                <p className="text-xs text-np-muted mt-1 line-clamp-3 leading-relaxed">
                  {result.opportunity.summary}
                </p>
              </div>

              {/* Key metadata grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-np-bg p-3.5 rounded-xl border border-np-border">
                <div>
                  <span className="text-[10px] text-np-faint block uppercase tracking-wider">Registration Deadline</span>
                  <div className="font-semibold text-np-text flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-np-accent" />
                    <span>
                      {result.opportunity.registration_deadline
                        ? new Date(result.opportunity.registration_deadline).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })
                        : "Ongoing / Not Specified"}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-np-faint block uppercase tracking-wider">Event Start Date</span>
                  <div className="font-semibold text-np-text flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-np-verify" />
                    <span>
                      {result.opportunity.start_date
                        ? new Date(result.opportunity.start_date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })
                        : "TBD"}
                    </span>
                  </div>
                </div>

                <div className="col-span-2 pt-2 border-t border-np-border">
                  <span className="text-[10px] text-np-faint block uppercase tracking-wider">Location / Venue</span>
                  <div className="font-medium text-np-muted flex items-center gap-1.5 mt-0.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-np-warn shrink-0" />
                    <span className="truncate">{result.opportunity.venue || result.opportunity.city || "Online / Nationwide"}</span>
                  </div>
                </div>
              </div>

              {/* Decoded QR Codes */}
              {result.qr_codes && result.qr_codes.length > 0 && (
                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-np-accent">
                    <QrCode className="w-4 h-4 text-np-accent" />
                    <span>Decoded Poster QR Code</span>
                  </div>
                  {result.qr_codes.map((qr, idx) => (
                    <a
                      key={idx}
                      href={qr}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-np-accent hover:text-np-accent hover:underline flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{qr}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ))}
                </div>
              )}

              {/* OCR Toggle */}
              {result.ocr_preview && (
                <div className="text-xs">
                  <button
                    type="button"
                    onClick={() => setShowOcr(!showOcr)}
                    className="text-np-muted hover:text-np-text flex items-center gap-1 font-medium transition-colors text-[11px]"
                  >
                    <span>{showOcr ? "Hide" : "Show"} Raw OCR Evidence Preview</span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showOcr ? "rotate-90" : ""}`} />
                  </button>
                  {showOcr && (
                    <div className="mt-2 p-3 rounded-xl bg-np-bg border border-np-border text-[11px] font-mono text-np-muted whitespace-pre-wrap max-h-36 overflow-y-auto">
                      {result.ocr_preview}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Link
                  href={`/opportunities/${result.opportunity.slug}`}
                  target="_blank"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-np-accent hover:bg-[#5a9dff] text-white text-xs font-semibold transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <span>View Public Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl bg-np-surface-2 hover:bg-np-surface-2 text-np-text text-xs font-medium transition-colors"
                >
                  Ingest Another
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-np-lg bg-np-surface border border-np-border space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-np-accent/10 border border-np-accent/20 flex items-center justify-center text-np-accent">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Multimodal Curation Engine</h3>
                  <p className="text-[11px] text-np-muted">Zero-hallucination verification active</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-np-muted">
                <div className="p-3 rounded-xl bg-np-bg border border-np-border space-y-1">
                  <div className="font-semibold text-np-text flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-np-accent" />
                    <span>1. Computer Vision & QR Decoding</span>
                  </div>
                  <p className="text-[11px] text-np-muted leading-relaxed">
                    Embedded QR codes on flyers are instantly decoded into direct Google Forms or registration portals with OpenCV.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-np-bg border border-np-border space-y-1">
                  <div className="font-semibold text-np-text flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-np-verify" />
                    <span>2. Otsu Binarization OCR</span>
                  </div>
                  <p className="text-[11px] text-np-muted leading-relaxed">
                    Text on noisy graphic posters is normalized and extracted as immutable evidence.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-np-bg border border-np-border space-y-1">
                  <div className="font-semibold text-np-text flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-np-warn" />
                    <span>3. Cross-Source Deduplication</span>
                  </div>
                  <p className="text-[11px] text-np-muted leading-relaxed">
                    If this event was already ingested from another source, dates and links are safely merged without creating duplicate cards.
                  </p>
                </div>
              </div>

              {/* Chrome Extension Promo Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-np-accent/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-np-accent" />
                  <span className="text-xs font-bold text-white">Browser Extension Active</span>
                </div>
                <p className="text-[11px] text-indigo-200/90 leading-relaxed">
                  Browse LinkedIn, Facebook, or university portals with the <strong>Nexus Pulse Curator Extension</strong>. Ingest announcements with 1 click directly from your browser feed.
                </p>
                <div className="text-[10px] text-np-accent font-mono bg-indigo-900/40 px-2.5 py-1.5 rounded-lg border border-indigo-700/40">
                  extension/ directory loaded • Manifest V3
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
