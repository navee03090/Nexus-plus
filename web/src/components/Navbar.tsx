"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Menu, X, Search, MapPin } from "lucide-react";

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks: { name: string; href: string; icon: typeof Compass }[] = [
    { name: "Explore", href: "/opportunities", icon: Compass },
  ];

  const isActive = (href: string) => {
    if (href === "/opportunities") {
      return pathname.startsWith("/opportunities");
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-np-border/80 bg-np-bg/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 group min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-np bg-np-surface border border-np-border text-np-accent font-bold text-sm tracking-tight group-hover:border-np-accent/40 transition-colors">
                NP
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-base tracking-tight text-np-text truncate">
                  Nexus<span className="text-np-accent">Pulse</span>
                </span>
                <span className="text-[10px] text-np-faint tracking-wide -mt-0.5 hidden sm:block">
                  Opportunity Intelligence
                </span>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-np-surface border border-np-border text-[11px] text-np-muted ml-2">
              <MapPin className="w-3 h-3 text-np-verify" />
              <span>Coverage: Pakistan</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-np text-sm font-medium transition-colors ${
                    active
                      ? "text-np-text bg-np-surface border border-np-border"
                      : "text-np-muted hover:text-np-text hover:bg-np-surface/60"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? "text-np-accent" : ""}`} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/opportunities"
              className="p-2 rounded-np text-np-muted hover:text-np-text hover:bg-np-surface transition-colors md:hidden"
              aria-label="Search opportunities"
            >
              <Search className="w-4 h-4" />
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-np text-np-muted hover:text-np-text hover:bg-np-surface md:hidden transition-colors"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-np-border bg-np-bg/95 backdrop-blur-xl px-4 py-3 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-np text-sm font-medium ${
                  active
                    ? "bg-np-surface text-np-text border border-np-border"
                    : "text-np-muted hover:bg-np-surface"
                }`}
              >
                <Icon className="w-4 h-4 text-np-accent" />
                <span>{link.name}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-np-border flex items-center justify-between text-xs text-np-muted px-3">
            <span>Nationwide coverage across Pakistan</span>
            <span className="w-2 h-2 rounded-full bg-np-verify" />
          </div>
        </div>
      )}
    </header>
  );
};
