import type { Metadata } from "next";
import Link from "next/link";
import { EyeOff, FileText, ScanSearch, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
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

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Marketplace</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">How it works</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Buyers send one request and compare quotes. Providers see the job, not the company, until a buyer is ready to talk.
      </p>

      <ol className="mt-10 grid gap-4 md:grid-cols-2">
        {STEPS.map(({ icon: Icon, title, body }, index) => (
          <li key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sm font-semibold text-sky-800">
                {index + 1}
              </span>
              <Icon className="h-5 w-5 text-sky-700" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{body}</p>
          </li>
        ))}
      </ol>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">For providers</h2>
        <p className="mt-2 text-sm text-slate-600">
          Join with your business details, complete your profile, and receive matching RFQs. Quote on scope and price
          without seeing the buyer’s company name.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={routes.join}>Join as a provider</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={routes.services}>Browse services</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
