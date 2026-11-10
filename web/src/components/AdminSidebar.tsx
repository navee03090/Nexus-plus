"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  ShieldCheck,
  Radio,
  Database,
  FileText,
  ExternalLink,
  Activity,
  UploadCloud,
  Sparkles,
  Menu,
  X,
} from "lucide-react";

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  };

  const menuItems = [
    { name: "Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Curator Drop Station", href: "/admin/ingest", icon: UploadCloud, badge: "Phase 1" },
    { name: "Verification Queue", href: "/admin/review", icon: ShieldCheck, badge: "Pending" },
    { name: "Published Opportunities", href: "/admin/opportunities", icon: Sparkles },
    { name: "Monitored Sources", href: "/admin/sources", icon: Radio },
    { name: "Ingestion Runs", href: "/admin/ingestion", icon: Database },
    { name: "Audit & Logs", href: "/admin/settings", icon: FileText },
  ];

  const Nav = (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-np-faint uppercase tracking-wider">
          <Activity className="w-3.5 h-3.5 text-np-accent" />
          <span>Admin Console</span>
        </div>
        <nav className="mt-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-np text-xs font-medium transition-colors ${
                  active
                    ? "bg-np-accent/15 text-np-accent border border-np-accent/30"
                    : "text-np-muted hover:text-np-text hover:bg-np-surface-2"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${active ? "text-np-accent" : ""}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-np-warn/15 text-np-warn rounded">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="px-3 py-3 rounded-np bg-np-bg border border-np-border text-[11px] text-np-muted space-y-1.5">
        <div className="font-semibold text-np-text">Publishing rules</div>
        <p className="text-[10px] leading-relaxed">
          AI extractions are validated before publish. Original sources stay the source of truth.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <div className="md:hidden border-b border-np-border bg-np-surface px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-np-text">Admin</span>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="p-2 rounded-np text-np-muted hover:text-np-text hover:bg-np-surface-2"
          aria-label="Toggle admin menu"
          aria-expanded={open}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-b border-np-border bg-np-surface p-4">
          {Nav}
          <div className="pt-4 border-t border-np-border mt-4 space-y-1">
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center justify-between rounded-np px-3 py-2 text-xs font-medium text-np-muted hover:bg-np-surface-2 hover:text-np-text"
            >
              <span>Sign out</span>
            </button>
            <Link
              href="/"
              className="flex items-center justify-between px-3 py-2 rounded-np text-xs font-medium text-np-muted hover:text-np-text hover:bg-np-surface-2"
            >
              <span>View public site</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      <aside className="hidden md:flex w-64 shrink-0 flex-col justify-between border-r border-np-border bg-np-surface/60 p-4 min-h-screen">
        {Nav}
        <div className="space-y-1 border-t border-np-border pt-4">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center justify-between rounded-np px-3 py-2 text-xs font-medium text-np-muted transition-colors hover:bg-np-surface-2 hover:text-np-text"
          >
            <span>Sign out</span>
          </button>
          <Link
            href="/"
            className="flex items-center justify-between px-3 py-2 rounded-np text-xs font-medium text-np-muted hover:text-np-text hover:bg-np-surface-2 transition-colors"
          >
            <span>View public site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>
    </>
  );
};
