"use client";

import { useCallback, useEffect, useState } from "react";

import { RequireAuth } from "@/components/auth/require-auth";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type AdminProvider = {
  id: string;
  organizationName: string;
  legalName: string;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  publicProfile: boolean;
  serviceCount: number;
  headline: string | null;
  providerTypes: string[];
};

function VerificationPanel() {
  const [filter, setFilter] = useState<"PENDING" | "VERIFIED" | "REJECTED" | "">("PENDING");
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    const query = filter ? `?verificationStatus=${filter}` : "";
    api
      .get<{ providers: AdminProvider[] }>(`/admin/providers${query}`)
      .then((data) => {
        setProviders(data.providers);
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
      <h1 className="font-display text-3xl font-bold text-slate-900">Provider verification</h1>
      <p className="mt-2 text-sm text-slate-600">Approve or reject provider profiles for marketplace trust signals.</p>

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

      <ul className="mt-6 space-y-3">
        {providers.map((provider) => (
          <li key={provider.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">{provider.organizationName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {provider.legalName} · {provider.verificationStatus}
                  {provider.publicProfile ? " · Public" : " · Private"} · {provider.serviceCount} services
                </p>
                {provider.headline ? <p className="mt-2 text-sm text-slate-700">{provider.headline}</p> : null}
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
