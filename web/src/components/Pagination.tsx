import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}

export function Pagination({ page, totalPages, hrefForPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(totalPages, page + 2);
  for (let i = windowStart; i <= windowEnd; i += 1) pages.push(i);

  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
      aria-label="Pagination"
    >
      <Link
        href={hrefForPage(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={`np-btn-secondary py-2 px-3 text-xs ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Previous</span>
      </Link>

      {windowStart > 1 && (
        <>
          <Link href={hrefForPage(1)} className="np-chip">
            1
          </Link>
          {windowStart > 2 && <span className="text-np-faint text-xs px-1">…</span>}
        </>
      )}

      {pages.map((p) => (
        <Link
          key={p}
          href={hrefForPage(p)}
          aria-current={p === page ? "page" : undefined}
          className={p === page ? "np-chip np-chip-active border" : "np-chip"}
        >
          {p}
        </Link>
      ))}

      {windowEnd < totalPages && (
        <>
          {windowEnd < totalPages - 1 && <span className="text-np-faint text-xs px-1">…</span>}
          <Link href={hrefForPage(totalPages)} className="np-chip">
            {totalPages}
          </Link>
        </>
      )}

      <Link
        href={hrefForPage(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={`np-btn-secondary py-2 px-3 text-xs ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
      >
        <span>Next</span>
        <ChevronRight className="w-4 h-4" />
      </Link>
    </nav>
  );
}
