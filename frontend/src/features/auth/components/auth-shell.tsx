import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { routes } from "@/lib/constants";
import { cn } from "@/lib/utils";

/* Palette: Terracotta + Deep Teal
   dark band #0B3440 · cream #FBF6F0 · terracotta #E36F47 · peach #F2A98B · ink #12303A */

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
    <div className={cn("relative isolate overflow-hidden bg-[#FBF6F0]", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(27,127,140,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(227,111,71,0.14),_transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(18,48,58,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(18,48,58,0.05)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl items-center px-4 py-10 sm:px-6 lg:py-14">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-[#EADFCF] bg-white/95 shadow-[0_24px_80px_-32px_rgba(18,48,58,0.4)] backdrop-blur-sm lg:grid-cols-[1.05fr_0.95fr]">
          <aside className="relative overflow-hidden bg-[#0B3440] px-8 py-10 text-white sm:px-10 sm:py-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(27,127,140,0.55),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(227,111,71,0.28),_transparent_45%)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]"
            />
            <div className="relative flex h-full flex-col">
              <Link href={routes.home} className="inline-flex items-center gap-2 text-white/80 transition hover:text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1B7F8C] to-[#0F4C5C] text-sm font-bold tracking-tight ring-1 ring-white/20">
                  TIC
                </span>
                <span className="text-sm font-semibold tracking-[0.14em] uppercase">Marketplace</span>
              </Link>

              <p className="mt-10 text-xs font-bold uppercase tracking-[0.18em] text-[#F2A98B]">{eyebrow}</p>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-white/75">{description}</p>

              <ul className="mt-10 space-y-3.5">
                {highlights.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-snug text-white/85">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F2A98B]" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-12">
                <Link
                  href={routes.howItWorks}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 transition hover:text-white"
                >
                  See how it works
                  <ArrowRight className="h-3.5 w-3.5 text-[#E36F47]" aria-hidden />
                </Link>
              </div>
            </div>
          </aside>

          <section className="flex flex-col justify-center bg-[#FBF6F0]/50 px-6 py-9 sm:px-10 sm:py-12">
            {children}
            {footer ? <div className="mt-8 border-t border-[#EADFCF] pt-6">{footer}</div> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
