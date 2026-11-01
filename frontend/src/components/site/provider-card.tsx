import Link from "next/link";
import { ArrowUpRight, BadgeCheck, MapPin } from "lucide-react";

import type { MarketplaceProvider } from "@/features/marketplace/types";
import { cn } from "@/lib/utils";

/* Palette: Terracotta + Deep Teal
   ink #12303A · muted #5A6A6F · sand border #EADFCF · cream #FBF6F0 · terracotta #E36F47 */

const TYPE_LABEL: Record<string, string> = {
  CERTIFICATION_BODY: "Certification body",
  TESTING_LAB: "Testing lab",
  INSPECTION_COMPANY: "Inspection company",
  CONSULTANCY: "Consultancy",
  OTHER: "Provider",
};

/* Each provider gets a stable avatar colour derived from its name */
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

export function ProviderCard({ p }: { p: MarketplaceProvider }) {
  const types = (p.providerTypes?.length ? p.providerTypes : [p.providerType])
    .map((type) => TYPE_LABEL[type] ?? type)
    .filter(Boolean);
  const location = p.locations[0];

  return (
    <Link
      href={`/providers/${p.id}`}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#EADFCF] bg-white p-5",
        "shadow-[0_12px_30px_-22px_rgba(18,48,58,0.45)] transition duration-300",
        "hover:-translate-y-1 hover:border-[#7CC0C8] hover:shadow-[0_26px_50px_-26px_rgba(18,48,58,0.5)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C]",
      )}
    >
      {/* accent bar that draws in on hover */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#1B7F8C] to-[#E36F47] transition duration-500 group-hover:scale-x-100"
      />
      {/* soft glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#7CC0C8]/20 blur-2xl transition duration-500 group-hover:bg-[#E36F47]/20"
      />

      <div className="relative flex items-start gap-3.5">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-bold tracking-wide text-white",
            "shadow-[0_10px_20px_-10px_rgba(18,48,58,0.6)] ring-4 ring-[#FBF6F0] transition duration-300 group-hover:rotate-3 group-hover:scale-105",
            avatarFor(p.name),
          )}
        >
          {initials(p.name) || "P"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-display text-base font-semibold tracking-tight text-[#12303A] transition group-hover:text-[#0F4C5C]">
              {p.name}
            </h3>
            {p.verified ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                Verified
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(types.length ? types : ["Provider"]).slice(0, 2).map((type) => (
              <span
                key={type}
                className="rounded-full bg-[#E8F4F5] px-2 py-0.5 text-[11px] font-medium text-[#0F4C5C]"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="relative mt-4 line-clamp-2 flex-1 text-sm leading-relaxed text-[#5A6A6F]">
        {p.headline || "Listed TIC service provider"}
      </p>

      {p.services.length > 0 ? (
        <div className="relative mt-4 flex flex-wrap gap-1.5">
          {p.services.slice(0, 2).map((service) => (
            <span
              key={service.slug}
              className="rounded-lg bg-[#F4EBDD] px-2 py-0.5 text-[11px] font-medium text-[#5A4A32]"
            >
              {service.name}
            </span>
          ))}
          {p.services.length > 2 ? (
            <span className="rounded-lg border border-[#EADFCF] px-2 py-0.5 text-[11px] font-medium text-[#6B7B80]">
              +{p.services.length - 2}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-[#EADFCF] pt-4">
        {location ? (
          <p className="inline-flex min-w-0 items-center gap-1.5 text-xs text-[#5A6A6F]">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#E36F47]" aria-hidden />
            <span className="truncate">{location}</span>
          </p>
        ) : (
          <span className="text-xs text-[#6B7B80]">Provider profile</span>
        )}
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#0F4C5C]">
          View profile
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8F4F5] transition duration-300 group-hover:bg-[#E36F47] group-hover:text-white"
          >
            <ArrowUpRight className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-px group-hover:-translate-y-px" />
          </span>
        </span>
      </div>
    </Link>
  );
}