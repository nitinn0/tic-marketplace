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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ProviderCard({ p }: { p: MarketplaceProvider }) {
  const types = (p.providerTypes?.length ? p.providerTypes : [p.providerType])
    .map((type) => TYPE_LABEL[type] ?? type)
    .filter(Boolean);

  return (
    <Link
      href={`/providers/${p.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 transition duration-300 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-700 to-sky-900 text-sm font-semibold tracking-wide text-white">
          {initials(p.name) || "P"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-display text-base font-semibold tracking-tight text-slate-900 transition group-hover:text-sky-800">
              {p.name}
            </h3>
            {p.verified ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                Verified
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-slate-500">{types.join(" · ") || "Provider"}</p>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">
        {p.headline || "Listed TIC service provider"}
      </p>

      {p.services.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {p.services.slice(0, 2).map((service) => (
            <span key={service.slug} className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
              {service.name}
            </span>
          ))}
          {p.services.length > 2 ? (
            <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">+{p.services.length - 2}</span>
          ) : null}
        </div>
      ) : null}

      {p.locations[0] ? (
        <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 text-sky-700" aria-hidden />
          <span className="truncate">{p.locations[0]}</span>
        </p>
      ) : null}
    </Link>
  );
}
