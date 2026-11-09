"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Category, Opportunity } from "@/types";
import { fetchCategories, fetchOpportunities } from "@/lib/api";
import { prepareListings } from "@/lib/opportunityDisplay";
import { MAP_CITIES } from "@/lib/mapCities";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    const onCommand = (event: Event) => {
      event.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("np-command", onCommand);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("np-command", onCommand);
    };
  }, []);

  useEffect(() => {
    if (!open || loaded) return;
    setLoaded(true);
    setLoading(true);
    Promise.all([fetchOpportunities({ limit: 50, includePast: true }), fetchCategories()])
      .then(([items, cats]) => {
        setOpportunities(prepareListings(items, { showPast: true }));
        setCategories(cats);
      })
      .catch(() => {
        setOpportunities([]);
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }, [open, loaded]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Search opportunities, categories, and cities"
      overlayClassName="fixed inset-0 z-50 bg-black/60"
      contentClassName="fixed left-1/2 top-[12vh] z-50 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-np-lg border border-white/10 bg-np-bg text-np-text"
    >
      <Command.Input
        placeholder="Search opportunities, categories, cities"
        className="w-full border-b border-white/10 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-np-faint"
      />
      <Command.List className="max-h-80 overflow-y-auto p-2" label="Search results">
        {loading ? <Command.Loading className="px-3 py-4 text-sm text-np-muted">Loading listings…</Command.Loading> : null}
        <Command.Empty className="px-3 py-6 text-center text-sm text-np-muted">No matches.</Command.Empty>
        <Command.Group heading="Cities" className="px-1 py-2 text-xs text-np-faint">
          {MAP_CITIES.map((city) => (
            <Command.Item
              key={city.name}
              value={`city ${city.name}`}
              onSelect={() => go(`/opportunities?city=${encodeURIComponent(city.name)}`)}
              className="cursor-pointer rounded-np px-3 py-2 text-sm text-np-text aria-selected:bg-np-surface-2"
            >
              {city.name}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Categories" className="px-1 py-2 text-xs text-np-faint">
          {categories.map((category) => (
            <Command.Item
              key={category.id}
              value={`category ${category.name}`}
              onSelect={() => go(`/opportunities?category=${encodeURIComponent(category.slug)}`)}
              className="cursor-pointer rounded-np px-3 py-2 text-sm text-np-text aria-selected:bg-np-surface-2"
            >
              {category.name}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Opportunities" className="px-1 py-2 text-xs text-np-faint">
          {opportunities.map((item) => (
            <Command.Item
              key={item.id}
              value={`${item.title} ${item.city || ""} ${item.category_name || ""}`}
              onSelect={() => go(`/opportunities/${item.slug}`)}
              className="cursor-pointer rounded-np px-3 py-2 text-sm text-np-text aria-selected:bg-np-surface-2"
            >
              <span className="block truncate">{item.title}</span>
              <span className="block truncate text-xs text-np-faint">
                {[item.category_name, item.city].filter(Boolean).join(" · ")}
              </span>
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
