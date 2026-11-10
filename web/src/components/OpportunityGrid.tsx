"use client";

import React from "react";
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
  return (
    <div className={className}>
      {items.map((opportunity) => (
        <OpportunityCard key={opportunity.id} opportunity={opportunity} showMatchScore={showMatchScore} />
      ))}
    </div>
  );
}
