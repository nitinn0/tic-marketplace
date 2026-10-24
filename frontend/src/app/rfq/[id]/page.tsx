"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { routes } from "@/lib/constants";
import { formatMoney, type BuyerRfq } from "@/features/marketplace/types";

export default function RfqDetailPage() {
  const params = useParams<{ id: string }>();
  const [rfq, setRfq] = useState<BuyerRfq | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<BuyerRfq>(`/rfqs/${params.id}`)
      .then((data) => {
        setRfq(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "RFQ not found");
      });
  }, [params.id]);

  useEffect(() => {
    let cancelled = false;
    load();
    const timer = window.setInterval(() => {
      if (!cancelled) load();
    }, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [load]);

  const accept = async (quoteId: string) => {
    setBusy(quoteId);
    setActionError(null);
    try {
      const updated = await api.post<BuyerRfq>(`/rfqs/${params.id}/quotes/${quoteId}/accept`, {});
      setRfq(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to accept quote");
    } finally {
      setBusy(null);
    }
  };

  const closeRfq = async () => {
    setBusy("close");
    setActionError(null);
    try {
      const updated = await api.post<BuyerRfq>(`/rfqs/${params.id}/close`, {});
      setRfq(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to close RFQ");
    } finally {
      setBusy(null);
    }
  };

  if (error) return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-red-700">{error}</div>;
  if (!rfq) return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">Loading RFQ…</div>;

  const open = rfq.status === "OPEN";
  const submitted = rfq.quotes.filter((quote) => quote.status === "SUBMITTED");
  const lowest = submitted[0] ?? rfq.quotes.find((quote) => quote.status === "ACCEPTED");
  const awarded = rfq.quotes.find((quote) => quote.status === "ACCEPTED");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href={routes.rfqs} className="text-sm text-primary">
        All RFQs
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{rfq.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {rfq.service.name} · {rfq.status === "CLOSED" ? "Closed" : "Open"}
          </p>
        </div>
        {open ? (
          <Button type="button" variant="outline" disabled={busy === "close"} onClick={() => void closeRfq()}>
            {busy === "close" ? "Closing…" : "Close RFQ"}
          </Button>
        ) : null}
      </div>
      <dl className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-5 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Location</dt>
          <dd className="font-medium">{rfq.location}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Sites</dt>
          <dd className="font-medium">{rfq.siteCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Employees</dt>
          <dd className="font-medium">{rfq.employeeCount}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm leading-6">{rfq.description}</p>

      {actionError ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p> : null}

      <h2 className="mt-10 font-display text-xl font-bold">Matched providers</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Ranked by service fit, verification, location and years in business. They cannot see your company or contact details.
      </p>
      <ul className="mt-4 space-y-2">
        {rfq.matches.map((match) => (
          <li key={match.providerId} className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
            <span className="font-medium">{match.name}</span>
            <span className="text-muted-foreground"> · score {match.score}</span>
            <p className="mt-1 text-xs text-muted-foreground">{match.reasons.join(" · ")}</p>
          </li>
        ))}
      </ul>
      {rfq.matches.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No public provider matches this service yet.</p>
      ) : null}

      <h2 className="mt-10 font-display text-xl font-bold">Quotes from providers</h2>
      <ul className="mt-4 space-y-3">
        {rfq.quotes.map((quote) => (
          <li key={quote.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="font-semibold">
                {quote.providerName}
                <span className="ml-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{quote.status}</span>
              </p>
              <p className="font-display text-lg font-bold">
                {formatMoney(quote.amount, quote.currency)}
                {lowest && quote.id === lowest.id && quote.status === "SUBMITTED" ? (
                  <span className="ml-2 text-xs font-medium text-success">Lowest</span>
                ) : null}
                {quote.status === "ACCEPTED" ? (
                  <span className="ml-2 text-xs font-medium text-success">Awarded</span>
                ) : null}
              </p>
            </div>
            <p className="mt-2 text-sm">{quote.scopeNotes}</p>
            {quote.exclusions ? <p className="mt-2 text-sm text-muted-foreground">Exclusions: {quote.exclusions}</p> : null}
            {quote.timelineDays ? <p className="mt-2 text-xs text-muted-foreground">{quote.timelineDays} days</p> : null}
            {open && quote.status === "SUBMITTED" ? (
              <Button
                type="button"
                className="mt-4"
                disabled={busy === quote.id}
                onClick={() => void accept(quote.id)}
              >
                {busy === quote.id ? "Accepting…" : "Accept quote"}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {rfq.quotes.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Waiting for quotes. This page refreshes every few seconds.</p>
      ) : null}

      {awarded ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold text-slate-900">Payment</h3>
            <p className="mt-2 text-sm text-slate-600">Checkout after award is coming soon. No charge is collected yet.</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() =>
                void api.post(`/rfqs/${rfq.id}/payments/intent`, {}).catch((err: unknown) => {
                  setActionError(err instanceof Error ? err.message : "Payments are not available yet");
                })
              }
            >
              Start payment
            </Button>
          </div>
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold text-slate-900">Messages</h3>
            <p className="mt-2 text-sm text-slate-600">Buyer–provider messaging will open here after award.</p>
            <Button type="button" variant="outline" className="mt-4" disabled>
              Messages coming soon
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
