"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BackendWarmup } from "@/components/BackendWarmup";
import { TopProgress } from "@/components/TopProgress";
import { CommandPalette } from "@/components/CommandPalette";

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const admin = pathname.startsWith("/admin");

  useEffect(() => {
    if (pathname.startsWith("/admin/reset")) return;
    const hash = window.location.hash;
    if (!hash) return;
    if (/access_token=|refresh_token=|error_code=|type=(signup|magiclink|recovery|email)/.test(hash)) {
      window.location.replace(`/admin/reset${hash}`);
    }
  }, [pathname]);

  return (
    <>
      {admin ? null : <TopProgress />}
      {admin ? null : <BackendWarmup />}
      {admin ? null : <Navbar />}
      <main className="flex flex-1 flex-col">{children}</main>
      {admin ? null : <Footer />}
      {admin ? null : <CommandPalette />}
    </>
  );
}
