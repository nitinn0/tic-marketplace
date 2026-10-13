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

function iconFor(category: MarketplaceCategory) {
  return CAT_ICON[category.slug] ?? CAT_ICON[category.categoryType] ?? Sparkles;
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

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-accent/60 to-background">
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-16 text-center sm:px-6 md:pt-24">
          <p className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <BadgeCheck className="h-3.5 w-3.5 text-success" />
            {verified} verified {verified === 1 ? "provider" : "providers"} · {home.counts.services}{" "}
            {home.counts.services === 1 ? "service" : "services"} · No sign-up to browse
          </p>
          <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
            Find the right testing, certification
            <br className="hidden md:block" /> or ESG partner.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Search accredited labs, inspectors, certification bodies and sustainability experts.
            Send one RFQ, receive comparable quotes, decide with the match in front of you.
          </p>
          <div className="mx-auto mt-8 max-w-3xl">
            <SearchBar large />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            {popularLinks.map((service) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground hover:border-primary hover:text-primary"
              >
                {service.name}
              </Link>
            ))}
          </div>
          {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold">Browse by category</h2>
          <Link href="/services" className="text-sm text-primary">
            All services →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {home.categories.map((category) => {
            const Icon = iconFor(category);
            return (
              <Link
                key={category.id}
                href={`/services?category=${category.slug}`}
                className="group rounded-xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-md"
              >
                <Icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-display font-semibold group-hover:text-primary">{category.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{category.tagline}</p>
                <p className="mt-3 text-xs text-muted-foreground">{category.serviceCount} services</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="font-display text-2xl font-bold">Popular services</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {home.popular.map((service) => (
            <ServiceCard key={service.slug} s={service} />
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="rounded-2xl border border-border bg-surface p-8 md:p-10">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-bold">How sourcing works</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Search, send one RFQ, and compare quotes. Providers never see who you are.
            </p>
          </div>
          <div className="mt-8 grid gap-8 md:grid-cols-4">
            {[
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
                d: "The API ranks related providers. They see location, sites and headcount. Company name, email and personal details stay hidden.",
              },
              {
                i: Sparkles,
                t: "Compare quotes",
                d: "Quotes come back from multiple providers so you can shortlist on price and scope.",
              },
            ].map(({ i: Icon, t, d }) => (
              <div key={t}>
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold">Featured verified providers</h2>
          <Link href="/providers" className="text-sm text-primary">
            All providers →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {home.providers
            .filter((provider) => provider.verified)
            .slice(0, 6)
            .map((provider) => (
              <ProviderCard key={provider.id} p={provider} />
            ))}
        </div>
        {home.providers.filter((provider) => provider.verified).length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Verified providers will appear here as profiles are approved.</p>
        ) : null}
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <h2 className="font-display text-2xl font-bold">Trusted by quality, EHS and sustainability teams</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {REVIEWS.map((review) => (
            <figure key={review.id} className="rounded-xl border border-border bg-card p-6">
              <blockquote className="text-sm">&ldquo;{review.text}&rdquo;</blockquote>
              <figcaption className="mt-4 text-xs text-muted-foreground">{review.author}</figcaption>
            </figure>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {home.industries.map((industry) => (
            <span key={industry} className="rounded-full bg-surface px-3 py-1 text-xs text-muted-foreground">
              {industry}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 pb-16 sm:px-6">
        <div className="grid gap-6 rounded-2xl bg-ink p-10 text-ink-foreground md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold">Need a quote this week?</h2>
            <p className="mt-2 opacity-80">
              Post one RFQ and hear back from up to 5 matched providers — usually within 48 hours.
            </p>
            <Button asChild variant="cta" size="lg" className="mt-6">
              <Link href="/rfq/new">
                Request Quote <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="md:border-l md:border-ink-foreground/20 md:pl-6">
            <h2 className="font-display text-3xl font-bold">Are you a lab, auditor or consultant?</h2>
            <p className="mt-2 opacity-80">
              List your accreditations and receive qualified RFQs from buyers across India.
            </p>
            <Button asChild variant="secondary" size="lg" className="mt-6">
              <Link href="/join">Join as Provider</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
