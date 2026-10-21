"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  History,
  Leaf,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { MarketplaceCategory, MarketplaceHome, MarketplaceService } from "@/features/marketplace/types";

const HISTORY_KEY = "tic_search_history";
const HISTORY_LIMIT = 6;

const CAT_ICON: Record<string, LucideIcon> = {
  testing: FlaskConical,
  TESTING: FlaskConical,
  inspection: ScanSearch,
  INSPECTION: ScanSearch,
  certification: ShieldCheck,
  CERTIFICATION: ShieldCheck,
  esg: Leaf,
  "experts-consulting": Users,
  CONSULTING: Users,
};

function iconFor(category: MarketplaceCategory) {
  return CAT_ICON[category.slug] ?? CAT_ICON[category.categoryType] ?? Sparkles;
}

function readHistory() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function rememberSearch(term: string) {
  const value = term.trim();
  if (!value) return;
  const next = [value, ...readHistory().filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, HISTORY_LIMIT);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function SearchBar({
  large = false,
  initial = "",
  variant = "default",
}: {
  large?: boolean;
  initial?: string;
  variant?: "default" | "header";
}) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initial);
  const [open, setOpen] = useState(false);
  const [home, setHome] = useState<MarketplaceHome | null>(null);
  const [matches, setMatches] = useState<MarketplaceService[]>([]);
  const [suggestionState, setSuggestionState] = useState<"idle" | "loading" | "ready">("idle");
  const [history, setHistory] = useState<string[]>([]);
  const [showAllTrending, setShowAllTrending] = useState(false);

  useEffect(() => {
    setQuery(initial);
  }, [initial]);

  useEffect(() => {
    if (!open) return;
    setHistory(readHistory());
    if (home) return;
    let cancelled = false;
    api
      .get<MarketplaceHome>("/marketplace/home")
      .then((data) => {
        if (!cancelled) setHome(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, home]);

  useEffect(() => {
    const keywords = query.trim();
    if (!open || keywords.length === 0) {
      setMatches([]);
      setSuggestionState("idle");
      return;
    }
    setSuggestionState("loading");
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ q: keywords });
      api
        .get<{ services: MarketplaceService[] }>(`/marketplace/services?${params.toString()}`)
        .then((data) => setMatches(data.services.slice(0, 8)))
        .catch(() => setMatches([]))
        .finally(() => setSuggestionState("ready"));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function goToSearch(term: string) {
    const q = term.trim();
    if (q) rememberSearch(q);
    setOpen(false);
    router.push(q ? `/services?q=${encodeURIComponent(q)}` : "/services");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    goToSearch(query);
  }

  const trending = home?.popular ?? [];
  const visibleTrending = showAllTrending ? trending : trending.slice(0, 6);
  const typed = query.trim().length > 0;
  const header = variant === "header";

  return (
    <div ref={rootRef} className="relative">
      <form
        onSubmit={onSubmit}
        className={cn(
          "flex items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-sm",
          large && "p-2 shadow-md",
          header && "bg-white p-1 shadow-none",
          open && "ring-2 ring-primary/30",
        )}
      >
        <Search className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          placeholder={header ? "Search services, providers, standards…" : "Search testing, certification, inspection or ESG"}
          className={cn(
            "min-w-0 flex-1 bg-transparent px-2 text-foreground outline-none placeholder:text-muted-foreground",
            large ? "h-11 text-base" : "h-9 text-sm",
            header && "h-9 text-sm",
          )}
          aria-label="Search services"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
        />
        <Button type="submit" className={cn("rounded-full", large && "h-11 px-6", header && "h-9 px-4")}>
          Search
        </Button>
      </form>

      {open ? (
        <div
          id={listId}
          className="absolute left-0 right-0 z-40 mt-2 max-h-[28rem] overflow-auto rounded-xl border border-border bg-card p-4 text-left shadow-xl"
        >
          {typed ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommendations</p>
              <ul className="mt-2">
                {matches.map((service) => (
                  <li key={service.id}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface"
                      onClick={() => {
                        rememberSearch(service.name);
                        setOpen(false);
                        router.push(`/services/${service.slug}`);
                      }}
                    >
                      <Search className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>
                        <span className="block text-sm font-medium text-foreground">{service.name}</span>
                        <span className="block text-xs text-muted-foreground">{service.categoryPath.join(" / ") || service.categoryName}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {suggestionState !== "ready" ? <p className="px-2 py-2 text-sm text-muted-foreground">Searching…</p> : null}
              {suggestionState === "ready" && matches.length === 0 ? (
                <p className="px-2 py-2 text-sm text-muted-foreground">No services match every keyword.</p>
              ) : null}
            </div>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" /> Trending searches
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {visibleTrending.map((service) => (
                  <button
                    key={service.slug}
                    type="button"
                    onClick={() => goToSearch(service.name)}
                    className="rounded-full border border-primary/40 px-3 py-1.5 text-sm font-medium text-primary hover:bg-accent"
                  >
                    {service.name}
                  </button>
                ))}
                {!showAllTrending && trending.length > visibleTrending.length ? (
                  <button
                    type="button"
                    className="px-2 text-sm font-medium text-primary"
                    onClick={() => setShowAllTrending(true)}
                  >
                    {trending.length - visibleTrending.length} more searches…
                  </button>
                ) : null}
              </div>

              <p className="mt-5 text-xs font-semibold text-muted-foreground">Top categories</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(home?.categories ?? []).map((category) => {
                  const Icon = iconFor(category);
                  return (
                    <button
                      key={category.slug}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push(`/services?category=${encodeURIComponent(category.slug)}`);
                      }}
                      className="flex items-center gap-3 rounded-xl border border-border px-3 py-3 text-left text-sm font-medium hover:border-primary/40 hover:bg-surface"
                    >
                      <Icon className="h-5 w-5 shrink-0 text-primary" />
                      {category.name}
                    </button>
                  );
                })}
              </div>

              <p className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <History className="h-3.5 w-3.5" /> Search history
              </p>
              {history.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">There is no search history</p>
              ) : (
                <ul className="mt-2">
                  {history.map((term) => (
                    <li key={term}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface"
                        onClick={() => goToSearch(term)}
                      >
                        <History className="h-3.5 w-3.5 text-muted-foreground" />
                        {term}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
