"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Compass, 
  Sparkles, 
  Bookmark, 
  Bell, 
  ShieldCheck, 
  Menu, 
  X, 
  Search,
  User,
  Radio
} from "lucide-react";

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: "Explore", href: "/opportunities", icon: Compass },
    { name: "For You", href: "/for-you", icon: Sparkles, badge: "AI" },
    { name: "Saved", href: "/saved", icon: Bookmark },
    { name: "Alerts", href: "/alerts", icon: Bell },
    { name: "Admin Review", href: "/admin", icon: ShieldCheck },
  ];

  const isActive = (href: string) => {
    if (href === "/opportunities") {
      return pathname.startsWith("/opportunities");
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Platform Tagline */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <span className="font-extrabold text-base tracking-tighter">NP</span>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                  NEXUS<span className="text-indigo-400">PULSE</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider -mt-1 hidden sm:block">
                  OPPORTUNITY INTELLIGENCE
                </span>
              </div>
            </Link>

            {/* Region / Coverage Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400 ml-2">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Coverage: Pakistan (KPK / Peshawar)</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    active
                      ? "text-white bg-slate-800/80 shadow-sm border border-slate-700/60"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? "text-indigo-400" : ""}`} />
                  <span>{link.name}</span>
                  {link.badge && (
                    <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/opportunities"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors md:hidden"
              aria-label="Search opportunities"
            >
              <Search className="w-4 h-4" />
            </Link>

            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Profile</span>
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 md:hidden transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 py-3 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium ${
                  active
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "text-slate-300 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-indigo-400" />
                  <span>{link.name}</span>
                </div>
                {link.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-300 rounded font-mono">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-3">
            <span>Coverage Focus: Peshawar & KPK</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      )}
    </header>
  );
};
