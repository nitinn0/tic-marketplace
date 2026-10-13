import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";

import type { MarketplaceProvider } from "@/features/marketplace/types";

const TYPE_LABEL: Record<string, string> = {
  CERTIFICATION_BODY: "Certification body",
  TESTING_LAB: "Testing lab",
  INSPECTION_COMPANY: "Inspection company",
  CONSULTANCY: "Consultancy",
  OTHER: "Provider",
};

export function ProviderCard({ p }: { p: MarketplaceProvider }) {
  return (
    <Link
      href={`/providers/${p.id}`}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display font-semibold group-hover:text-primary">{p.name}</h3>
        {p.verified ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-success">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{TYPE_LABEL[p.providerType] ?? "Provider"}</p>
      <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted-foreground">
        {p.headline || "Listed TIC service provider"}
      </p>
      {p.locations[0] ? (
        <p className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {p.locations[0]}
        </p>
      ) : null}
    </Link>
  );
}
