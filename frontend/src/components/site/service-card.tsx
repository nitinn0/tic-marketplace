import Link from "next/link";

import type { MarketplaceService } from "@/features/marketplace/types";

export function ServiceCard({ s }: { s: MarketplaceService }) {
  return (
    <Link
      href={`/services/${s.slug}`}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-md"
    >
      <p className="text-xs text-muted-foreground">{s.categoryName}</p>
      <h3 className="mt-2 font-display font-semibold group-hover:text-primary">{s.name}</h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">
        {s.description || "Accredited providers can quote this service."}
      </p>
      <p className="mt-4 text-xs text-muted-foreground">
        {s.providerCount} {s.providerCount === 1 ? "provider" : "providers"}
      </p>
    </Link>
  );
}
