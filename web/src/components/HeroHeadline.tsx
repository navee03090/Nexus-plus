"use client";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";

const WORDS = [
  { text: "Find", accent: false },
  { text: "verified", accent: true },
  { text: "opportunities", accent: false },
  { text: "across", accent: false },
  { text: "Pakistan", accent: false },
];

export function HeroHeadline() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <h1 className="np-delay-1 mb-5 max-w-3xl text-4xl font-bold leading-[1.15] tracking-tight text-np-text sm:text-5xl md:text-[3.25rem]">
      {WORDS.map((word, index) => (
        <span key={word.text} className="mr-[0.28em] inline-block overflow-hidden align-bottom">
          <motion.span
            className={`inline-block ${
              word.accent ? "font-serif text-[1.05em] font-normal italic text-np-accent" : ""
            }`}
            initial={reduced ? false : { y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 0.55, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            {word.text}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}
