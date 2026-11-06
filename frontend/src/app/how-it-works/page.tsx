import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronRight, EyeOff, FileText, ScanSearch, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Container } from "@/components/common/container";
import { routes } from "@/lib/constants";

export const metadata: Metadata = {
  title: "How it works — TIC Marketplace",
  description: "Search services, send one masked RFQ, and compare quotes from matched providers.",
};

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ScanSearch,
    title: "Search services",
    body: "Browse labs, inspectors, certification bodies and ESG specialists. You can look around before creating an account.",
  },
  {
    icon: FileText,
    title: "Create an RFQ",
    body: "Describe the service, location, number of sites, headcount and timeline in one request.",
  },
  {
    icon: EyeOff,
    title: "We match and mask",
    body: "Related providers are ranked for the job. They see location, sites and headcount. Company name, email and personal details stay hidden.",
  },
  {
    icon: Sparkles,
    title: "Compare quotes",
    body: "Quotes come back from more than one provider so you can shortlist on scope, exclusions and price.",
  },
];

const CORAL =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#E36F47] px-4 py-2.5 text-sm font-semibold text-[#0B2530] shadow-[0_12px_30px_-12px_rgba(227,111,71,0.9)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#F2A98B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C]";

const GHOST =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[#EADFCF] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F4C5C] transition hover:border-[#7CC0C8] hover:bg-[#E8F4F5]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C]";

export default function HowItWorksPage() {
  return (
    <div className="bg-[#FBF6F0]">
      <section className="relative overflow-hidden bg-[#0B3440] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(27,127,140,0.5),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(227,111,71,0.26),_transparent_45%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]"
        />
        <Container className="relative py-10 md:py-14">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-white/60">
            <Link href={routes.home} className="transition hover:text-white">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className="text-white/90">How it works</span>
          </nav>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#F2A98B]">Marketplace</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-5xl">How it works</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
            Buyers send one request and compare quotes. Providers see the job, not the company, until a buyer is ready to talk.
          </p>
        </Container>
      </section>

      <Container className="py-10 md:py-14">
        <ol className="grid gap-4 md:grid-cols-2">
          {STEPS.map(({ icon: Icon, title, body }, index) => (
            <li
              key={title}
              className="rounded-3xl border border-[#EADFCF] bg-white p-6 shadow-[0_14px_34px_-24px_rgba(18,48,58,0.45)]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#166B78] to-[#17707C] text-sm font-bold text-white shadow-md">
                  {index + 1}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDEEE6] text-[#E36F47]">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
              </div>
              <h2 className="mt-5 font-display text-lg font-semibold tracking-tight text-[#12303A]">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5A6A6F]">{body}</p>
            </li>
          ))}
        </ol>

        <section className="relative mt-8 overflow-hidden rounded-[1.75rem] border border-[#EADFCF] bg-gradient-to-br from-white via-[#FBF6F0] to-[#FDEEE6]/70 p-6 shadow-[0_18px_40px_-28px_rgba(18,48,58,0.5)] sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#7CC0C8]/25 blur-3xl" />
          <div className="relative max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E36F47]">For providers</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#12303A]">Receive matching RFQs</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5A6A6F]">
              Join with your business details, complete your profile, and receive matching RFQs. Quote on scope and price
              without seeing the buyer’s company name.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={routes.join} className={CORAL}>
                Join as a provider
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href={routes.services} className={GHOST}>
                Browse services
              </Link>
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}
