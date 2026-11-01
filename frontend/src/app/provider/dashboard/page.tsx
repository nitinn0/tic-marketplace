"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardList, LogOut, MapPin, ShieldCheck, Tags } from "lucide-react";

import { Container } from "@/components/common/container";
import { Badge } from "@/components/ui/badge";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { ProviderBasicForm } from "@/features/providers/components/provider-basic-form";
import { ProviderServicesPanel } from "@/features/providers/components/provider-services-panel";
import { providersService } from "@/features/providers/services/providers.service";
import type { ProviderProfile } from "@/features/providers/types";
import {
  formatProviderTypes,
  profileVerificationLabels,
  profileVerificationTones,
} from "@/features/providers/utils/labels";
import { formatMoney, type ProviderRfq } from "@/features/marketplace/types";
import { ApiError, api } from "@/lib/api";
import { clearSession, isAuthenticated } from "@/lib/auth";
import { routes } from "@/lib/constants";
import { cn } from "@/lib/utils";

/* Palette: Terracotta + Deep Teal
   dark #0B3440 · cream #FBF6F0 · terracotta #E36F47 · peach #F2A98B · ink #12303A · sand #EADFCF */

type RfqGroup = "PENDING" | "QUOTED" | "AWARDED" | "CLOSED" | string;

const CORAL_BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#E36F47] px-4 py-2.5 text-sm font-semibold text-[#0B2530] shadow-[0_12px_30px_-12px_rgba(227,111,71,0.9)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#F2A98B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C]";

