import React from "react";
import Link from "next/link";
import { ShieldCheck, Database, Radio, Globe, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-slate-950 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand & Mission */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs">
                NP
              </div>
              <span className="font-bold text-sm text-white">
                NEXUS<span className="text-indigo-400">PULSE</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Never Miss the Opportunity That Matters. AI-powered opportunity intelligence platform continuously discovering, verifying, and personalizing academic, research, and career announcements.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Pipeline Active • Zero Hallucination Standard</span>
            </div>
          </div>

          {/* Platform Directory */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-200 text-xs tracking-wider uppercase">
              Directory
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/opportunities" className="hover:text-indigo-400 transition-colors">
                  All Opportunities
                </Link>
              </li>
              <li>
                <Link href="/opportunities?category=hackathon" className="hover:text-indigo-400 transition-colors">
                  Hackathons & Competitions
                </Link>
              </li>
              <li>
                <Link href="/opportunities?category=scholarship" className="hover:text-indigo-400 transition-colors">
                  Scholarships & Grants
                </Link>
              </li>
              <li>
                <Link href="/opportunities?category=startup-program" className="hover:text-indigo-400 transition-colors">
                  Startup Incubation & Cohorts
                </Link>
              </li>
            </ul>
          </div>

          {/* Provenance & Architecture */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-200 text-xs tracking-wider uppercase">
              Intelligence Engine
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/admin" className="hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Verification Console</span>
                </Link>
              </li>
              <li>
                <Link href="/admin/sources" className="hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Monitored Sources</span>
                </Link>
              </li>
              <li>
                <Link href="/admin/ingestion" className="hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ingestion Health</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Regional Focus */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-200 text-xs tracking-wider uppercase">
              Geographic Focus
            </h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Active coverage in <strong className="text-slate-300">Peshawar & Khyber Pakhtunkhwa</strong>, monitoring UET Peshawar, KPITB, NIC Peshawar, GIKI, IMSciences, and expanding to Islamabad, Lahore, Karachi, and nationwide Pakistan.
            </p>
            <div className="pt-1">
              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">
                Region: PK-KP / Asia-Karachi
              </span>
            </div>
          </div>
        </div>

        {/* Provenance Disclaimer & Copyright */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <p className="text-center sm:text-left">
            Original sources are the authoritative source of truth. Nexus Pulse validates all announcements against primary portals with cryptographic evidence links.
          </p>
          <div className="flex items-center gap-4 shrink-0">
            <span>© {new Date().getFullYear()} Nexus Pulse</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
