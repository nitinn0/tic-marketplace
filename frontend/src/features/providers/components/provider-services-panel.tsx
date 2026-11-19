"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { routes } from "@/lib/constants";

import { providersService } from "../services/providers.service";
import type { ProviderCatalog, ProviderProfile } from "../types";
import { ServiceCascadePicker, type CustomServiceDraft } from "./service-cascade-picker";

export function ProviderServicesPanel({
  organizationId,
  profile,
  onChanged,
  onCreateProfile,
}: {
  organizationId: string;
  profile: ProviderProfile | null;
  onChanged: () => Promise<void>;
  onCreateProfile?: () => void;
}) {
  const [catalog, setCatalog] = useState<ProviderCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [customServices, setCustomServices] = useState<CustomServiceDraft[]>([]);
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

  useEffect(() => {
    setSelectedServiceIds(profile?.capabilities.services.map((service) => service.id) ?? []);
    setCustomServices([]);
  }, [profile]);

  const posted = profile?.capabilities.services ?? [];

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!profile) {
      setError("Create your provider profile on Overview before selecting services.");
      return;
    }
    if (selectedServiceIds.length === 0 && customServices.length === 0) {
      setError("Select at least one catalogue service or add a new service.");
      return;
    }
    setSubmitting(true);
    try {
      await providersService.selectServices(organizationId, {
        serviceIds: selectedServiceIds,
        customServices: customServices.map(({ categoryId, name, description }) => ({
          categoryId,
          name,
          description,
        })),
      });
      setCustomServices([]);
      setNotice("Services updated on your profile.");
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save services");
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
        <h2 className="text-lg font-semibold text-slate-900">Select services</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose categories, then subcategories, then the services you offer. Add a new service if yours is missing from
          the catalogue.
        </p>
        {!profile ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Create your provider profile first</p>
            <p className="mt-1 text-amber-900/80">
              Open Overview, fill the profile fields, and click Create profile. Then you can select services here.
            </p>
            {onCreateProfile ? (
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onCreateProfile}>
                Go to Overview
              </Button>
            ) : null}
          </div>
        ) : null}
        <form className="mt-6 space-y-4" onSubmit={(event) => void onSubmit(event)}>
          <ServiceCascadePicker
            catalog={catalog}
            selectedServiceIds={selectedServiceIds}
            onSelectedServiceIdsChange={setSelectedServiceIds}
            customServices={customServices}
            onCustomServicesChange={setCustomServices}
            disabled={!profile || submitting}
          />
          {catalogError ? <p className="text-sm text-red-700">{catalogError}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
          <Button
            type="submit"
            disabled={submitting || !profile || (selectedServiceIds.length === 0 && customServices.length === 0)}
            title={!profile ? "Create your provider profile on Overview first" : undefined}
          >
            {submitting ? "Saving…" : !profile ? "Create profile first" : "Save services"}
          </Button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Your services</h2>
        <p className="mt-1 text-sm text-slate-500">{profile?.organization.displayName ?? "This organization"} is listed on these services.</p>
        {posted.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No services selected yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {posted.map((service) => (
              <li key={service.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <span>
                  <Link href={routes.service(service.slug)} className="font-medium text-slate-900 hover:text-sky-700">
                    {service.name}
                  </Link>
                  <span className="mt-1 block text-sm text-slate-500">{service.categoryPath.join(" / ") || "Uncategorized"}</span>
                  {service.documents && service.documents.length > 0 ? (
                    <span className="mt-1 block text-xs text-slate-500">
                      {service.documents.length} document{service.documents.length === 1 ? "" : "s"} attached
                    </span>
                  ) : null}
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
