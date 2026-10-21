"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, MapPin, ShieldCheck, Tags } from "lucide-react";

import { Container } from "@/components/common/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { ProviderBasicForm } from "@/features/providers/components/provider-basic-form";
import { providersService } from "@/features/providers/services/providers.service";
import type { ProviderProfile } from "@/features/providers/types";
import { profileVerificationLabels, profileVerificationTones, providerTypeLabels } from "@/features/providers/utils/labels";
import { formatMoney, type ProviderRfq } from "@/features/marketplace/types";
import { ApiError, api } from "@/lib/api";
import { clearSession, isAuthenticated } from "@/lib/auth";
import { routes } from "@/lib/constants";

type RfqGroup = "PENDING" | "ACCEPTED" | string;

function rfqGroup(rfq: ProviderRfq): RfqGroup {
  if (rfq.quote) return "ACCEPTED";
  if (!rfq.status || rfq.status === "OPEN") return "PENDING";
  return rfq.status;
}

function groupLabel(group: RfqGroup) {
  if (group === "PENDING") return "Pending";
  if (group === "ACCEPTED") return "Accepted";
  return group
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

export default function ProviderDashboardPage() {
  const router = useRouter();
  const { me, status, error: profileError, activeOrganization } = useOrganizations();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [missingProfile, setMissingProfile] = useState(false);
  const [rfqs, setRfqs] = useState<ProviderRfq[]>([]);
  const [panel, setPanel] = useState<"overview" | "rfqs">("overview");
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
  const otherGroups = [...new Set(rfqs.map(rfqGroup).filter((group) => group !== "PENDING" && group !== "ACCEPTED"))];
  const filters: Array<RfqGroup | "ALL"> = ["ALL", "PENDING", "ACCEPTED", ...(otherGroups.length ? otherGroups : ["CLOSED"])];
  const visibleRfqs = rfqFilter === "ALL" ? rfqs : rfqs.filter((rfq) => rfqGroup(rfq) === rfqFilter);
  const services = profile?.capabilities.services.length ?? 0;
  const standards = profile?.capabilities.standards.length ?? 0;
  const locations = profile?.capabilities.locations.length ?? 0;

  return (
    <Container className="py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Provider workspace</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {me ? `Welcome back, ${me.user.firstName}` : "Provider dashboard"}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            {activeOrganization
              ? `Keep ${activeOrganization.displayName} ready for incoming requests.`
              : "Create a provider organization to start receiving RFQs."}
          </p>
        </div>
        <Button
          variant="secondary"
          type="button"
          onClick={() => {
            clearSession();
            window.location.href = routes.login;
          }}
        >
          Log out
        </Button>
      </div>

      {status === "loading" || (organizationId && !ready && !loadError) ? (
        <div className="mt-8 h-56 animate-pulse rounded-3xl bg-slate-200" />
      ) : status === "error" || loadError ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {loadError ?? profileError ?? "Unable to load the provider dashboard."}
        </div>
      ) : !organizationId ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-white p-8">
          <p className="font-medium text-slate-900">No provider organization is selected.</p>
          <Button asChild className="mt-4">
            <Link href={routes.join}>Join as a provider</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <div className="flex gap-6 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setPanel("overview")}
              className={`border-b-2 px-1 pb-3 text-sm font-medium ${panel === "overview" ? "border-sky-700 text-sky-800" : "border-transparent text-slate-600 hover:text-sky-700"}`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setPanel("rfqs")}
              className={`border-b-2 px-1 pb-3 text-sm font-medium ${panel === "rfqs" ? "border-sky-700 text-sky-800" : "border-transparent text-slate-600 hover:text-sky-700"}`}
            >
              All RFQ&apos;s
            </button>
          </div>

          {panel === "rfqs" ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => {
                  const count = filter === "ALL" ? rfqs.length : rfqs.filter((rfq) => rfqGroup(rfq) === filter).length;
                  const selected = rfqFilter === filter;
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setRfqFilter(filter)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium ${selected ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                    >
                      {filter === "ALL" ? "All" : groupLabel(filter)} ({count})
                    </button>
                  );
                })}
              </div>
              {visibleRfqs.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">No RFQs in this filter.</p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {visibleRfqs.map((rfq) => {
                    const group = rfqGroup(rfq);
                    return (
                      <li key={rfq.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                        <span>
                          <span className="block font-medium text-slate-900">{rfq.title}</span>
                          <span className="mt-1 block text-sm text-slate-500">
                            {rfq.service.name} · {rfq.location}
                            {rfq.quote ? ` · ${formatMoney(rfq.quote.amount, rfq.quote.currency)}` : ""}
                          </span>
                        </span>
                        <Badge tone={group === "ACCEPTED" ? "success" : group === "PENDING" ? "warning" : "neutral"}>
                          {groupLabel(group)}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}

          {panel === "overview" ? (
          <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard title="Incoming RFQs" value={String(rfqs.length)} hint={`${rfqs.length - quoted.length} waiting for a quote`} />
            <StatCard title="Quotes sent" value={String(quoted.length)} hint="Responses from this organization" />
            <StatCard title="Services" value={String(services)} hint={`${standards} standards · ${locations} locations`} />
            <StatCard
              title="Profile"
              value={profile ? providerTypeLabels[profile.providerType] : "Not created"}
              hint={profile ? profileVerificationLabels[profile.verificationStatus] : "Add the fields below"}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Profile fields</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">{activeOrganization?.displayName}</h2>
                </div>
                {profile ? <Badge tone={profileVerificationTones[profile.verificationStatus]}>{profileVerificationLabels[profile.verificationStatus]}</Badge> : null}
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
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Coverage</p>
              <ul className="mt-5 space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <Tags className="mt-0.5 h-4 w-4 text-sky-700" />
                  <span>
                    <span className="block font-medium text-slate-900">{services} services</span>
                    <span className="text-slate-500">{profile?.capabilities.services.map((item) => item.name).slice(0, 3).join(", ") || "None listed yet"}</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-sky-700" />
                  <span>
                    <span className="block font-medium text-slate-900">{standards} standards</span>
                    <span className="text-slate-500">{profile?.capabilities.standards.map((item) => item.code).slice(0, 3).join(", ") || "None listed yet"}</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-sky-700" />
                  <span>
                    <span className="block font-medium text-slate-900">{locations} locations</span>
                    <span className="text-slate-500">{profile?.capabilities.locations.map((item) => item.label).slice(0, 3).join(", ") || "None listed yet"}</span>
                  </span>
                </li>
              </ul>
              <Button asChild variant="secondary" className="mt-6">
                <Link href={routes.providerProfile}>Edit services and locations</Link>
              </Button>
            </section>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                <ClipboardList className="h-4 w-4" /> Incoming RFQs
              </p>
              <button type="button" onClick={() => setPanel("rfqs")} className="text-sm font-medium text-sky-700">
                All RFQ&apos;s
              </button>
            </div>
            {rfqs.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">No requests are waiting. Matching RFQs will show up here.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {rfqs.slice(0, 5).map((rfq) => (
                  <li key={rfq.id} className="flex items-center justify-between gap-4 py-4">
                    <span>
                      <span className="block font-medium text-slate-900">{rfq.title}</span>
                      <span className="mt-1 block text-sm text-slate-500">
                        {rfq.service.name} · {rfq.location}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm text-slate-500">{rfq.quote ? "Quoted" : "Needs a quote"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          </>
          ) : null}
        </div>
      )}
    </Container>
  );
}
