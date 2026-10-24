"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  EyeOff,
  FileText,
  FlaskConical,
  Leaf,
  Quote,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProviderCard, SearchBar, ServiceCard } from "@/components/site";
import { api } from "@/lib/api";
import { EMPTY_HOME, type MarketplaceCategory, type MarketplaceHome } from "@/features/marketplace/types";
import { cn } from "@/lib/utils";

const CAT_ICON: Record<string, LucideIcon> = {
  testing: FlaskConical,
  TESTING: FlaskConical,
  inspection: ScanSearch,
  INSPECTION: ScanSearch,
  certification: ShieldCheck,
  CERTIFICATION: ShieldCheck,
  esg: Leaf,
  "experts-consulting": Users,
  CONSULTING: Users,
  professional: Users,
};

const REVIEWS = [
  {
    id: "scope",
    text: "One RFQ went to matched labs. We compared scope and exclusions instead of chasing email threads.",
    author: "Quality lead, manufacturing",
  },
  {
    id: "mask",
    text: "Providers quoted on location, sites and headcount. Our company name stayed hidden until we were ready.",
    author: "EHS manager, chemicals",
  },
  {
    id: "quotes",
    text: "Quotes came back from more than one provider, so the shortlist was based on fit as well as price.",
    author: "Sustainability manager",
  },
];

const STEPS = [
  {
    i: ScanSearch,
    t: "Search services",
    d: "Browse labs, inspectors, certification bodies and ESG specialists. No account needed.",
  },
  {
    i: FileText,
    t: "Create an RFQ",
    d: "Describe the service, location, number of sites, headcount and timeline.",
  },
  {
    i: EyeOff,
    t: "We match and mask",
    d: "Matched providers see location, sites and headcount — not your company name.",
  },
  {
    i: Sparkles,
    t: "Compare quotes",
    d: "Quotes come back from multiple providers so you can shortlist on price and scope.",
  },
];

function iconFor(category: MarketplaceCategory) {
  return CAT_ICON[category.slug] ?? CAT_ICON[category.categoryType] ?? Sparkles;
}

const CATEGORY_LOOK: Record<string, { surface: string; icon: string; glow: string; bar: string }> = {
  testing: {
    surface: "from-teal-50 via-white to-white",
    icon: "bg-teal-700 text-white",
    glow: "bg-teal-400/25",
    bar: "bg-teal-600",
  },
  TESTING: {
    surface: "from-teal-50 via-white to-white",
    icon: "bg-teal-700 text-white",
    glow: "bg-teal-400/25",
    bar: "bg-teal-600",
  },
  inspection: {
    surface: "from-slate-100 via-white to-white",
    icon: "bg-slate-800 text-white",
    glow: "bg-slate-400/20",
    bar: "bg-slate-700",
  },
  INSPECTION: {
    surface: "from-slate-100 via-white to-white",
    icon: "bg-slate-800 text-white",
    glow: "bg-slate-400/20",
    bar: "bg-slate-700",
  },
  certification: {
    surface: "from-sky-50 via-white to-white",
    icon: "bg-[#0b3d91] text-white",
    glow: "bg-sky-400/25",
    bar: "bg-sky-700",
  },
  CERTIFICATION: {
    surface: "from-sky-50 via-white to-white",
    icon: "bg-[#0b3d91] text-white",
    glow: "bg-sky-400/25",
    bar: "bg-sky-700",
  },
  "experts-consulting": {
    surface: "from-emerald-50 via-white to-white",
    icon: "bg-emerald-700 text-white",
    glow: "bg-emerald-400/25",
    bar: "bg-emerald-600",
  },
  CONSULTING: {
    surface: "from-emerald-50 via-white to-white",
    icon: "bg-emerald-700 text-white",
    glow: "bg-emerald-400/25",
    bar: "bg-emerald-600",
  },
};

