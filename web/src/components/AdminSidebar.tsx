"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ShieldCheck, 
  Radio, 
  Database, 
  FileText, 
  ExternalLink,
  Activity,
  UploadCloud,
  Sparkles
} from "lucide-react";

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();

  const menuItems = [
    { name: "Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Curator Drop Station", href: "/admin/ingest", icon: UploadCloud, badge: "Phase 1" },
    { name: "Verification Queue", href: "/admin/review", icon: ShieldCheck, badge: "Pending" },
    { name: "Published Opportunities", href: "/admin/opportunities", icon: Sparkles },
    { name: "Monitored Sources", href: "/admin/sources", icon: Radio },
    { name: "Ingestion Runs", href: "/admin/ingestion", icon: Database },
    { name: "Audit & Logs", href: "/admin/settings", icon: FileText },
  ];

  return (
    <aside className="w-64 bg-slate-900/60 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>Admin Console</span>
          </div>
          <nav className="mt-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    active
                      ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${active ? "text-indigo-400" : ""}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-300 rounded">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="px-3 py-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
          <div className="font-semibold text-slate-200">System Invariants</div>
          <p className="text-[10px] leading-relaxed">
            All AI extractions undergo deterministic validation. Original sources remain the permanent source of truth.
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800">
        <Link
          href="/"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <span>Return to Portal</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </aside>
  );
};
