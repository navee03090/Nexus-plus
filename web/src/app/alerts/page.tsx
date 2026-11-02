"use client";

import React, { useState } from "react";
import { 
  Bell, 
  Send, 
  Mail, 
  MessageSquare, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Clock, 
  Smartphone,
  ExternalLink
} from "lucide-react";

export default function AlertsPage() {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState("@student_pk");
  const [emailAddress, setEmailAddress] = useState("student@uetpeshawar.edu.pk");
  const [minMatchScore, setMinMatchScore] = useState(75);
  const [deadlineReminders, setDeadlineReminders] = useState(true);
  const [changesNotify, setChangesNotify] = useState(true);
  const [savedStatus, setSavedStatus] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold mb-2">
          <Bell className="w-4 h-4" />
          <span>Real-Time Alert Dispatcher</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Notification Preferences & Channels
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Receive proactive alerts across Telegram, Email, and Push before registration deadlines close.
        </p>
      </div>

      {savedStatus && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 mb-6 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Preferences updated successfully! Your alert channels are synchronized with the dispatch engine.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Telegram Bot Integration Card */}
        <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Telegram Instant Dispatch</h3>
                <p className="text-xs text-slate-400">Receive rich markdown alerts directly on your phone or desktop</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={telegramEnabled}
                onChange={(e) => setTelegramEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>

          {telegramEnabled && (
            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                <span>1. Start the bot on Telegram: <strong>@NexusPulseBot</strong></span>
                <a
                  href="https://t.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
                >
                  <span>Open Bot</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Telegram Username or Chat ID:
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="@your_telegram_username"
                />
              </div>
            </div>
          )}
        </div>

        {/* Email Digest Card */}
        <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Email Opportunity Digest</h3>
                <p className="text-xs text-slate-400">Curated weekly or urgent deadline notifications delivered to your inbox</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {emailEnabled && (
            <div className="pt-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Notification Email Address:
              </label>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Browser Push Notifications */}
        <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Browser Push Notifications</h3>
                <p className="text-xs text-slate-400">Desktop alerts for closing opportunities</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={(e) => setPushEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        {/* Intelligence Filters & Thresholds */}
        <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5">
          <h3 className="text-base font-semibold text-white">Smart Dispatch Filters</h3>

          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-300 font-medium">Minimum Match Score:</span>
              <span className="text-indigo-400 font-bold">{minMatchScore}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={minMatchScore}
              onChange={(e) => setMinMatchScore(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Only opportunities with a matching score equal to or above {minMatchScore}% will trigger high-priority alerts.
            </p>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-800 text-xs">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={deadlineReminders}
                onChange={(e) => setDeadlineReminders(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
              />
              <span className="text-slate-300">
                Send 48-hour and 24-hour urgency countdown reminders for saved opportunities
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={changesNotify}
                onChange={(e) => setChangesNotify(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
              />
              <span className="text-slate-300">
                Immediately notify me if a deadline is extended or venue changed on an opportunity I follow
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition-colors shadow-lg shadow-indigo-600/30"
          >
            Save Notification Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