const GHOST_BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[#EADFCF] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F4C5C] transition hover:border-[#7CC0C8] hover:bg-[#E8F4F5]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C]";

function rfqGroup(rfq: ProviderRfq): RfqGroup {
  if (rfq.quote?.status === "ACCEPTED") return "AWARDED";
  if (rfq.quote?.status === "SUBMITTED") return "QUOTED";
  if (rfq.status === "CLOSED") return "CLOSED";
  if (!rfq.status || rfq.status === "OPEN") return "PENDING";
  return rfq.status;
}

function groupLabel(group: RfqGroup) {
  if (group === "PENDING") return "Pending";
  if (group === "QUOTED") return "Quoted";
  if (group === "AWARDED") return "Awarded";
  if (group === "CLOSED") return "Closed";
  return group
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-[#EADFCF] bg-white p-5 shadow-[0_12px_30px_-22px_rgba(18,48,58,0.45)]">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E36F47]">{title}</p>
      <p className="mt-2 font-display text-2xl font-bold text-[#12303A]">{value}</p>
      <p className="mt-1 text-sm text-[#5A6A6F]">{hint}</p>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#EADFCF] bg-white p-6 shadow-[0_12px_30px_-22px_rgba(18,48,58,0.45)]">
      {children}
    </section>
  );
}

export default function ProviderDashboardPage() {
  const router = useRouter();
  const { me, status, error: profileError, activeOrganization } = useOrganizations();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [missingProfile, setMissingProfile] = useState(false);
  const [rfqs, setRfqs] = useState<ProviderRfq[]>([]);
  const [panel, setPanel] = useState<"overview" | "services" | "rfqs">("overview");
  const [rfqFilter, setRfqFilter] = useState<RfqGroup | "ALL">("ALL");
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const organizationId = activeOrganization?.organizationType === "PROVIDER" ? activeOrganization.id : null;

  useEffect(() => {
    if (status === "anonymous" && !isAuthenticated()) {
      router.replace(`${routes.login}?next=${encodeURIComponent(routes.providerDashboard)}`);
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "ready" && activeOrganization && activeOrganization.organizationType !== "PROVIDER") {
      router.replace(routes.dashboard);
    }
  }, [status, activeOrganization, router]);

  useEffect(() => {
    if (status !== "ready" || !organizationId) return;
    let cancelled = false;
    setReady(false);
    setLoadError(null);
    const load = async () => {
      const [profileResult, quotes] = await Promise.all([
        providersService.getProfile(organizationId).then(
          (data) => ({ data, missing: false }),
          (err: unknown) => {
            if (err instanceof ApiError && err.status === 404) return { data: null, missing: true };
            throw err;
          },
        ),
        api.get<{ rfqs: ProviderRfq[] }>("/provider/rfqs").catch(() => ({ rfqs: [] as ProviderRfq[] })),
      ]);
      if (cancelled) return;
      setProfile(profileResult.data);
      setMissingProfile(profileResult.missing);
      setRfqs(quotes.rfqs);
      setReady(true);
    };
    void load().catch((err: unknown) => {
      if (cancelled) return;
      setLoadError(err instanceof Error ? err.message : "Unable to load the provider dashboard.");
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [status, organizationId]);

  const quoted = rfqs.filter((rfq) => rfq.quote);
  const otherGroups = [
    ...new Set(rfqs.map(rfqGroup).filter((group) => group !== "PENDING" && group !== "QUOTED" && group !== "AWARDED")),
  ];
  const filters: Array<RfqGroup | "ALL"> = [
    "ALL",
    "PENDING",
    "QUOTED",
    "AWARDED",
    ...(otherGroups.length ? otherGroups : ["CLOSED"]),
  ];
  const visibleRfqs = rfqFilter === "ALL" ? rfqs : rfqs.filter((rfq) => rfqGroup(rfq) === rfqFilter);
  const services = profile?.capabilities.services.length ?? 0;
  const standards = profile?.capabilities.standards.length ?? 0;
  const locations = profile?.capabilities.locations.length ?? 0;

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "services" as const, label: "Services" },
    { id: "rfqs" as const, label: "All RFQs" },
  ];

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
        <Container className="relative py-10 md:py-12">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F2A98B]">Provider workspace</p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
                {me ? `Welcome back, ${me.user.firstName}` : "Provider dashboard"}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">
                {activeOrganization
                  ? `Keep ${activeOrganization.displayName} ready for incoming requests.`
                  : "Create a provider organization to start receiving RFQs."}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
              onClick={() => {
                clearSession();
                window.location.href = routes.login;
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Log out
            </button>
          </div>
        </Container>
      </section>

      <Container className="py-10 md:py-12">
        {status === "loading" || (organizationId && !ready && !loadError) ? (
          <div className="skeleton h-56 rounded-3xl" />
        ) : status === "error" || loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {loadError ?? profileError ?? "Unable to load the provider dashboard."}
          </div>
        ) : !organizationId ? (
          <div className="rounded-3xl border border-dashed border-[#D9C8B0] bg-white/70 px-6 py-12 text-center">
            <p className="font-display text-xl font-bold text-[#12303A]">No provider organization is selected.</p>
            <p className="mt-2 text-sm text-[#5A6A6F]">Join as a provider to list services and receive matched RFQs.</p>
            <Link href={routes.join} className={cn(CORAL_BTN, "mt-6")}>
              Join as a provider
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex gap-1 overflow-x-auto border-b border-[#EADFCF] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tabs.map((tab) => {
                const active = panel === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPanel(tab.id)}
                    className={cn(
                      "relative whitespace-nowrap px-4 pb-3 pt-1 text-sm font-semibold transition",
                      active ? "text-[#0F4C5C]" : "text-[#5A6A6F] hover:text-[#0F4C5C]",
                    )}
                  >
                    {tab.label}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-x-3 bottom-0 h-0.5 origin-center rounded-full bg-gradient-to-r from-[#1B7F8C] to-[#E36F47] transition-transform duration-300",
                        active ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                  </button>
                );
              })}
            </div>

            {panel === "services" && organizationId ? (
              <ProviderServicesPanel
                organizationId={organizationId}
                profile={profile}
                onCreateProfile={() => setPanel("overview")}
                onChanged={async () => {
                  const saved = await providersService.getProfile(organizationId);
                  setProfile(saved);
                  setMissingProfile(false);
                }}
              />
            ) : null}

            {panel === "rfqs" ? (
              <Panel>
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => {
                    const count = filter === "ALL" ? rfqs.length : rfqs.filter((rfq) => rfqGroup(rfq) === filter).length;
                    const selected = rfqFilter === filter;
                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setRfqFilter(filter)}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                          selected
                            ? "border-[#E36F47] bg-[#E36F47] text-[#0B2530]"
                            : "border-[#EADFCF] bg-[#F4EBDD]/50 text-[#3E5258] hover:border-[#7CC0C8]",
                        )}
                      >
                        {filter === "ALL" ? "All" : groupLabel(filter)} ({count})
                      </button>
                    );
                  })}
                </div>
                {visibleRfqs.length === 0 ? (
                  <p className="mt-6 text-sm text-[#5A6A6F]">No RFQs in this filter.</p>
                ) : (
                  <ul className="mt-4 divide-y divide-[#EADFCF]">
                    {visibleRfqs.map((rfq) => {
                      const group = rfqGroup(rfq);
                      return (
                        <li key={rfq.id}>
                          <Link
                            href={routes.providerRfq(rfq.id)}
                            className="group flex flex-wrap items-center justify-between gap-4 py-4 transition hover:bg-[#F4EBDD]/40"
                          >
                            <span>
                              <span className="block font-medium text-[#12303A] transition group-hover:text-[#0F4C5C]">
                                {rfq.title}
                              </span>
                              <span className="mt-1 block text-sm text-[#5A6A6F]">
                                {rfq.service.name} · {rfq.location}
                                {rfq.quote ? ` · ${formatMoney(rfq.quote.amount, rfq.quote.currency)}` : ""}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <Badge
                                tone={group === "AWARDED" ? "success" : group === "PENDING" ? "warning" : "neutral"}
                              >
                                {groupLabel(group)}
                              </Badge>
                              <ArrowRight
                                className="h-4 w-4 text-[#0F4C5C] opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                                aria-hidden
                              />
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            ) : null}

            {panel === "overview" ? (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <StatCard
                    title="Incoming RFQs"
                    value={String(rfqs.length)}
                    hint={`${rfqs.length - quoted.length} waiting for a quote`}
                  />
                  <StatCard title="Quotes sent" value={String(quoted.length)} hint="Responses from this organization" />
                  <StatCard
                    title="Services"
                    value={String(services)}
                    hint={`${standards} standards · ${locations} locations`}
                  />
                  <StatCard
                    title="Profile"
                    value={profile ? formatProviderTypes(profile.providerTypes) : "Not created"}
                    hint={profile ? profileVerificationLabels[profile.verificationStatus] : "Add the fields below"}
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <Panel>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E36F47]">Profile fields</p>
                        <h2 className="mt-1 font-display text-lg font-semibold text-[#12303A]">
                          {activeOrganization?.displayName}
                        </h2>
                      </div>
                      {profile ? (
                        <Badge tone={profileVerificationTones[profile.verificationStatus]}>
                          {profileVerificationLabels[profile.verificationStatus]}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-6">
                      <ProviderBasicForm
                        key={profile?.updatedAt ?? "new"}
                        profile={profile}
                        submitLabel={missingProfile ? "Create profile" : "Save profile"}
                        onSubmit={async (input) => {
                          const saved = missingProfile
                            ? await providersService.createProfile(organizationId, input)
                            : await providersService.updateProfile(organizationId, input);
                          setProfile(saved);
                          setMissingProfile(false);
                        }}
                      />
                    </div>
                  </Panel>

                  <Panel>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E36F47]">Coverage</p>
                    <ul className="mt-5 space-y-4 text-sm">
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E8F4F5] text-[#0F4C5C]">
                          <Tags className="h-4 w-4" aria-hidden />
                        </span>
                        <span>
                          <span className="block font-medium text-[#12303A]">{services} services</span>
                          <span className="text-[#5A6A6F]">
                            {profile?.capabilities.services.map((item) => item.name).slice(0, 3).join(", ") ||
                              "None listed yet"}
                          </span>
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E8F4F5] text-[#0F4C5C]">
                          <ShieldCheck className="h-4 w-4" aria-hidden />
                        </span>
                        <span>
                          <span className="block font-medium text-[#12303A]">{standards} standards</span>
                          <span className="text-[#5A6A6F]">
                            {profile?.capabilities.standards.map((item) => item.code).slice(0, 3).join(", ") ||
                              "None listed yet"}
                          </span>
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E8F4F5] text-[#0F4C5C]">
                          <MapPin className="h-4 w-4" aria-hidden />
                        </span>
                        <span>
                          <span className="block font-medium text-[#12303A]">{locations} locations</span>
                          <span className="text-[#5A6A6F]">
                            {profile?.capabilities.locations.map((item) => item.label).slice(0, 3).join(", ") ||
                              "None listed yet"}
                          </span>
                        </span>
                      </li>
                    </ul>
                    <button type="button" className={cn(GHOST_BTN, "mt-6")} onClick={() => setPanel("services")}>
                      Post a service
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </button>
                  </Panel>
                </div>

                <Panel>
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#E36F47]">
                      <ClipboardList className="h-4 w-4" aria-hidden />
                      Incoming RFQs
                    </p>
                    <button
                      type="button"
                      onClick={() => setPanel("rfqs")}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[#0F4C5C] transition hover:text-[#E36F47]"
                    >
                      All RFQs
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                  {rfqs.length === 0 ? (
                    <p className="mt-6 text-sm text-[#5A6A6F]">No requests are waiting. Matching RFQs will show up here.</p>
                  ) : (
                    <ul className="mt-4 divide-y divide-[#EADFCF]">
                      {rfqs.slice(0, 5).map((rfq) => (
                        <li key={rfq.id}>
                          <Link
                            href={routes.providerRfq(rfq.id)}
                            className="group flex items-center justify-between gap-4 py-4 transition hover:bg-[#F4EBDD]/40"
                          >
                            <span>
                              <span className="block font-medium text-[#12303A] transition group-hover:text-[#0F4C5C]">
                                {rfq.title}
                              </span>
                              <span className="mt-1 block text-sm text-[#5A6A6F]">
                                {rfq.service.name} · {rfq.location}
                              </span>
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-2">
                              <span className="rounded-full bg-[#E8F4F5] px-2.5 py-1 text-xs font-semibold text-[#0F4C5C]">
                                {rfq.quote ? "Quoted" : "Needs a quote"}
                              </span>
                              <ArrowRight
                                className="h-4 w-4 text-[#0F4C5C] opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                                aria-hidden
                              />
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </>
            ) : null}
          </div>
        )}
      </Container>
    </div>
  );
}
