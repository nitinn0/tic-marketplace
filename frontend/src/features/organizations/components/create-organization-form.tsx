"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

import { organizationsService } from "../services/organizations.service";
import type { CreateOrganizationInput, OrganizationDetails, OrganizationType } from "../types";

const emptyForm = {
  legalName: "",
  displayName: "",
  organizationType: "PROVIDER" as OrganizationType,
  registrationNumber: "",
  taxId: "",
  website: "",
  countryCode: "",
  description: "",
};

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function CreateOrganizationForm({
  onCreated,
  onCancel,
}: {
  onCreated: (organization: OrganizationDetails) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const input: CreateOrganizationInput = {
      legalName: form.legalName.trim(),
      displayName: form.displayName.trim(),
      organizationType: form.organizationType,
      registrationNumber: optional(form.registrationNumber),
      taxId: optional(form.taxId),
      website: optional(form.website),
      countryCode: optional(form.countryCode)?.toUpperCase(),
      description: optional(form.description),
    };
    try {
      onCreated(await organizationsService.create(input));
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create organization");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Create an organization</h2>
      <p className="mt-1 text-sm text-slate-600">You will become the owner and organization administrator.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Legal name" htmlFor="org-legal-name">
          <Input
            id="org-legal-name"
            required
            minLength={2}
            maxLength={200}
            value={form.legalName}
            onChange={(event) => update("legalName", event.target.value)}
            placeholder="ABC Certification Pvt Ltd"
          />
        </Field>
        <Field label="Display name" htmlFor="org-display-name">
          <Input
            id="org-display-name"
            required
            minLength={2}
            maxLength={120}
            value={form.displayName}
            onChange={(event) => update("displayName", event.target.value)}
            placeholder="ABC Certification"
          />
        </Field>
        <Field label="Organization type" htmlFor="org-type" hint="Cannot be changed later.">
          <Select
            id="org-type"
            value={form.organizationType}
            onChange={(event) => update("organizationType", event.target.value as OrganizationType)}
          >
            <option value="PROVIDER">Provider (offers TIC services)</option>
            <option value="BUYER">Buyer (sources TIC services)</option>
          </Select>
        </Field>
        <Field label="Country code" htmlFor="org-country" hint="ISO 3166-1 alpha-2, e.g. IN">
          <Input
            id="org-country"
            maxLength={2}
            pattern="[A-Za-z]{2}"
            value={form.countryCode}
            onChange={(event) => update("countryCode", event.target.value)}
            placeholder="IN"
          />
        </Field>
        <Field label="Registration number" htmlFor="org-registration">
          <Input
            id="org-registration"
            maxLength={100}
            value={form.registrationNumber}
            onChange={(event) => update("registrationNumber", event.target.value)}
          />
        </Field>
        <Field label="Tax ID" htmlFor="org-tax">
          <Input id="org-tax" maxLength={100} value={form.taxId} onChange={(event) => update("taxId", event.target.value)} />
        </Field>
        <Field label="Website" htmlFor="org-website" className="md:col-span-2">
          <Input
            id="org-website"
            type="url"
            maxLength={255}
            value={form.website}
            onChange={(event) => update("website", event.target.value)}
            placeholder="https://example.com"
          />
        </Field>
        <Field label="Description" htmlFor="org-description" className="md:col-span-2">
          <Textarea
            id="org-description"
            maxLength={2000}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
          />
        </Field>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create organization"}
        </Button>
      </div>
    </form>
  );
}
