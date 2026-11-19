"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, ShieldAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { routes } from "@/lib/constants";

type AdminProvider = {
  id: string;
  organizationName: string;
  legalName: string;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  headline: string | null;
  serviceCount: number;
  services: Array<{ id: string; name: string; slug: string }>;
  createdAt: string;
};

function formatWhen(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
}

export function ProviderVerificationCard({
  title = "Provider verifications",
}: {
  title?: string;
}) {
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<{ providers: AdminProvider[]; pendingCount?: number }>("/admin/providers?verificationStatus=PENDING")
      .then((data) => {
        setProviders(data.providers);
        setPendingCount(data.pendingCount ?? data.providers.length);
        setError(null);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Unable to load pending providers";
        if (/Cannot GET|Not Found|404/i.test(message)) {
          setProviders([]);
          setPendingCount(0);
          setError(
            "Provider verification API is unreachable. Use the TIC backend on port 4011 (NEXT_PUBLIC_API_URL=http://localhost:4011/api/v1), then refresh.",
          );
          return;
        }
        setError(message);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: "verify" | "reject") => {
    setBusy(`${action}-${id}`);
    setError(null);
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
    <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <ShieldAlert className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800/80">Platform</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {pendingCount === 0
                ? "No providers waiting for review. Unverified companies and their services stay hidden from buyers."
                : `${pendingCount} provider${pendingCount === 1 ? "" : "s"} submitted for verification. They stay hidden from buyers until approved.`}
            </p>
          </div>
        </div>
        <Link
          href={routes.adminVerification}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0F4C5C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0B3B47]"
        >
          Open verification queue
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {providers.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {providers.slice(0, 4).map((provider) => (
            <li key={provider.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{provider.organizationName}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {provider.legalName} · {provider.serviceCount} service{provider.serviceCount === 1 ? "" : "s"} · Submitted{" "}
                    {formatWhen(provider.createdAt)}
                  </p>
                  {provider.headline ? <p className="mt-2 text-sm text-slate-700">{provider.headline}</p> : null}
                  {provider.services.length > 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      {provider.services
                        .slice(0, 4)
                        .map((service) => service.name)
                        .join(" · ")}
                      {provider.services.length > 4 ? ` · +${provider.services.length - 4} more` : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy === `verify-${provider.id}`}
                    onClick={() => void act(provider.id, "verify")}
                  >
                    {busy === `verify-${provider.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Verify
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy === `reject-${provider.id}`}
                    onClick={() => void act(provider.id, "reject")}
                  >
                    {busy === `reject-${provider.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    Reject
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {providers.length > 4 ? (
        <p className="mt-4 text-sm text-slate-500">
          And {providers.length - 4} more pending.{" "}
          <Link href={routes.adminVerification} className="font-semibold text-[#0F4C5C] hover:underline">
            Review all
          </Link>
        </p>
      ) : null}
    </section>
  );
}
