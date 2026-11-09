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

  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://nexuspulse.org/opportunities/${opportunity.slug}`;
  const shareText = `Check out "${opportunity.title}" on NexusPulse — verified opportunities across Pakistan:`;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-np-bg/80 backdrop-blur-sm">
      <div className="bg-np-surface border border-np-border rounded-np-lg max-w-md w-full p-6 shadow-np-lg relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-np-muted hover:text-np-text transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-np bg-np-accent/10 text-np-accent border border-np-accent/20">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-np-text">Share opportunity</h3>
            <p className="text-xs text-np-muted">Send to students, peers, or colleagues</p>
          </div>
        </div>

        <p className="text-xs text-np-muted font-medium line-clamp-2 mb-4 bg-np-bg p-3 rounded-np border border-np-border">
          {opportunity.title}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-2.5 rounded-np bg-np-verify/10 border border-np-verify/30 text-np-verify hover:bg-np-verify/20 text-xs font-medium transition-colors"
          >
            <span>WhatsApp</span>
          </a>
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-2.5 rounded-np bg-np-online/10 border border-np-online/30 text-np-online hover:bg-np-online/20 text-xs font-medium transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Telegram</span>
          </a>
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-2.5 rounded-np bg-np-accent/10 border border-np-accent/30 text-np-accent hover:bg-np-accent/20 text-xs font-medium transition-colors"
          >
            <span>LinkedIn</span>
          </a>
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-2.5 rounded-np bg-np-surface-2 border border-np-border text-np-text hover:border-np-border-strong text-xs font-medium transition-colors"
          >
            <span>X (Twitter)</span>
          </a>
        </div>

        <div className="flex items-center gap-2 bg-np-bg p-1.5 rounded-np border border-np-border">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="bg-transparent text-xs text-np-muted px-2 py-1 flex-1 outline-none truncate"
          />
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-np bg-np-accent hover:bg-[#5a9dff] text-white text-xs font-medium transition-colors shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
