import React from "react";
import { AdminSidebar } from "@/components/AdminSidebar";

export const metadata = {
  title: "Admin Console | NexusPulse",
  description: "Editorial review queue, monitored sources, and ingestion health.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      <AdminSidebar />
      <div className="flex-1 overflow-y-auto bg-np-bg p-6 sm:p-8">{children}</div>
    </div>
  );
}
