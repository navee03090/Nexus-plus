"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BackendWarmup } from "@/components/BackendWarmup";
import { TopProgress } from "@/components/TopProgress";
import { CommandPalette } from "@/components/CommandPalette";

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const admin = usePathname().startsWith("/admin");
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
