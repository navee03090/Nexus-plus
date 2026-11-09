import React from "react";
import Link from "next/link";

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-np-border bg-np-bg text-np-muted text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-np-surface border border-np-border text-np-accent font-bold text-xs">
                NP
              </div>
              <span className="font-bold text-sm text-np-text">
                Nexus<span className="text-np-accent">Pulse</span>
              </span>
            </div>
            <p className="text-np-muted text-sm leading-relaxed">
              Verified opportunity intelligence for Pakistan — scholarships, hackathons,
              fellowships, incubators, and research programs from official sources.
            </p>
            <div className="flex items-center gap-2 text-xs text-np-verify">
              <span className="w-2 h-2 rounded-full bg-np-verify" />
              <span>Every listing links to an original source</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-np-text text-xs tracking-wider uppercase">
              Directory
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/opportunities" className="hover:text-np-accent transition-colors">
                  All Opportunities
                </Link>
              </li>
              <li>
                <Link
                  href="/opportunities?category=hackathon"
                  className="hover:text-np-accent transition-colors"
                >
                  Hackathons & Competitions
                </Link>
              </li>
              <li>
                <Link
                  href="/opportunities?category=scholarship"
                  className="hover:text-np-accent transition-colors"
                >
                  Scholarships & Grants
                </Link>
              </li>
              <li>
                <Link
                  href="/opportunities?category=startup-program"
                  className="hover:text-np-accent transition-colors"
                >
                  Startup Incubation & Cohorts
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-np-text text-xs tracking-wider uppercase">
              Cities
            </h4>
            <ul className="space-y-2 text-sm">
              {["Islamabad", "Lahore", "Karachi", "Peshawar", "Online"].map((city) => (
                <li key={city}>
                  <Link
                    href={
                      city === "Online"
                        ? "/opportunities?online=true"
                        : `/opportunities?city=${encodeURIComponent(city)}`
                    }
                    className="hover:text-np-accent transition-colors"
                  >
                    {city === "Online" ? "Online / Virtual" : city}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-np-text text-xs tracking-wider uppercase">
              Trust
            </h4>
            <p className="text-np-muted leading-relaxed text-sm">
              Original portals remain the source of truth. NexusPulse validates announcements
              and preserves evidence links before publishing.
            </p>
            <Link
              href="/admin"
              className="inline-block text-xs text-np-faint hover:text-np-muted transition-colors"
            >
              Operator console →
            </Link>
          </div>
        </div>

        <div className="pt-8 border-t border-np-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-np-faint">
          <p className="text-center sm:text-left">
            Built for students, researchers, and founders across Pakistan.
          </p>
          <span>© {new Date().getFullYear()} NexusPulse</span>
        </div>
      </div>
    </footer>
  );
};
