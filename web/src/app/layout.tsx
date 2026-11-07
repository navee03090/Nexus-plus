import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BackendWarmup } from "@/components/BackendWarmup";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NEXUS PULSE | AI-Powered Opportunity Intelligence Platform",
  description:
    "Never Miss the Opportunity That Matters. Discover, verify, and personalize academic, hackathon, scholarship, and research opportunities across Pakistan with zero hallucinations.",
  keywords: [
    "Nexus Pulse",
    "Pakistan Hackathons",
    "Scholarships Pakistan",
    "UET Peshawar",
    "KPITB",
    "NIC Peshawar",
    "Opportunities Peshawar",
    "AI Opportunity Intelligence",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen flex flex-col bg-slate-950 text-slate-100`}>
        <BackendWarmup />
        <Navbar />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
