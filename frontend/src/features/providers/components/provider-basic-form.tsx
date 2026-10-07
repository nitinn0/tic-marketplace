"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

import type { ProviderProfile, ProviderProfileInput, ProviderType } from "../types";
import { PROVIDER_TYPES, providerTypeLabels } from "../utils/labels";

export function ProviderBasicForm({
  profile,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  profile: ProviderProfile | null;
  submitLabel: string;
  onSubmit: (input: ProviderProfileInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    providerType: profile?.providerType ?? ("TESTING_LAB" as ProviderType),
    headline: profile?.headline ?? "",
    description: profile?.description ?? "",
    yearsInBusiness: profile?.yearsInBusiness?.toString() ?? "",
    publicProfile: profile?.publicProfile ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        providerType: form.providerType,
        headline: form.headline.trim(),
        description: form.description.trim(),
        yearsInBusiness: form.yearsInBusiness.trim() ? Number(form.yearsInBusiness) : null,
        publicProfile: form.publicProfile,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <Field label="Provider type" htmlFor="provider-type">
        <Select id="provider-type" value={form.providerType} onChange={(event) => update("providerType", event.target.value as ProviderType)}>
          {PROVIDER_TYPES.map((type) => (
            <option key={type} value={type}>
              {providerTypeLabels[type]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Years in business" htmlFor="provider-years">
        <Input
          id="provider-years"
          type="number"
          min={0}
          max={500}
          value={form.yearsInBusiness}
          onChange={(event) => update("yearsInBusiness", event.target.value)}
        />
      </Field>
      <Field label="Headline" htmlFor="provider-headline" className="md:col-span-2">
        <Input id="provider-headline" maxLength={160} value={form.headline} onChange={(event) => update("headline", event.target.value)} />
      </Field>
      <Field label="Description" htmlFor="provider-description" className="md:col-span-2">
        <Textarea
          id="provider-description"
          maxLength={5000}
          className="min-h-32"
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
        />
      </Field>
      <div className="md:col-span-2">
        <Checkbox
          id="provider-public"
          label="Show this profile publicly once marketplace listings are available"
          checked={form.publicProfile}
          onChange={(checked) => update("publicProfile", checked)}
        />
        <p className="mt-1 pl-6 text-xs text-slate-500">
          Public visibility is separate from verification: the platform verifies providers in a later step.
        </p>
      </div>
      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-3 md:col-span-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
