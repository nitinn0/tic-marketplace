"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatMoney, type ProviderRfq } from "@/features/marketplace/types";

export default function ProviderRfqsPage() {
  const [rfqs, setRfqs] = useState<ProviderRfq[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [scopeNotes, setScopeNotes] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [timelineDays, setTimelineDays] = useState("");
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    return api
      .get<{ rfqs: ProviderRfq[] }>("/provider/rfqs")
      .then((data) => setRfqs(data.rfqs))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load RFQs"));
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!activeId) return;
    setPending(true);
    setError(null);
    try {
      await api.post(`/provider/rfqs/${activeId}/quotes`, {
        amount: Number(amount),
        scopeNotes,
        exclusions: exclusions.trim() || undefined,
        timelineDays: timelineDays ? Number(timelineDays) : undefined,
      });
      setActiveId(null);
      setAmount("");
      setScopeNotes("");
      setExclusions("");
      setTimelineDays("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the quote");
    } finally {
      setPending(false);
    }
  }

  async function withdraw(rfqId: string) {
    setBusyId(rfqId);
    setError(null);
    try {
      await api.post(`/provider/rfqs/${rfqId}/quotes/withdraw`, {});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not withdraw quote");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Incoming RFQs</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Buyer company name, email and personal details are masked. You can see location, sites and employee count.
      </p>
      {error ? <p className="mt-6 text-sm text-red-700">{error}</p> : null}
      <ul className="mt-6 space-y-4">
        {rfqs.map((rfq) => {
          const open = rfq.status === "OPEN";
          const quoted = rfq.quote?.status === "SUBMITTED";
          const awarded = rfq.quote?.status === "ACCEPTED";
          const rejected = rfq.quote?.status === "REJECTED";
          const withdrawn = rfq.quote?.status === "WITHDRAWN";

          return (
            <li key={rfq.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{rfq.service.name}</p>
                  <h2 className="mt-1 font-semibold">{rfq.title}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-surface px-2 py-1 text-xs text-muted-foreground">
                    {open ? "Open" : "Closed"}
                  </span>
                  {awarded ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">Awarded</span>
                  ) : null}
                  {rejected ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">Not selected</span>
                  ) : null}
                  <span className="rounded-full bg-surface px-2 py-1 text-xs text-muted-foreground">Buyer hidden</span>
                </div>
              </div>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Location</dt>
                  <dd>{rfq.location}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Sites</dt>
                  <dd>{rfq.siteCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Employees</dt>
                  <dd>{rfq.employeeCount}</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-6">{rfq.description}</p>
              {rfq.timeline ? <p className="mt-2 text-xs text-muted-foreground">Timeline: {rfq.timeline}</p> : null}
              <p className="mt-2 text-xs text-muted-foreground">{rfq.matchReasons.join(" · ")}</p>
              {rfq.quote ? (
                <p className="mt-4 text-sm font-medium">
                  Your quote: {formatMoney(rfq.quote.amount, rfq.quote.currency)}
                  {quoted ? " · Submitted" : null}
                  {withdrawn ? " · Withdrawn" : null}
                </p>
              ) : null}

              {awarded ? (
                <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">You won this RFQ</p>
                  <p className="mt-1 text-sm text-slate-600">Buyer messaging and payment will open here in a later release.</p>
                  <Button type="button" variant="outline" className="mt-3" disabled>
                    Messages coming soon
                  </Button>
                </div>
              ) : null}

              {open && !awarded && !rejected ? (
                activeId === rfq.id ? (
                  <form onSubmit={onSubmit} className="mt-4 space-y-3 border-t border-border pt-4">
                    <Field label="Amount (INR)" htmlFor={`amount-${rfq.id}`}>
                      <Input
                        id={`amount-${rfq.id}`}
                        required
                        type="number"
                        min={1}
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                      />
                    </Field>
                    <Field label="Scope" htmlFor={`scope-${rfq.id}`}>
                      <Textarea
                        id={`scope-${rfq.id}`}
                        required
                        minLength={5}
                        value={scopeNotes}
                        onChange={(event) => setScopeNotes(event.target.value)}
                      />
                    </Field>
                    <Field label="Exclusions" htmlFor={`exclusions-${rfq.id}`}>
                      <Textarea
                        id={`exclusions-${rfq.id}`}
                        value={exclusions}
                        onChange={(event) => setExclusions(event.target.value)}
                      />
                    </Field>
                    <Field label="Timeline (days)" htmlFor={`days-${rfq.id}`}>
                      <Input
                        id={`days-${rfq.id}`}
                        type="number"
                        min={1}
                        value={timelineDays}
                        onChange={(event) => setTimelineDays(event.target.value)}
                      />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" disabled={pending}>
                        {pending ? "Sending…" : "Send quote"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setActiveId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => setActiveId(rfq.id)}>
                      {rfq.quote && !withdrawn ? "Update quote" : "Quote this RFQ"}
                    </Button>
                    {quoted ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyId === rfq.id}
                        onClick={() => void withdraw(rfq.id)}
                      >
                        {busyId === rfq.id ? "Withdrawing…" : "Withdraw quote"}
                      </Button>
                    ) : null}
                  </div>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
      {!error && rfqs.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No RFQs have been routed to this provider yet. Switch to the provider organization that offers the service.
        </p>
      ) : null}
    </div>
  );
}