function lookFor(category: MarketplaceCategory) {
  return (
    CATEGORY_LOOK[category.slug] ??
    CATEGORY_LOOK[category.categoryType] ?? {
      surface: "from-sky-50 via-white to-white",
      icon: "bg-sky-700 text-white",
      glow: "bg-sky-400/20",
      bar: "bg-sky-600",
    }
  );
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-relaxed text-slate-600 md:text-base">{description}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-sky-700 transition hover:text-sky-900"
        >
          {action.label}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

export function HomePage() {
  const [home, setHome] = useState<MarketplaceHome>(EMPTY_HOME);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<MarketplaceHome>("/marketplace/home")
      .then((data) => {
        if (!cancelled) setHome(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Catalog is unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const verified = home.counts.verifiedProviders;
  const popularLinks = home.popular.slice(0, 5);
  const featuredProviders = home.providers.filter((provider) => provider.verified).slice(0, 6);

  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200/80">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,91,215,0.12),_transparent_55%),linear-gradient(180deg,#eef5ff_0%,#f8fafc_58%,#ffffff_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.28] [background-image:linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        />

        <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-14 text-center sm:px-6 md:pb-20 md:pt-20">
          <p className="auth-rise text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
              <BadgeCheck className="h-4 w-4 text-emerald-600" aria-hidden />
              {verified} verified {verified === 1 ? "provider" : "providers"}
            </span>
            <span className="mx-2 text-slate-300">·</span>
            <span>
              {home.counts.services} {home.counts.services === 1 ? "service" : "services"}
            </span>
            <span className="mx-2 text-slate-300">·</span>
            <span>No sign-up to browse</span>
          </p>

          <h1 className="auth-rise mt-5 font-display text-4xl font-extrabold tracking-tight text-slate-900 md:text-6xl md:leading-[1.05]">
            Find the right testing, certification
            <br className="hidden md:block" /> or ESG partner.
          </h1>
          <p className="auth-rise mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
            Search accredited labs, inspectors, certification bodies and sustainability experts. Send one RFQ, receive
            comparable quotes, decide with the match in front of you.
          </p>

          <div className="auth-rise mx-auto mt-8 max-w-3xl">
            <SearchBar large />
          </div>

          {popularLinks.length > 0 ? (
            <div className="auth-rise mt-5 flex flex-wrap justify-center gap-2">
              {popularLinks.map((service) => (
                <Link
                  key={service.slug}
                  href={`/services/${service.slug}`}
                  className="rounded-lg border border-slate-200/90 bg-white/80 px-3 py-1.5 text-sm text-slate-600 transition hover:border-sky-300 hover:text-sky-800"
                >
                  {service.name}
                </Link>
              ))}
            </div>
          ) : null}
          {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-slate-200/80 bg-slate-50/80">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(15,91,215,0.08),_transparent_45%),radial-gradient(ellipse_at_bottom_left,_rgba(13,148,136,0.07),_transparent_40%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
          <SectionHeading
            title="Browse by category"
            description="Start with the kind of work you need, then narrow into the exact service."
            action={{ href: "/services", label: "All services" }}
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {home.categories.map((category) => {
              const Icon = iconFor(category);
              const look = lookFor(category);
              return (
                <Link
                  key={category.id}
                  href={`/services?category=${category.slug}`}
                  className={cn(
                    "group relative flex min-h-[15.5rem] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b p-5 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.4)] transition duration-300",
                    look.surface,
                    "hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.45)]",
                  )}
                >
                  <span aria-hidden className={cn("pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl", look.glow)} />
                  <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1", look.bar)} />
                  <span className={cn("relative flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm", look.icon)}>
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="relative mt-5 font-display text-xl font-bold tracking-tight text-slate-900">
                    {category.name}
                  </h3>
                  <p className="relative mt-2 flex-1 text-sm leading-relaxed text-slate-600">{category.tagline}</p>
                  <div className="relative mt-5 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-3">
                    <span className="rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                      {category.serviceCount} {category.serviceCount === 1 ? "service" : "services"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-800 opacity-0 transition group-hover:opacity-100">
                      Browse
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-16 md:mt-20">
            <SectionHeading
              title="Popular services"
              description="Frequently requested scopes buyers send to matched providers."
            />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {home.popular.map((service) => (
                <ServiceCard key={service.slug} s={service} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 md:mt-24">
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-sky-50/60 p-8 md:p-10">
          <SectionHeading
            title="How sourcing works"
            description="Search, send one RFQ, and compare quotes. Providers never see who you are until you engage."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {STEPS.map(({ i: Icon, t, d }, index) => (
              <div
                key={t}
                className="relative rounded-2xl border border-white/80 bg-white/80 p-5 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)] backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-700 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <Icon className="h-4 w-4 text-sky-700" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 md:mt-24">
        <SectionHeading
          title="Featured verified providers"
          description="Public profiles that opted in and passed platform verification."
          action={{ href: "/providers", label: "All providers" }}
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {featuredProviders.map((provider) => (
            <ProviderCard key={provider.id} p={provider} />
          ))}
        </div>
        {featuredProviders.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Verified providers will appear here as profiles are approved.
          </p>
        ) : null}
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 md:mt-24">
        <SectionHeading
          title="Trusted by quality, EHS and sustainability teams"
          description="What buyers notice once RFQs replace scattered email threads."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {REVIEWS.map((review) => (
            <figure
              key={review.id}
              className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 transition hover:border-sky-200"
            >
              <Quote className="h-5 w-5 text-sky-200" aria-hidden />
              <blockquote className="mt-4 text-sm leading-relaxed text-slate-700">&ldquo;{review.text}&rdquo;</blockquote>
              <figcaption className="mt-5 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
                {review.author}
              </figcaption>
            </figure>
          ))}
        </div>
        {home.industries.length > 0 ? (
          <div className="mt-8 flex flex-wrap gap-2">
            {home.industries.map((industry) => (
              <span
                key={industry}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {industry}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 pb-16 sm:px-6 md:mt-24 md:pb-20">
        <div className="grid overflow-hidden rounded-[1.75rem] bg-[#0b1220] text-slate-50 md:grid-cols-2">
          <div className="relative p-8 md:p-10">
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl" />
            <h2 className="relative font-display text-3xl font-bold tracking-tight">Need a quote this week?</h2>
            <p className="relative mt-3 max-w-md text-sm leading-relaxed text-slate-300">
              Post one RFQ and hear back from up to 5 matched providers — usually within 48 hours.
            </p>
            <Button asChild variant="cta" size="lg" className="relative mt-7">
              <Link href="/rfq/new">
                Request Quote <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="relative border-t border-white/10 p-8 md:border-l md:border-t-0 md:p-10">
            <div aria-hidden className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
            <h2 className="relative font-display text-3xl font-bold tracking-tight">Are you a lab, auditor or consultant?</h2>
            <p className="relative mt-3 max-w-md text-sm leading-relaxed text-slate-300">
              List your accreditations and receive qualified RFQs from buyers across India.
            </p>
            <Button asChild variant="secondary" size="lg" className="relative mt-7">
              <Link href="/join">Join as Provider</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
