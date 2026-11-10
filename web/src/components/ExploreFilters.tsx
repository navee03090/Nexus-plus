"use client";

import React, { useEffect, useRef, useState } from "react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { Drawer } from "vaul";
import { Search, SlidersHorizontal } from "lucide-react";
import { Category } from "@/types";
import { MAP_CITIES } from "@/lib/mapCities";
import { SlidingChips } from "./SlidingChips";

const queryParsers = {
  q: parseAsString.withDefault(""),
  category: parseAsString.withDefault(""),
  city: parseAsString.withDefault(""),
  online: parseAsString.withDefault(""),
  urgency: parseAsString.withDefault(""),
  sort: parseAsString.withDefault("newest"),
  past: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};

function toggleClass(active: boolean, tone: "accent" | "danger" | "neutral" = "accent") {
  if (!active) return "rounded-md border border-white/10 bg-np-surface-2 px-2.5 py-1 text-np-muted hover:text-np-text";
  if (tone === "danger") return "rounded-md border border-np-danger/40 bg-np-danger/15 px-2.5 py-1 text-np-danger";
  if (tone === "neutral") return "rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-np-text";
  return "rounded-md border border-np-accent/40 bg-np-accent/15 px-2.5 py-1 text-np-accent";
}

export function ExploreFilters({ categories }: { categories: Category[] }) {
  const [query, setQuery] = useQueryStates(queryParsers, { shallow: false, clearOnDefault: true });
  const [draft, setDraft] = useState(query.q);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(query.q);
  }, [query.q]);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const setFilters = (
    next: Partial<{
      q: string | null;
      category: string | null;
      city: string | null;
      online: string | null;
      urgency: string | null;
      sort: string | null;
      past: string | null;
    }>
  ) => {
    void setQuery({ ...next, page: null });
  };

  const visible = categories.slice(0, 6);
  const overflow = categories.slice(6);
  const overflowActive = overflow.some((category) => category.slug === query.category);
  const activeCount = [query.category, query.city, query.online, query.urgency].filter(Boolean).length;

  const extraFilters = (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-np-faint">Location:</span>
      {MAP_CITIES.map((entry) => {
        const active = query.city.toLowerCase() === entry.name.toLowerCase();
        return (
          <button
            key={entry.name}
            type="button"
            aria-pressed={active}
            className={toggleClass(active)}
            onClick={() => setFilters({ city: active ? null : entry.name, online: null })}
          >
            {entry.name}
          </button>
        );
      })}
      <button
        type="button"
        aria-pressed={query.online === "true"}
        className={toggleClass(query.online === "true")}
        onClick={() => setFilters({ online: query.online === "true" ? null : "true", city: null })}
      >
        Online only
      </button>
      <button
        type="button"
        aria-pressed={query.urgency === "urgent"}
        className={toggleClass(query.urgency === "urgent", "danger")}
        onClick={() => setFilters({ urgency: query.urgency === "urgent" ? null : "urgent" })}
      >
        Closing soon
      </button>
      <span className="ml-1 text-np-faint">Sort:</span>
      {[
        { id: "deadline", label: "Deadline" },
        { id: "newest", label: "Newest" },
        { id: "trust", label: "Trust" },
      ].map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={query.sort === option.id}
          className={toggleClass(query.sort === option.id)}
          onClick={() => setFilters({ sort: option.id === "newest" ? null : option.id })}
        >
          {option.label}
        </button>
      ))}
      {activeCount > 0 ? (
        <button
          type="button"
          className="text-np-muted hover:text-np-danger"
          onClick={() =>
            void setQuery({
              category: null,
              city: null,
              online: null,
              urgency: null,
              past: null,
              sort: null,
              page: null,
            })
          }
        >
          Clear filters ({activeCount})
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="np-panel mb-8 space-y-4 p-4 sm:p-5">
      <form
        className="relative flex items-center"
        onSubmit={(event) => {
          event.preventDefault();
          void setQuery({ q: draft.trim() || null, page: null });
        }}
      >
        <Search className="absolute left-4 h-4 w-4 text-np-faint" />
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Search by keyword, organizer, city, or field…"
          aria-label="Search opportunities"
          className="np-input pl-11 pr-24"
        />
        <button type="submit" className="absolute right-2 np-btn-primary px-4 py-1.5 text-xs">
          Search
        </button>
      </form>

      <div className="flex flex-wrap items-start gap-2 border-t border-white/[0.07] pt-3">
        <SlidingChips
          group="categories"
          chips={[
            {
              id: "all",
              label: "All categories",
              active: !query.category,
              onSelect: () => setFilters({ category: null }),
            },
            ...visible.map((category) => ({
              id: category.id,
              label: category.name,
              active: query.category === category.slug,
              onSelect: () => setFilters({ category: query.category === category.slug ? null : category.slug }),
            })),
          ]}
        />
        {overflow.length > 0 ? (
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              className={toggleClass(overflowActive)}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              onClick={() => setMoreOpen((open) => !open)}
            >
              More
            </button>
            {moreOpen ? (
              <div
                role="dialog"
                aria-label="More categories"
                className="absolute left-0 z-20 mt-2 w-56 rounded-np-lg border border-white/10 bg-np-bg p-2"
              >
                {overflow.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`block w-full rounded-np px-2 py-1.5 text-left text-xs ${
                      query.category === category.slug ? "bg-np-accent/15 text-np-accent" : "text-np-muted hover:text-np-text"
                    }`}
                    onClick={() => {
                      setFilters({ category: query.category === category.slug ? null : category.slug });
                      setMoreOpen(false);
                    }}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="hidden md:block">{extraFilters}</div>

      <Drawer.Root>
        <Drawer.Trigger className="np-btn-secondary inline-flex md:hidden" aria-label="Open filters">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-np-xl border border-white/10 bg-np-surface px-4 pb-8 pt-3">
            <Drawer.Handle className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15" />
            <Drawer.Title className="mb-1 text-base font-semibold text-np-text">Filters</Drawer.Title>
            <Drawer.Description className="mb-4 text-sm text-np-muted">
              City, format, deadline, and sort.
            </Drawer.Description>
            {extraFilters}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
