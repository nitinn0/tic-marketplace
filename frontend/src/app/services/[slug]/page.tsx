"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProviderCard } from "@/components/site";
import { api } from "@/lib/api";
import type { MarketplaceProvider, MarketplaceService } from "@/features/marketplace/types";

type ServiceDetail = MarketplaceService & { providers: MarketplaceProvider[] };

export default function ServiceDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<ServiceDetail>(`/marketplace/services/${slug}`)
      .then((data) => {
        if (!cancelled) setService(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Service not found");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-red-700">{error}</div>;
  }
  if (!service) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">Loading service…</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <p className="text-sm text-muted-foreground">{service.categoryPath.join(" / ") || service.categoryName}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold">{service.name}</h1>
        <Button asChild variant="cta">
          <Link href={`/rfq/new?service=${service.slug}`}>
            Request Quote <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        {service.description || "Send one RFQ and matched providers will quote this service."}
      </p>
      <h2 className="mt-12 font-display text-2xl font-bold">Providers for this service</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {service.providers.map((provider) => (
          <ProviderCard key={provider.id} p={provider} />
        ))}
      </div>
      {service.providers.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No public provider lists this service yet. You can still send an RFQ and we will match related providers.
        </p>
      ) : null}
    </div>
  );
}
