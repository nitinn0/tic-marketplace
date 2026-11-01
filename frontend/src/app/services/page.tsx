"use client";

import { Suspense, useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, ChevronRight, SearchX } from "lucide-react";

import { SearchBar, ServiceCard } from "@/components/site";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { api } from "@/lib/api";
import { routes } from "@/lib/constants";
import type { MarketplaceService } from "@/features/marketplace/types";
import { cn } from "@/lib/utils";

/* Palette: Terracotta + Deep Teal
   dark band #0B3440 · cream #FBF6F0 · terracotta #E36F47 · peach #F2A98B · muted #5A6A6F */

const CATEGORY_CHIPS = [
  { slug: "", label: "All" },
  { slug: "testing", label: "Testing" },
  { slug: "inspection", label: "Inspection" },
  { slug: "certification", label: "Certification" },
  { slug: "experts-consulting", label: "Consulting" },
];

function chipHref(slug: string, q: string) {
  const search = new URLSearchParams();
  if (q) search.set("q", q);
  if (slug) search.set("category", slug);
  const qs = search.toString();
  return qs ? `${routes.services}?${qs}` : routes.services;
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

function ServicesResults() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const { activeOrganization } = useOrganizations();
  const isProvider = activeOrganization?.organizationType === "PROVIDER";
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (category) search.set("category", category);
    const query = search.toString();
    let cancelled = false;
    setLoaded(false);
    api
      .get<{ services: MarketplaceService[]; category: { name: string } | null }>(
        `/marketplace/services${query ? `?${query}` : ""}`,
      )
      .then((data) => {
        if (cancelled) return;
        setServices(data.services);
        setCategoryName(data.category?.name ?? null);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load services");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [q, category]);

  const heading = categoryName ? categoryName : q ? `Results for “${q}”` : "All services";
  const count = services.length;

  return (
    <>
      <Band>
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-white/60">
          <Link href={routes.home} className="transition hover:text-white">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="text-white/90">Services</span>
        </nav>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#F2A98B]">Service catalogue</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-5xl">{heading}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
          Search the catalogue, then send one RFQ. Providers only see location, sites and headcount.
        </p>

        <div className="mt-7 max-w-3xl">
          <SearchBar initial={q} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {CATEGORY_CHIPS.map((chip) => {
            const active = category.toLowerCase() === chip.slug;
            return (
              <Link
                key={chip.label}
                href={chipHref(chip.slug, q)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition duration-200",
                  active
                    ? "border-[#E36F47] bg-[#E36F47] text-[#0B2530] shadow-[0_8px_20px_-10px_rgba(227,111,71,0.9)]"
                    : "border-white/15 bg-white/10 text-white/85 hover:-translate-y-0.5 hover:border-[#F2A98B] hover:text-white",
                )}
              >
                {chip.label}
              </Link>
            );
          })}
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
                <p className="font-semibold">We couldn&apos;t load services</p>
                <p className="mt-0.5 text-red-700">{error}</p>
              </div>
            </div>
          ) : (
            <p aria-live="polite" className="mb-6 text-sm text-[#5A6A6F]">
              {loaded ? (
                <>
                  <span className="font-semibold text-[#12303A]">{count}</span> {count === 1 ? "service" : "services"}
                  {q ? <> matching “{q}”</> : null}
                </>
              ) : (
                "Loading services…"
              )}
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {!loaded && !error
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} aria-hidden className="skeleton h-72 rounded-2xl" />
                ))
              : services.map((service, index) => (
                  <div
                    key={service.id}
                    className="card-in h-full"
                    style={{ "--d": `${Math.min(index, 8) * 60}ms` } as CSSProperties}
                  >
                    <ServiceCard s={service} />
                  </div>
                ))}
          </div>

          {!error && loaded && count === 0 ? (
            <div className="mx-auto mt-4 max-w-xl rounded-3xl border border-dashed border-[#D9C8B0] bg-white/70 px-6 py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4EBDD] text-[#0F4C5C]">
                <SearchX className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="mt-5 font-display text-xl font-bold text-[#12303A]">No services match that search</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5A6A6F]">
                Try a broader keyword or another category. Can&apos;t find your scope? Post an RFQ and matched
                providers will come to you.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href={routes.services}
                  className="rounded-xl border border-[#EADFCF] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F4C5C] transition hover:border-[#7CC0C8]"
                >
                  Clear filters
                </Link>
                <Link
                  href={isProvider ? routes.providerRfqs : "/rfq/new"}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E36F47] px-4 py-2.5 text-sm font-semibold text-[#0B2530] shadow-[0_12px_30px_-12px_rgba(227,111,71,0.9)] transition hover:-translate-y-0.5 hover:bg-[#F2A98B]"
                >
                  {isProvider ? "Submit quote" : "Request Quote"} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#0B3440] px-4 py-24 text-center text-sm text-white/70">Loading services…</div>
      }
    >
      <ServicesResults />
    </Suspense>
  );
}