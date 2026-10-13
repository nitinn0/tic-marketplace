"use client";

import { useEffect, useState } from "react";

import { ProviderCard } from "@/components/site";
import { api } from "@/lib/api";
import type { MarketplaceProvider } from "@/features/marketplace/types";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<MarketplaceProvider[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ providers: MarketplaceProvider[] }>("/marketplace/providers")
      .then((data) => setProviders(data.providers))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load providers"));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Providers</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Public labs, inspectors, certification bodies and consultants. Verified badges are set by the platform.
      </p>
      {error ? <p className="mt-6 text-sm text-red-700">{error}</p> : null}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {providers.map((provider) => (
          <ProviderCard key={provider.id} p={provider} />
        ))}
      </div>
    </div>
  );
}
