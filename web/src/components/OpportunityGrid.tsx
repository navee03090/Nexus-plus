"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Opportunity } from "@/types";
import { OpportunityCard } from "./OpportunityCard";

export function OpportunityGrid({
  items,
  showMatchScore = false,
  className = "grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3",
}: {
  items: Opportunity[];
  showMatchScore?: boolean;
  className?: string;
}) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <motion.div layout className={className}>
      <AnimatePresence mode="popLayout">
        {items.map((opportunity, index) => (
          <motion.div
            key={opportunity.id}
            layout
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, delay: reduced ? 0 : Math.min(index, 8) * 0.06 }}
          >
            <OpportunityCard opportunity={opportunity} showMatchScore={showMatchScore} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
