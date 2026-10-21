"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, FileText, FlaskConical, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/common/container";
import { HighlightCarousel, type CarouselSlide } from "@/components/dashboard/highlight-carousel";
import { clearSession, isAuthenticated } from "@/lib/auth";
import { api } from "@/lib/api";
import { routes } from "@/lib/constants";
import { ActiveOrganizationCard } from "@/features/organizations/components/active-organization-card";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import type { BuyerRfq, MarketplaceHome } from "@/features/marketplace/types";

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

const ACTIONS = [
  { href: routes.services, title: "Search services", body: "Labs, certification, inspection and ESG.", icon: Search },
  { href: routes.rfqNew, title: "Create an RFQ", body: "One request, matched providers, masked identity.", icon: FileText },
  { href: routes.rfqs, title: "My RFQs", body: "Compare quotes as they come back.", icon: FlaskConical },
  { href: routes.organizations, title: "Business details", body: "Switch buyer or provider organization.", icon: Building2 },
];

const BASE_SLIDES: CarouselSlide[] = [
  {
    id: "search",
    kicker: "Find a partner",
    title: "Search testing, certification and ESG in one place.",
    body: "Browse verified labs and consultants without creating an account.",
    href: routes.services,
    cta: "Browse services",
    image: "/carousel/lab.jpg",
  },
  {
    id: "mask",
    kicker: "Private by default",
    title: "Providers see the job, not your company.",
    body: "Location, sites and headcount are shared. Company name, email and personal details stay hidden.",
    href: routes.rfqNew,
    cta: "Request a quote",
    image: "/carousel/inspection.jpg",
  },
  {
    id: "quotes",
    kicker: "Compare",
    title: "Quotes come back from more than one provider.",
    body: "Shortlist on scope, exclusions and price instead of chasing email threads.",
    href: routes.rfqs,
    cta: "View my RFQs",
    image: "/carousel/certification.jpg",
  },
];

function serviceImage(service: { name: string; categoryName: string; slug: string }) {
  const text = `${service.name} ${service.categoryName} ${service.slug}`.toLowerCase();
  if (/(ghg|esg|emission|carbon|environment)/.test(text)) return "/carousel/esg.jpg";
  if (/(iso|cert|quality)/.test(text)) return "/carousel/certification.jpg";
  if (/(inspect|audit|plant|site)/.test(text)) return "/carousel/inspection.jpg";
  return "/carousel/lab.jpg";
}

