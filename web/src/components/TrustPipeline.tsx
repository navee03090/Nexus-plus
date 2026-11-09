"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STEPS = [
  {
    title: "Discover",
    body: "University portals, government boards, incubators, and research institutes across Pakistan.",
  },
  {
    title: "Verify",
    body: "Deadlines, eligibility, and apply links are checked before a listing goes live.",
  },
  {
    title: "Merge",
    body: "Repeated posts become one record. Deadline changes update the same listing.",
  },
];

export function TrustPipeline() {
  const root = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useGSAP(
    () => {
      const path = pathRef.current;
      if (!path) return;
      const length = path.getTotalLength();
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: reduce ? 0 : length });
      if (reduce) return;

      gsap.to(path, {
        strokeDashoffset: 0,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top 80%",
          end: "center 55%",
          scrub: 0.4,
        },
      });
    },
    { scope: root }
  );

  return (
    <div ref={root} className="relative">
      <svg
        className="pointer-events-none absolute left-[8%] right-[8%] top-5 hidden h-6 w-[84%] md:block"
        viewBox="0 0 1000 24"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M12 12 H988"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <path
          ref={pathRef}
          d="M12 12 H988"
          fill="none"
          stroke="#3D8BFF"
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <ol className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative flex flex-col items-center text-center md:pt-0">
            <div className="relative z-10 mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-np-surface text-sm font-semibold tabular-nums text-np-accent">
              {index + 1}
            </div>
            <h3 className="text-base font-semibold text-np-text">{step.title}</h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-np-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
