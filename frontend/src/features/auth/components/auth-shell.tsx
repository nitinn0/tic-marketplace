import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { routes } from "@/lib/constants";
import { cn } from "@/lib/utils";

const HIGHLIGHTS = [
  "Search accredited testing, inspection and certification services",
  "Send one RFQ and compare quotes from matched providers",
  "Keep buyer and provider workspaces separate and permissioned",
];

export function AuthShell({
  eyebrow,
  title,
  description,
  highlights = HIGHLIGHTS,
  children,
  footer,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  highlights?: string[];
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(15,91,215,0.14),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(14,116,144,0.12),_transparent_50%),linear-gradient(180deg,#f8fafc_0%,#eef4fb_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl items-center px-4 py-10 sm:px-6 lg:py-14">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-sm lg:grid-cols-[1.05fr_0.95fr]">
          <aside className="relative overflow-hidden bg-[#0b3d91] px-8 py-10 text-white sm:px-10 sm:py-12">
            <div
              aria-hidden
              className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-400/20 blur-2xl"
            />
            <div
              aria-hidden
              className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl"
            />
            <div className="relative flex h-full flex-col">
              <Link href={routes.home} className="inline-flex items-center gap-2 text-sky-100 transition hover:text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-sm font-bold tracking-tight">
                  TIC
                </span>
                <span className="text-sm font-semibold tracking-[0.14em] uppercase">Marketplace</span>
              </Link>

              <h1 className="mt-10 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-sky-100/95">{description}</p>

              <ul className="mt-10 space-y-3.5">
                {highlights.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-snug text-sky-50/95">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-200" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-12">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/80">{eyebrow}</p>
                <Link
                  href={routes.howItWorks}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-white/90 transition hover:text-white"
                >
                  See how it works
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          </aside>

          <section className="flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-12">
            {children}
            {footer ? <div className="mt-8 border-t border-slate-100 pt-6">{footer}</div> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