export default function DashboardPage() {
  const router = useRouter();
  const { me, status, error: profileError, activeOrganization, activeContext } = useOrganizations();
  const [home, setHome] = useState<MarketplaceHome | null>(null);
  const [rfqs, setRfqs] = useState<BuyerRfq[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);

  useEffect(() => {
    if (status === "anonymous" && !isAuthenticated()) {
      window.location.href = "/login?next=/dashboard";
    }
  }, [status]);

  useEffect(() => {
    if (status === "ready" && activeOrganization?.organizationType === "PROVIDER") {
      router.replace(routes.providerDashboard);
    }
  }, [status, activeOrganization, router]);

  useEffect(() => {
    if (status !== "ready") return;
    const load = async () => {
      const [catalog, quotes] = await Promise.all([
        api.get<MarketplaceHome>("/marketplace/home").catch(() => null),
        api.get<{ rfqs: BuyerRfq[] }>("/rfqs").catch(() => ({ rfqs: [] })),
      ]);
      setHome(catalog);
      setRfqs(quotes.rfqs);
      setCatalogReady(true);
    };
    void load();
  }, [status, activeOrganization?.id]);

  const roles =
    (activeContext?.roles.length ? activeContext.roles : null) ??
    (activeOrganization?.roles.length ? activeOrganization.roles : null) ??
    me?.globalRoles ??
    [];
  const permissions = activeContext?.permissions.length ? activeContext.permissions : (me?.permissions ?? []);
  const openRfqs = rfqs.filter((rfq) => rfq.status === "OPEN");
  const quoteCount = rfqs.reduce((total, rfq) => total + rfq.quotes.length, 0);

  const slides = useMemo(() => {
    const popular = (home?.popular ?? []).slice(0, 3).map((service) => ({
      id: service.slug,
      kicker: service.categoryName,
      title: service.name,
      body: service.description || `${service.providerCount} public ${service.providerCount === 1 ? "provider" : "providers"} can quote this service.`,
      href: routes.service(service.slug),
      cta: "View service",
      image: serviceImage(service),
    }));
    return [...BASE_SLIDES, ...popular];
  }, [home]);

  const handleLogout = () => {
    clearSession();
    window.location.href = "/login";
  };

  return (
    <Container className="py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Workspace</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {me ? `Welcome back, ${me.user.firstName}` : "Dashboard"}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            Search services, send a masked RFQ, and compare quotes from matched providers.
          </p>
        </div>
        <Button variant="secondary" type="button" onClick={handleLogout}>
          Log out
        </Button>
      </div>

      {status === "loading" || (status === "ready" && !catalogReady) ? (
        <div className="mt-8 h-56 animate-pulse rounded-3xl bg-slate-200" />
      ) : status === "error" ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{profileError ?? "Unable to load dashboard."}</div>
      ) : me ? (
        <div className="mt-8 space-y-8">
          <HighlightCarousel slides={slides} />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ACTIONS.map(({ href, title, body, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"
              >
                <Icon className="h-5 w-5 text-sky-700" />
                <p className="mt-4 font-semibold text-slate-900 group-hover:text-sky-800">{title}</p>
                <p className="mt-1 text-sm text-slate-500">{body}</p>
              </Link>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Open RFQs" value={String(openRfqs.length)} hint={activeOrganization ? `In ${activeOrganization.displayName}` : "In this organization"} />
            <StatCard title="Quotes received" value={String(quoteCount)} hint="Across every request you have sent" />
            <StatCard
              title="Your role"
              value={roles.map((role) => role.name).join(", ") || "Member"}
              hint={
                activeOrganization
                  ? `${activeOrganization.organizationType === "BUYER" ? "Buyer" : "Provider"} at ${activeOrganization.displayName}`
                  : roles.length
                    ? "Platform role"
                    : "No organization selected"
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Recent RFQs</p>
                <Link href={routes.rfqs} className="text-sm font-medium text-sky-700">
                  View all
                </Link>
              </div>
              {rfqs.slice(0, 4).length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6">
                  <p className="font-medium text-slate-900">No RFQs in this organization yet.</p>
                  <p className="mt-1 text-sm text-slate-500">Switch to a buyer organization such as Acme Industries, then send one request.</p>
                  <Button asChild className="mt-4">
                    <Link href={routes.rfqNew}>
                      Create an RFQ <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {rfqs.slice(0, 4).map((rfq) => (
                    <li key={rfq.id}>
                      <Link href={routes.rfq(rfq.id)} className="flex items-center justify-between gap-4 py-4 hover:text-sky-800">
                        <span>
                          <span className="block font-medium text-slate-900">{rfq.title}</span>
                          <span className="mt-1 block text-sm text-slate-500">
                            {rfq.service.name} · {rfq.location}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm text-slate-500">
                          {rfq.quotes.length} {rfq.quotes.length === 1 ? "quote" : "quotes"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Account</p>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <dt className="text-slate-500">Name</dt>
                  <dd className="font-medium text-slate-900">{me.user.firstName} {me.user.lastName}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <dt className="text-slate-500">Email</dt>
                  <dd className="truncate font-medium text-slate-900">{me.user.email}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Organization</dt>
                  <dd className="truncate font-medium text-slate-900">{activeOrganization?.displayName ?? "None selected"}</dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                {roles.map((role) => (
                  <span key={role.id} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800">
                    {role.name}
                  </span>
                ))}
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {permissions.filter((entry) => entry.canView).length} permissions
                </span>
              </div>
            </div>
          </div>

          <ActiveOrganizationCard />
        </div>
      ) : null}
    </Container>
  );
}
