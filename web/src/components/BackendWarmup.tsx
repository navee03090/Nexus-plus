"use client";

import { useEffect } from "react";

/**
 * BackendWarmup
 * Automatically wakes up Render backend if it has hibernated due to free-tier inactivity.
 * Runs non-blocking in the background as soon as a user lands on the website.
 */
export function BackendWarmup() {
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://nexus-pulse-api-ult5.onrender.com/api/v1";
    // Fire-and-forget background ping to warm up the Render container
    fetch(`${apiUrl}/health`, { 
      method: "GET",
      mode: "cors",
      cache: "no-store",
    }).catch(() => {
      // Render may take 30-40s to spin up; silent catch avoids polluting client console
    });
  }, []);

  return null;
}
