"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Menu, Search, X } from "lucide-react";

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const exploreActive = pathname.startsWith("/opportunities");

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openCommand = () => {
    const event = new CustomEvent("np-command", { cancelable: true });
    const handled = !window.dispatchEvent(event);
    if (!handled) router.push("/opportunities");
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b border-white/[0.07] ${
        compact ? "bg-np-bg/80 backdrop-blur-md" : "bg-np-bg"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between gap-4 ${compact ? "h-14" : "h-16"}`}>
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-np border border-white/10 bg-np-surface text-sm font-bold tracking-tight text-np-accent">
              NP
            </div>
            <span className="truncate text-base font-bold tracking-tight text-np-text">
              Nexus<span className="text-np-accent">Pulse</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCommand}
              className="hidden items-center gap-2 rounded-np border border-white/10 bg-np-surface px-2.5 py-1.5 text-xs text-np-muted hover:text-np-text md:inline-flex"
              aria-label="Search opportunities"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
              <kbd className="rounded border border-white/10 px-1 text-[10px] text-np-faint">⌘K</kbd>
            </button>

            <Link
              href="/opportunities"
              className={`hidden items-center gap-2 rounded-np px-3 py-1.5 text-sm font-medium md:inline-flex ${
                exploreActive
                  ? "border border-white/10 bg-np-surface text-np-text"
                  : "text-np-muted hover:text-np-text"
              }`}
            >
              <Compass className={`h-3.5 w-3.5 ${exploreActive ? "text-np-accent" : ""}`} />
              Explore
            </Link>

            <button
              type="button"
              onClick={openCommand}
              className="rounded-np p-2 text-np-muted hover:text-np-text md:hidden"
              aria-label="Search opportunities"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="rounded-np p-2 text-np-muted hover:text-np-text md:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="border-b border-white/[0.07] bg-np-bg px-4 py-3 md:hidden">
          <Link
            href="/opportunities"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 rounded-np px-3 py-2.5 text-sm font-medium text-np-text"
          >
            <Compass className="h-4 w-4 text-np-accent" />
            Explore
          </Link>
        </div>
      ) : null}
    </header>
  );
};
