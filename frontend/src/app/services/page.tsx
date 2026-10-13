"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { SearchBar, ServiceCard } from "@/components/site";
import { api } from "@/lib/api";
import type { MarketplaceService } from "@/features/marketplace/types";

function ServicesResults() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold">{heading}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Search the catalogue, then send one RFQ. Providers only see location, sites and headcount.
      </p>
      <div className="mt-6 max-w-3xl">
        <SearchBar initial={q} />
      </div>
      {error ? <p className="mt-6 text-sm text-red-700">{error}</p> : null}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((service) => (
          <ServiceCard key={service.id} s={service} />
        ))}
      </div>
      {!error && loaded && services.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No services match that search.</p>
      ) : null}
      {!loaded && !error ? <p className="mt-8 text-sm text-muted-foreground">Loading services…</p> : null}
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12 text-sm text-muted-foreground">Loading services…</div>}>
      <ServicesResults />
    </Suspense>
  );
}
