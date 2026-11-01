"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, BadgeCheck, ChevronRight, MapPin, Search, UserRound } from "lucide-react";

import type { MarketplaceProfessional } from "@/features/marketplace/types";
import { professionalTypeLabels } from "@/features/professionals/utils/labels";
import type { ProfessionalType } from "@/features/professionals/types";
import { api } from "@/lib/api";
import { routes } from "@/lib/constants";
import { cn } from "@/lib/utils";

const TYPE_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "CONSULTANT", label: "Consultants" },
  { value: "LEAD_AUDITOR", label: "Lead auditors" },
  { value: "LEAD_VERIFIER", label: "Lead verifiers" },
  { value: "INSPECTOR", label: "Inspectors" },
  { value: "TECHNICAL_EXPERT", label: "Technical experts" },
];

const AVATARS = [
  "from-[#0B3B47] to-[#1B7F8C]",
  "from-[#A9421F] to-[#E36F47]",
  "from-[#12303A] to-[#2F5D68]",
  "from-[#7A5410] to-[#C9922B]",
];

function avatarFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATARS[hash % AVATARS.length];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Band({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-[#0B3440] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(27,127,140,0.5),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(227,111,71,0.26),_transparent_45%)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 md:pb-14 md:pt-14">{children}</div>
    </section>
  );
}

function ProfessionalCard({ professional }: { professional: MarketplaceProfessional }) {
  const typeLabel =
    professionalTypeLabels[professional.professionalType as ProfessionalType] ?? professional.professionalType;

  return (
    <Link
      href={routes.professional(professional.id)}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#EADFCF] bg-white p-5",
        "shadow-[0_12px_30px_-22px_rgba(18,48,58,0.45)] transition duration-300",
        "hover:-translate-y-1 hover:border-[#7CC0C8] hover:shadow-[0_26px_50px_-26px_rgba(18,48,58,0.5)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C]",
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#1B7F8C] to-[#E36F47] transition duration-500 group-hover:scale-x-100"
      />

      <div className="relative flex items-start gap-3.5">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-bold tracking-wide text-white",
            "shadow-[0_10px_20px_-10px_rgba(18,48,58,0.6)] ring-4 ring-[#FBF6F0]",
            avatarFor(professional.name),
          )}
        >
          {initials(professional.name) || "P"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-display text-base font-semibold tracking-tight text-[#12303A]">
              {professional.name}
            </h3>
            {professional.verified ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                Verified
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-[#0F4C5C]">{typeLabel}</p>
        </div>
      </div>

      <p className="relative mt-4 line-clamp-2 flex-1 text-sm leading-relaxed text-[#5A6A6F]">
        {professional.headline || "Independent professional available for hire"}
      </p>

      {professional.primaryAccreditation ? (
        <p className="relative mt-3 truncate text-xs text-[#5A6A6F]">{professional.primaryAccreditation}</p>
      ) : null}

      <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-[#EADFCF] pt-4">
        {professional.baseCity ? (
          <p className="inline-flex min-w-0 items-center gap-1.5 text-xs text-[#5A6A6F]">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#E36F47]" aria-hidden />
            <span className="truncate">{professional.baseCity}</span>
          </p>
        ) : (
          <span className="text-xs text-[#6B7B80]">Independent</span>
        )}
        <span className="text-xs font-semibold text-[#0F4C5C]">View profile</span>
      </div>
    </Link>
  );
}

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<MarketplaceProfessional[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ professionals: MarketplaceProfessional[] }>("/marketplace/professionals")
      .then((data) => {
        if (!cancelled) setProfessionals(data.professionals);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load professionals");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const verifiedCount = useMemo(() => professionals.filter((row) => row.verified).length, [professionals]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return professionals.filter((row) => {
      if (verifiedOnly && !row.verified) return false;
      if (type !== "ALL" && row.professionalType !== type) return false;
      if (!needle) return true;
      const haystack = [row.name, row.headline ?? "", row.baseCity ?? "", row.primaryAccreditation ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [professionals, query, type, verifiedOnly]);

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
          <span className="text-white/90">Independents</span>
        </nav>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#F2A98B]">Hire independents</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-5xl">Independent professionals</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
          Individual auditors, inspectors, consultants and technical experts. Companies can browse this list to hire.
        </p>

        {loaded && !error ? (
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white/85">
              <UserRound className="h-3.5 w-3.5 text-[#F2A98B]" aria-hidden />
              {professionals.length} {professionals.length === 1 ? "professional" : "professionals"}
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
            placeholder="Search by name, city or accreditation"
            aria-label="Search professionals"
            className="w-full rounded-xl border border-white/20 bg-white py-3 pl-11 pr-4 text-sm text-[#12303A] shadow-lg outline-none transition placeholder:text-[#6B7B80] focus:border-[#F2A98B] focus:ring-4 focus:ring-[#E36F47]/25"
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filter professionals">
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
                    ? "border-[#E36F47] bg-[#E36F47] text-[#0B2530]"
                    : "border-white/15 bg-white/10 text-white/85 hover:border-[#F2A98B] hover:text-white",
                )}
              >
                {filter.label}
              </button>
            );
          })}
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
                <p className="font-semibold">We couldn&apos;t load professionals</p>
                <p className="mt-0.5 text-red-700">{error}</p>
              </div>
            </div>
          ) : (
            <div aria-live="polite" className="mb-6 flex items-center justify-between gap-3 text-sm text-[#5A6A6F]">
              <p>
                {loaded ? (
                  <>
                    Showing <span className="font-semibold text-[#12303A]">{filtered.length}</span> of {professionals.length}
                  </>
                ) : (
                  "Loading professionals…"
                )}
              </p>
              {filtersActive ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="font-semibold text-[#0F4C5C] underline-offset-4 transition hover:underline"
                >
                  Reset filters
                </button>
              ) : null}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {!loaded && !error
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} aria-hidden className="skeleton h-64 rounded-2xl" />)
              : filtered.map((professional, index) => (
                  <div
                    key={professional.id}
                    className="card-in h-full"
                    style={{ "--d": `${Math.min(index, 8) * 60}ms` } as CSSProperties}
                  >
                    <ProfessionalCard professional={professional} />
                  </div>
                ))}
          </div>

          {!error && loaded && filtered.length === 0 ? (
            <div className="mx-auto mt-4 max-w-xl rounded-3xl border border-dashed border-[#D9C8B0] bg-white/70 px-6 py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4EBDD] text-[#0F4C5C]">
                <UserRound className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="mt-5 font-display text-xl font-bold text-[#12303A]">
                {professionals.length === 0 ? "No independents listed yet" : "No professionals match your filters"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5A6A6F]">
                {professionals.length === 0
                  ? "Independent professionals will appear here after they join and opt into the public directory."
                  : "Try a different keyword, switch the type, or turn off “Verified only”."}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href={routes.join}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E36F47] px-4 py-2.5 text-sm font-semibold text-[#0B2530] transition hover:bg-[#F2A98B]"
                >
                  Join as independent <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
