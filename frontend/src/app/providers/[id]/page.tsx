"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BadgeCheck, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { MarketplaceProvider } from "@/features/marketplace/types";

export default function ProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const [provider, setProvider] = useState<MarketplaceProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<MarketplaceProvider>(`/marketplace/providers/${params.id}`)
      .then(setProvider)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Provider not found"));
  }, [params.id]);

  if (error) return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-red-700">{error}</div>;
  if (!provider) return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">Loading provider…</div>;

  const quoteHref = provider.services[0] ? `/rfq/new?service=${provider.services[0].slug}` : "/rfq/new";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{provider.name}</h1>
          <p className="mt-2 text-muted-foreground">{provider.headline}</p>
        </div>
        {provider.verified ? (
          <span className="inline-flex items-center gap-1 text-sm text-success">
            <BadgeCheck className="h-4 w-4" /> Verified
          </span>
        ) : null}
      </div>
      {provider.description ? <p className="mt-6 text-sm leading-6">{provider.description}</p> : null}
      {provider.yearsInBusiness ? (
        <p className="mt-4 text-sm text-muted-foreground">{provider.yearsInBusiness} years in business</p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-2">
        {provider.locations.map((location) => (
          <span key={location} className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {location}
          </span>
        ))}
      </div>
      <h2 className="mt-10 font-display text-xl font-bold">Services</h2>
      <ul className="mt-3 space-y-2">
        {provider.services.map((service) => (
          <li key={service.slug}>
            <Link href={`/services/${service.slug}`} className="text-sm text-primary">
              {service.name}
            </Link>
          </li>
        ))}
      </ul>
      <Button asChild variant="cta" className="mt-8">
        <Link href={quoteHref}>Request a quote</Link>
      </Button>
    </div>
  );
}
