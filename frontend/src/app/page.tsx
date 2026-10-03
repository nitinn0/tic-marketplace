"use client";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/common/container";
import api from "@/lib/api";
import { useEffect, useState } from "react";
import type { HealthStatus } from "@/types";

export default function Home() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const response = await api.get<HealthStatus>("/health");
        setHealth(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to reach API");
      }
    };

    void loadHealth();
  }, []);

  return (
    <Container className="py-16 sm:py-20">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">
              B2B Marketplace Foundation
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Trusted TIC service connections for modern businesses.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              Explore a clean and professional foundation for testing, inspection,
              certification, sustainability, ESG, and consulting services.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button type="button">Get started</Button>
              <Button variant="secondary" type="button">
                Explore services
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              Core flow
            </p>
            <div className="mt-5 space-y-3">
              {[
                "Buyer requirement",
                "Provider discovery",
                "RFQ",
                "Quotations",
                "Selection",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <span className="text-sm font-medium text-slate-700">{item}</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                API status
              </p>
              {error ? (
                <p className="mt-2 text-sm text-red-700">{error}</p>
              ) : health ? (
                <p className="mt-2 text-sm font-medium text-sky-900">
                  {health.status} · {health.service}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Checking backend connection...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
