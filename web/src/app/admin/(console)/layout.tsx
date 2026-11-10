import React from "react";
import { AdminSidebar } from "@/components/AdminSidebar";

export const metadata = {
  title: "Admin Console | NexusPulse",
  description: "Editorial review queue, monitored sources, and ingestion health.",
  robots: { index: false, follow: false },
};

export default function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar />
      <div className="flex-1 overflow-y-auto bg-np-bg p-6 sm:p-8">{children}</div>
    </div>
  );
}
