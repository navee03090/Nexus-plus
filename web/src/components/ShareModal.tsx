"use client";

import React, { useState } from "react";
import { Copy, Check, Share2, X, MessageSquare } from "lucide-react";
import { Opportunity } from "@/types";

interface ShareModalProps {
  opportunity: Opportunity;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ opportunity, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = typeof window !== "undefined" ? window.location.href : `https://nexuspulse.org/opportunities/${opportunity.slug}`;
  const shareText = `Check out "${opportunity.title}" on NEXUS PULSE — AI-verified opportunity intelligence:`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Share Opportunity</h3>
            <p className="text-xs text-slate-400">Distribute to students, peers, or colleagues</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 font-medium line-clamp-2 mb-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
          {opportunity.title}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/60 text-xs font-medium transition-colors"
          >
            <span>WhatsApp</span>
          </a>
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-sky-950/40 border border-sky-800/40 text-sky-300 hover:bg-sky-900/60 text-xs font-medium transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Telegram</span>
          </a>
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-blue-300 hover:bg-blue-900/60 text-xs font-medium transition-colors"
          >
            <span>LinkedIn</span>
          </a>
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-200 hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            <span>X (Twitter)</span>
          </a>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="bg-transparent text-xs text-slate-300 px-2 py-1 flex-1 outline-none font-mono truncate"
          />
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
