"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { routes } from "@/lib/constants";

import { providersService } from "../services/providers.service";
import type { ProviderCatalog, ProviderProfile } from "../types";

export function ProviderServicesPanel({
  organizationId,
  profile,
  onChanged,
}: {
  organizationId: string;
  profile: ProviderProfile | null;
  onChanged: () => Promise<void>;
}) {
  const [catalog, setCatalog] = useState<ProviderCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    providersService
      .catalog(organizationId)
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setCatalogError(err instanceof Error ? err.message : "Unable to load categories");
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const posted = profile?.capabilities.services ?? [];

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!profile) {
      setError("Create your provider profile on Overview before posting a service.");
      return;
    }
    setSubmitting(true);
    try {
      await providersService.publishService(organizationId, {
        categoryId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
      setNotice("Service posted. Buyers can see it with your organization name.");
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to post the service");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (serviceId: string, serviceName: string) => {
    setError(null);
    setNotice(null);
    try {
      await providersService.removeService(organizationId, serviceId);
      setNotice(`${serviceName} was removed from your profile.`);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove the service");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Post a service</h2>
        <p className="mt-1 text-sm text-slate-500">
          Buyers see this listing with your organization as the provider who posted it.
        </p>
        <form className="mt-6 space-y-4" onSubmit={(event) => void onSubmit(event)}>
          <Field label="Category" htmlFor="service-category">
            <Select
              id="service-category"
              required
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={!catalog}
            >
              <option value="">Select a category</option>
              {(catalog?.categories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {"\u00a0\u00a0".repeat(category.depth)}
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Service name" htmlFor="service-name">
            <Input id="service-name" required minLength={2} maxLength={160} value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Description" htmlFor="service-description" hint="Shown on the public service page.">
            <Textarea id="service-description" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          {catalogError ? <p className="text-sm text-red-700">{catalogError}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
          <Button type="submit" disabled={submitting || !profile}>
            {submitting ? "Posting…" : "Post service"}
          </Button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Your services</h2>
        <p className="mt-1 text-sm text-slate-500">{profile?.organization.displayName ?? "This organization"} is listed on these services.</p>
        {posted.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No services posted yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {posted.map((service) => (
              <li key={service.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <span>
                  <Link href={routes.service(service.slug)} className="font-medium text-slate-900 hover:text-sky-700">
                    {service.name}
                  </Link>
                  <span className="mt-1 block text-sm text-slate-500">{service.categoryPath.join(" / ") || "Uncategorized"}</span>
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => void remove(service.id, service.name)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
