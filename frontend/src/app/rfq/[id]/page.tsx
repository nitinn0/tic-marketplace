"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { api } from "@/lib/api";
import { routes } from "@/lib/constants";
import { formatMoney, type BuyerRfq } from "@/features/marketplace/types";

export default function RfqDetailPage() {
  const params = useParams<{ id: string }>();
  const [rfq, setRfq] = useState<BuyerRfq | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api
        .get<BuyerRfq>(`/rfqs/${params.id}`)
        .then((data) => {
          if (!cancelled) setRfq(data);
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "RFQ not found");
        });
    };
    load();
    const timer = window.setInterval(load, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [params.id]);

  if (error) return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-red-700">{error}</div>;
  if (!rfq) return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">Loading RFQ…</div>;

  const lowest = rfq.quotes[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href={routes.rfqs} className="text-sm text-primary">
        All RFQs
      </Link>
      <h1 className="mt-3 font-display text-3xl font-bold">{rfq.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{rfq.service.name}</p>
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
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold">{quote.providerName}</p>
              <p className="font-display text-lg font-bold">
                {formatMoney(quote.amount, quote.currency)}
                {lowest && quote.id === lowest.id ? (
                  <span className="ml-2 text-xs font-medium text-success">Lowest</span>
                ) : null}
              </p>
            </div>
            <p className="mt-2 text-sm">{quote.scopeNotes}</p>
            {quote.exclusions ? <p className="mt-2 text-sm text-muted-foreground">Exclusions: {quote.exclusions}</p> : null}
            {quote.timelineDays ? <p className="mt-2 text-xs text-muted-foreground">{quote.timelineDays} days</p> : null}
          </li>
        ))}
      </ul>
      {rfq.quotes.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Waiting for quotes. This page refreshes every few seconds.</p>
      ) : null}
    </div>
  );
}
