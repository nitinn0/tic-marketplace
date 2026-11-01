import Link from "next/link";
import { ArrowUpRight, Building2, FlaskConical, ScanSearch, ShieldCheck, Sparkles, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { MarketplaceService } from "@/features/marketplace/types";
import { cn } from "@/lib/utils";

/* Palette: Terracotta + Deep Teal (matches the home page)
   ink #12303A · muted #5A6A6F · sand border #EADFCF · cream #FBF6F0 · terracotta #E36F47 */

type Tone = {
  panel: string;
  chip: string;
  glow: string;
  icon: LucideIcon;
  hoverBorder: string;
  cta: string;
};

const TONES: Record<string, Tone> = {
  CERTIFICATION: {
    panel: "from-[#A9421F] to-[#E36F47]",
    chip: "bg-white/20 text-white",
    glow: "bg-[#FFD7B8]/40",
    icon: ShieldCheck,
    hoverBorder: "hover:border-[#F2A98B]",
    cta: "group-hover:bg-[#FDEEE6] group-hover:text-[#A8431F]",
  },
  TESTING: {
    panel: "from-[#0B3B47] to-[#1B7F8C]",
    chip: "bg-white/15 text-white",
    glow: "bg-[#7CC0C8]/40",
    icon: FlaskConical,
    hoverBorder: "hover:border-[#7CC0C8]",
    cta: "group-hover:bg-[#E8F4F5] group-hover:text-[#0F4C5C]",
  },
  INSPECTION: {
    panel: "from-[#12303A] to-[#2F5D68]",
    chip: "bg-white/15 text-white",
    glow: "bg-[#7CC0C8]/30",
    icon: ScanSearch,
    hoverBorder: "hover:border-[#7CC0C8]",
    cta: "group-hover:bg-[#E8F4F5] group-hover:text-[#0F4C5C]",
  },
  CONSULTING: {
    panel: "from-[#7A5410] to-[#C9922B]",
    chip: "bg-white/20 text-white",
    glow: "bg-[#E5C376]/40",
    icon: Users,
    hoverBorder: "hover:border-[#E5C376]",
    cta: "group-hover:bg-[#FBF3E0] group-hover:text-[#7A5410]",
  },
  OTHER: {
    panel: "from-[#0F4C5C] to-[#17707C]",
    chip: "bg-white/15 text-white",
    glow: "bg-[#7CC0C8]/35",
    icon: Sparkles,
    hoverBorder: "hover:border-[#7CC0C8]",
    cta: "group-hover:bg-[#E8F4F5] group-hover:text-[#0F4C5C]",
  },
};

function toneFor(categoryType: string) {
  return TONES[String(categoryType ?? "").toUpperCase()] ?? TONES.OTHER;
}

export function ServiceCard({ s }: { s: MarketplaceService }) {
  const tone = toneFor(s.categoryType);
  const Icon = tone.icon;
  const hasProviders = s.providerCount > 0;

  return (
    <Link
      href={`/services/${s.slug}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-[#EADFCF] bg-white",
        "shadow-[0_12px_30px_-20px_rgba(18,48,58,0.45)] transition duration-300",
        "hover:-translate-y-1.5 hover:shadow-[0_26px_50px_-24px_rgba(18,48,58,0.5)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C]",
        tone.hoverBorder,
      )}
    >
      {/* Coloured header panel */}
      <div className={cn("relative min-h-[8.5rem] overflow-hidden bg-gradient-to-br px-4 pb-4 pt-4 text-white", tone.panel)}>
        {/* dot texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:linear-gradient(135deg,black,transparent_70%)]"
        />
        {/* glow */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full blur-2xl transition duration-500 group-hover:scale-125",
            tone.glow,
          )}
        />
        {/* shine sweep on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -translate-x-full -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 ease-out group-hover:translate-x-[420%]"
        />

        <div className="relative flex items-start justify-between gap-3">
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur-sm",
              tone.chip,
            )}
          >
            {s.categoryName}
          </span>
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.45)] backdrop-blur-sm transition duration-300 group-hover:-translate-y-0.5 group-hover:rotate-6"
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        </div>

        <h3 className="relative mt-4 font-display text-lg font-semibold leading-snug tracking-tight">{s.name}</h3>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-3 text-sm leading-relaxed text-[#5A6A6F]">
          {s.description || "Accredited providers can quote this service. Send one RFQ and compare matched quotes."}
        </p>

        <div className="mt-auto space-y-3 pt-5">
          <div className="flex items-center gap-2 text-xs text-[#5A6A6F]">
            {s.postedBy ? (
              <>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8F4F5]">
                  <Building2 className="h-3.5 w-3.5 text-[#0F4C5C]" aria-hidden />
                </span>
                <span className="truncate font-medium text-[#3E5258]">Posted by {s.postedBy.name}</span>
              </>
            ) : (
              <>
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    hasProviders ? "bg-[#E8F4F5]" : "bg-[#F4EBDD]",
                  )}
                >
                  <Users className={cn("h-3.5 w-3.5", hasProviders ? "text-[#0F4C5C]" : "text-[#6B7B80]")} aria-hidden />
                </span>
                <span>
                  {hasProviders
                    ? `${s.providerCount} ${s.providerCount === 1 ? "provider" : "providers"} listed`
                    : "Open for matching providers"}
                </span>
              </>
            )}
          </div>

          <div
            className={cn(
              "flex items-center justify-between rounded-xl bg-[#FBF6F0] px-3 py-2.5 text-sm font-semibold text-[#0F4C5C] transition duration-300",
              tone.cta,
            )}
          >
            <span>View service</span>
            <span
              aria-hidden
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}