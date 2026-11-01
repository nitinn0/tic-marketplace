"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, BadgeCheck, ChevronRight, Search, UsersRound } from "lucide-react";

import { ProviderCard } from "@/components/site";
import { api } from "@/lib/api";
import { routes } from "@/lib/constants";
import type { MarketplaceProvider } from "@/features/marketplace/types";
import { cn } from "@/lib/utils";

/* Palette: Terracotta + Deep Teal
   dark band #0B3440 · cream #FBF6F0 · terracotta #E36F47 · peach #F2A98B · muted #5A6A6F */

const TYPE_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "TESTING_LAB", label: "Testing labs" },
  { value: "INSPECTION_COMPANY", label: "Inspection" },
  { value: "CERTIFICATION_BODY", label: "Certification" },
  { value: "CONSULTANCY", label: "Consultancy" },
];

function typesOf(p: MarketplaceProvider): string[] {
  return p.providerTypes?.length ? p.providerTypes : [p.providerType];
}

function Band({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-[#0B3440] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(27,127,140,0.5),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(227,111,71,0.26),_transparent_45%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 md:pb-14 md:pt-14">{children}</div>
    </section>
  );
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<MarketplaceProvider[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ providers: MarketplaceProvider[] }>("/marketplace/providers")
      .then((data) => {
        if (!cancelled) setProviders(data.providers);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load providers");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const verifiedCount = useMemo(() => providers.filter((p) => p.verified).length, [providers]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return providers.filter((p) => {
      if (verifiedOnly && !p.verified) return false;
      if (type !== "ALL" && !typesOf(p).includes(type)) return false;
      if (!needle) return true;
      const haystack = [p.name, p.headline ?? "", ...p.services.map((s) => s.name), ...p.locations]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [providers, query, type, verifiedOnly]);

  const filtersActive = query.trim() !== "" || type !== "ALL" || verifiedOnly;
  const resetFilters = () => {
    setQuery("");
    setType("ALL");
    setVerifiedOnly(false);
  };

  return (
    <>
      <Band>
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-white/60">
          <Link href={routes.home} className="transition hover:text-white">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="text-white/90">Providers</span>
        </nav>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#F2A98B]">Provider directory</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-5xl">Providers</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
          Public labs, inspectors, certification bodies and consultants. Verified badges are set by the platform.
        </p>

        {loaded && !error ? (
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white/85">
              <UsersRound className="h-3.5 w-3.5 text-[#F2A98B]" aria-hidden />
              {providers.length} {providers.length === 1 ? "provider" : "providers"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white/85">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
              {verifiedCount} verified
            </span>
          </div>
        ) : null}

        <div className="relative mt-7 max-w-xl">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7B80]"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, service or location"
            aria-label="Search providers"
            className="w-full rounded-xl border border-white/20 bg-white py-3 pl-11 pr-4 text-sm text-[#12303A] shadow-lg outline-none transition placeholder:text-[#6B7B80] focus:border-[#F2A98B] focus:ring-4 focus:ring-[#E36F47]/25"
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filter providers">
          {TYPE_FILTERS.map((filter) => {
            const active = type === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={active}
                onClick={() => setType(filter.value)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition duration-200",
                  active
                    ? "border-[#E36F47] bg-[#E36F47] text-[#0B2530] shadow-[0_8px_20px_-10px_rgba(227,111,71,0.9)]"
                    : "border-white/15 bg-white/10 text-white/85 hover:-translate-y-0.5 hover:border-[#F2A98B] hover:text-white",
                )}
              >
                {filter.label}
              </button>
            );
          })}
          <span aria-hidden className="mx-1 hidden h-5 w-px bg-white/20 sm:block" />
          <button
            type="button"
            role="switch"
            aria-checked={verifiedOnly}
            onClick={() => setVerifiedOnly((current) => !current)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition duration-200",
              verifiedOnly
                ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-100"
                : "border-white/15 bg-white/10 text-white/85 hover:border-[#F2A98B] hover:text-white",
            )}
          >
            <BadgeCheck className={cn("h-4 w-4", verifiedOnly ? "text-emerald-300" : "text-white/60")} aria-hidden />
            Verified only
          </button>
        </div>
      </Band>

      <section className="bg-[#FBF6F0]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
          {error ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">We couldn&apos;t load providers</p>
                <p className="mt-0.5 text-red-700">{error}</p>
              </div>
            </div>
          ) : (
            <div aria-live="polite" className="mb-6 flex items-center justify-between gap-3 text-sm text-[#5A6A6F]">
              <p>
                {loaded ? (
                  <>
                    Showing <span className="font-semibold text-[#12303A]">{filtered.length}</span> of{" "}
                    {providers.length}
                  </>
                ) : (
                  "Loading providers…"
                )}
              </p>
              {filtersActive ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="font-semibold text-[#0F4C5C] underline-offset-4 transition hover:text-[#A8431F] hover:underline"
                >
                  Reset filters
                </button>
              ) : null}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {!loaded && !error
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} aria-hidden className="skeleton h-64 rounded-2xl" />
                ))
              : filtered.map((provider, index) => (
                  <div
                    key={provider.id}
                    className="card-in h-full"
                    style={{ "--d": `${Math.min(index, 8) * 60}ms` } as CSSProperties}
                  >
                    <ProviderCard p={provider} />
                  </div>
                ))}
          </div>

          {!error && loaded && filtered.length === 0 ? (
            <div className="mx-auto mt-4 max-w-xl rounded-3xl border border-dashed border-[#D9C8B0] bg-white/70 px-6 py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4EBDD] text-[#0F4C5C]">
                <UsersRound className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="mt-5 font-display text-xl font-bold text-[#12303A]">
                {providers.length === 0 ? "No providers listed yet" : "No providers match your filters"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5A6A6F]">
                {providers.length === 0
                  ? "Profiles will appear here as providers join and are approved."
                  : "Try a different keyword, switch the type, or turn off “Verified only”."}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {providers.length > 0 ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-xl border border-[#EADFCF] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F4C5C] transition hover:border-[#7CC0C8]"
                  >
                    Reset filters
                  </button>
                ) : null}
                <Link
                  href="/join"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E36F47] px-4 py-2.5 text-sm font-semibold text-[#0B2530] shadow-[0_12px_30px_-12px_rgba(227,111,71,0.9)] transition hover:-translate-y-0.5 hover:bg-[#F2A98B]"
                >
                  Join as Provider <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}