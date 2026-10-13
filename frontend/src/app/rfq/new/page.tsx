"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getStoredSession } from "@/lib/auth";
import { routes } from "@/lib/constants";
import type { BuyerRfq, MarketplaceService } from "@/features/marketplace/types";

function NewRfqForm() {
  const router = useRouter();
  const params = useSearchParams();
  const preset = params.get("service") ?? "";
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [siteCount, setSiteCount] = useState("1");
  const [employeeCount, setEmployeeCount] = useState("");
  const [timeline, setTimeline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getStoredSession()));
  }, []);

  useEffect(() => {
    api
      .get<{ services: MarketplaceService[] }>("/marketplace/services")
      .then((data) => {
        setServices(data.services);
        const match = data.services.find((service) => service.slug === preset);
        if (match) {
          setServiceId(match.id);
          setTitle(match.name);
        }
      })
      .catch(() => setError("Could not load the service catalogue."));
  }, [preset]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const rfq = await api.post<BuyerRfq>("/rfqs", {
        serviceId,
        title,
        description,
        location,
        siteCount: Number(siteCount),
        employeeCount: Number(employeeCount),
        timeline: timeline.trim() || undefined,
      });
      router.push(routes.rfq(rfq.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the RFQ");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Create an RFQ</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Related providers will see the service, location, number of sites and employee count. Your company name,
        email and personal details stay masked.
      </p>
      {!signedIn ? (
        <p className="mt-6 rounded-xl border border-border bg-card p-4 text-sm">
          Sign in with a buyer organization to send this RFQ.{" "}
          <Link href={routes.login} className="text-primary">
            Sign in
          </Link>
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label="Service" htmlFor="service">
          <Select id="service" required value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
            <option value="">Select a service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Title" htmlFor="title">
          <Input id="title" required value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label="What do you need?" htmlFor="description" hint="Do not include your company name, email or phone.">
          <Textarea id="description" required minLength={10} value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <Field label="Location" htmlFor="location" hint="City or state the work is in. This is visible to providers.">
          <Input id="location" required value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Mumbai, Maharashtra" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Number of sites" htmlFor="sites">
            <Input id="sites" required type="number" min={1} value={siteCount} onChange={(event) => setSiteCount(event.target.value)} />
          </Field>
          <Field label="Number of employees" htmlFor="employees">
            <Input id="employees" required type="number" min={1} value={employeeCount} onChange={(event) => setEmployeeCount(event.target.value)} />
          </Field>
        </div>
        <Field label="Timeline" htmlFor="timeline">
          <Input id="timeline" value={timeline} onChange={(event) => setTimeline(event.target.value)} placeholder="Needed within 6 weeks" />
        </Field>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button type="submit" variant="cta" disabled={pending || !signedIn}>
          {pending ? "Matching providers…" : "Send RFQ"}
        </Button>
      </form>
    </div>
  );
}

export default function NewRfqPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-12 text-sm text-muted-foreground">Loading…</div>}>
      <NewRfqForm />
    </Suspense>
  );
}
