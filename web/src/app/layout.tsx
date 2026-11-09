import type { Metadata } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BackendWarmup } from "@/components/BackendWarmup";
import { TopProgress } from "@/components/TopProgress";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NexusPulse | Verified Opportunities Across Pakistan",
  description:
    "Find verified scholarships, hackathons, fellowships, incubators, and research programs across Pakistan — sourced from official portals.",
  keywords: [
    "NexusPulse",
    "Pakistan opportunities",
    "Scholarships Pakistan",
    "Hackathons Pakistan",
    "HEC Scholarships",
    "Internships Pakistan",
    "Startup programs Pakistan",
    "Opportunity Intelligence",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${plusJakarta.variable} ${instrumentSerif.variable} font-sans min-h-screen flex flex-col bg-np-bg text-np-text antialiased`}
      >
        <TopProgress />
        <BackendWarmup />
        <Navbar />
        <main className="flex-1 flex flex-col animate-np-fade">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
