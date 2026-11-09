"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function signalBusy(on: boolean, label?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("nexus-busy", { detail: { on, label } }));
}

export function TopProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState("Opening");
  const [progress, setProgress] = useState(0);
  const running = useRef(false);
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    let tick: number | undefined;
    let hide: number | undefined;
    let safety: number | undefined;

    const start = (text: string) => {
      window.clearInterval(tick);
      window.clearTimeout(hide);
      window.clearTimeout(safety);
      running.current = true;
      setLabel(text);
      setVisible(true);
      setProgress(16);
      tick = window.setInterval(() => {
        setProgress((current) => (current < 86 ? current + 6 + Math.random() * 6 : current));
      }, 240);
      safety = window.setTimeout(() => finish(), 12000);
    };

    const finish = () => {
      if (!running.current) return;
      running.current = false;
      window.clearInterval(tick);
      window.clearTimeout(safety);
      setProgress(100);
      hide = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 280);
    };
    finishRef.current = finish;

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (!href.startsWith("/") || anchor.getAttribute("target") === "_blank") return;
      if (href === pathname || href === `${pathname}/`) return;
      start("Opening");
    };

    const onBusy = (event: Event) => {
      const detail = (event as CustomEvent<{ on?: boolean; label?: string }>).detail || {};
      if (detail.on) start(detail.label || "Processing");
      else finish();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("nexus-busy", onBusy);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("nexus-busy", onBusy);
      window.clearInterval(tick);
      window.clearTimeout(hide);
      window.clearTimeout(safety);
    };
  }, [pathname]);

  useEffect(() => {
    finishRef.current();
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[80] pointer-events-none">
      <div className="h-0.5 bg-np-surface">
        <div
          className="h-full bg-np-accent transition-[width] duration-200 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="absolute right-3 top-2 inline-flex items-center gap-1.5 rounded-full border border-np-border bg-np-bg/95 px-2.5 py-1 text-[10px] font-semibold text-np-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-np-accent" />
        {label}…
      </div>
    </div>
  );
}
