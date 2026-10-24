import Link from "next/link";
import { ArrowUpRight, Building2, Users } from "lucide-react";

import type { MarketplaceService } from "@/features/marketplace/types";
import { cn } from "@/lib/utils";

const TONES: Record<string, { panel: string; chip: string; accent: string }> = {
  CERTIFICATION: {
    panel: "from-[#0b3d91] to-[#1d5fd0]",
    chip: "bg-white/15 text-sky-50",
    accent: "text-sky-100",
  },
  TESTING: {
    panel: "from-teal-800 to-cyan-600",
    chip: "bg-white/15 text-teal-50",
    accent: "text-teal-100",
  },
  INSPECTION: {
    panel: "from-slate-800 to-slate-600",
    chip: "bg-white/15 text-slate-100",
    accent: "text-slate-200",
  },
  CONSULTING: {
    panel: "from-emerald-800 to-emerald-600",
    chip: "bg-white/15 text-emerald-50",
    accent: "text-emerald-100",
  },
  OTHER: {
    panel: "from-sky-800 to-sky-600",
    chip: "bg-white/15 text-sky-50",
    accent: "text-sky-100",
  },
};

function toneFor(categoryType: string) {
  return TONES[categoryType] ?? TONES.OTHER;
}

export function ServiceCard({ s }: { s: MarketplaceService }) {
  const tone = toneFor(s.categoryType);
  const hasProviders = s.providerCount > 0;

  return (
    <Link
      href={`/services/${s.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_-18px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-[0_22px_44px_-22px_rgba(15,23,42,0.45)]"
    >
      <div className={cn("relative min-h-[7.5rem] bg-gradient-to-br px-4 pb-4 pt-4 text-white", tone.panel)}>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10 blur-xl transition group-hover:bg-white/20"
        />
        <span className={cn("relative inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]", tone.chip)}>
          {s.categoryName}
        </span>
        <h3 className="relative mt-3 font-display text-lg font-semibold leading-snug tracking-tight">{s.name}</h3>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
          {s.description || "Accredited providers can quote this service. Send one RFQ and compare matched quotes."}
        </p>

        <div className="mt-auto space-y-3 pt-5">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            {s.postedBy ? (
              <>
                <Building2 className="h-3.5 w-3.5 text-sky-700" aria-hidden />
                <span className="truncate font-medium text-slate-700">Posted by {s.postedBy.name}</span>
              </>
            ) : (
              <>
                <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                <span>
                  {hasProviders
                    ? `${s.providerCount} ${s.providerCount === 1 ? "provider" : "providers"} listed`
                    : "Open for matching providers"}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-sky-800 transition group-hover:bg-sky-50">
            <span>View service</span>
            <ArrowUpRight
              className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
