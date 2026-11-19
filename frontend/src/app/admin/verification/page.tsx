"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { RequireAuth } from "@/components/auth/require-auth";
import { Button } from "@/components/ui/button";
import { EmailChangeRequestsCard } from "@/features/admin/components/email-change-requests-card";
import { api } from "@/lib/api";
import { routes } from "@/lib/constants";

type AdminProvider = {
  id: string;
  organizationId: string;
  organizationName: string;
  legalName: string;
  organizationStatus: string;
  organizationDescription: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  publicProfile: boolean;
  serviceCount: number;
  headline: string | null;
  description: string | null;
  providerTypes: string[];
  services: Array<{ id: string; name: string; slug: string }>;
  createdAt: string;
  verifiedAt: string | null;
};

function VerificationPanel() {
  const [filter, setFilter] = useState<"PENDING" | "VERIFIED" | "REJECTED" | "">("PENDING");
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    const query = filter ? `?verificationStatus=${filter}` : "";
    api
      .get<{ providers: AdminProvider[]; pendingCount?: number }>(`/admin/providers${query}`)
      .then((data) => {
        setProviders(data.providers);
        setPendingCount(data.pendingCount ?? 0);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load providers");
      });
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: "verify" | "reject") => {
    setBusy(`${action}-${id}`);
    try {
      await api.post(`/admin/providers/${id}/${action}`, {});
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Super admin</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-900">Provider verification</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Complete pending onboarding reviews. Until a provider is verified, their company and services stay hidden from
            buyers on the marketplace.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">{pendingCount} pending</p>
          <p className="text-amber-900/80">Awaiting verification</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["PENDING", "VERIFIED", "REJECTED", ""] as const).map((value) => (
          <button
            key={value || "ALL"}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === value ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {value || "All"}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <ul className="mt-6 space-y-4">
        {providers.map((provider) => (
          <li key={provider.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{provider.organizationName}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      provider.verificationStatus === "VERIFIED"
                        ? "bg-emerald-50 text-emerald-800"
                        : provider.verificationStatus === "REJECTED"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {provider.verificationStatus}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {provider.legalName} · Org {provider.organizationStatus}
                  {provider.publicProfile ? " · Public opted-in" : " · Private"} · {provider.serviceCount} services
                </p>
                {provider.headline ? <p className="mt-2 text-sm font-medium text-slate-800">{provider.headline}</p> : null}
                {provider.description ? <p className="mt-1 text-sm text-slate-600">{provider.description}</p> : null}
                {provider.organizationDescription ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-500">{provider.organizationDescription}</p>
                ) : null}
                {provider.services.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Services submitted</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {provider.services.map((service) => (
                        <li key={service.id}>
                          <Link
                            href={routes.service(service.slug)}
                            className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-sky-300 hover:text-sky-800"
                          >
                            {service.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No services selected yet.</p>
                )}
              </div>
              <div className="flex gap-2">
                {provider.verificationStatus !== "VERIFIED" ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy === `verify-${provider.id}`}
                    onClick={() => void act(provider.id, "verify")}
                  >
                    Verify
                  </Button>
                ) : null}
                {provider.verificationStatus !== "REJECTED" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy === `reject-${provider.id}`}
                    onClick={() => void act(provider.id, "reject")}
                  >
                    Reject
                  </Button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {providers.length === 0 ? <p className="mt-8 text-sm text-slate-500">No providers in this filter.</p> : null}

      <div className="mt-12">
        <EmailChangeRequestsCard title="Email change requests" />
      </div>
    </div>
  );
}

export default function AdminVerificationPage() {
  return (
    <RequireAuth>
      <VerificationPanel />
    </RequireAuth>
  );
}
