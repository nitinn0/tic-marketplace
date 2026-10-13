"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api } from "@/lib/api";
import { routes } from "@/lib/constants";
import type { BuyerRfq } from "@/features/marketplace/types";

export default function RfqListPage() {
  const [rfqs, setRfqs] = useState<BuyerRfq[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ rfqs: BuyerRfq[] }>("/rfqs")
      .then((data) => setRfqs(data.rfqs))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load RFQs"));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex items-end justify-between">
        <h1 className="font-display text-3xl font-bold">Your RFQs</h1>
        <Link href={routes.rfqNew} className="text-sm text-primary">
          New RFQ
        </Link>
      </div>
      {error ? <p className="mt-6 text-sm text-red-700">{error}</p> : null}
      <ul className="mt-6 space-y-3">
        {rfqs.map((rfq) => (
          <li key={rfq.id}>
            <Link href={routes.rfq(rfq.id)} className="block rounded-xl border border-border bg-card p-5 hover:border-primary/40">
              <p className="font-semibold">{rfq.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {rfq.service.name} · {rfq.quotes.length} quotes · {rfq.matches.length} providers matched
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {!error && rfqs.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">No RFQs yet.</p> : null}
    </div>
  );
}
