"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

import type { AvailabilityStatus, ProfessionalProfile, ProfessionalProfileInput, ProfessionalType } from "../types";
import { AVAILABILITY_STATUSES, availabilityLabels, PROFESSIONAL_TYPES, professionalTypeLabels } from "../utils/labels";

export function ProfessionalBasicForm({
  profile,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  profile: ProfessionalProfile | null;
  submitLabel: string;
  onSubmit: (input: ProfessionalProfileInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    professionalType: profile?.professionalType ?? ("CONSULTANT" as ProfessionalType),
    headline: profile?.headline ?? "",
    bio: profile?.bio ?? "",
    yearsExperience: profile?.yearsExperience?.toString() ?? "",
    availabilityStatus: profile?.availabilityStatus ?? ("AVAILABLE" as AvailabilityStatus),
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
      const input: ProfessionalProfileInput = {
        professionalType: form.professionalType,
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        yearsExperience: form.yearsExperience.trim() ? Number(form.yearsExperience) : null,
        publicProfile: form.publicProfile,
      };
      // Availability has its own section once the profile exists.
      if (!profile) input.availabilityStatus = form.availabilityStatus;
      await onSubmit(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <Field label="Professional type" htmlFor="professional-type">
        <Select
          id="professional-type"
          value={form.professionalType}
          onChange={(event) => update("professionalType", event.target.value as ProfessionalType)}
        >
          {PROFESSIONAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {professionalTypeLabels[type]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Years of experience" htmlFor="professional-years">
        <Input
          id="professional-years"
          type="number"
          min={0}
          max={80}
          value={form.yearsExperience}
          onChange={(event) => update("yearsExperience", event.target.value)}
        />
      </Field>
      <Field label="Headline" htmlFor="professional-headline" className="md:col-span-2">
        <Input id="professional-headline" maxLength={160} value={form.headline} onChange={(event) => update("headline", event.target.value)} />
      </Field>
      <Field label="Bio" htmlFor="professional-bio" className="md:col-span-2">
        <Textarea id="professional-bio" maxLength={5000} className="min-h-32" value={form.bio} onChange={(event) => update("bio", event.target.value)} />
      </Field>
      {!profile ? (
        <Field label="Availability" htmlFor="professional-availability">
          <Select
            id="professional-availability"
            value={form.availabilityStatus}
            onChange={(event) => update("availabilityStatus", event.target.value as AvailabilityStatus)}
          >
            {AVAILABILITY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {availabilityLabels[status]}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <div className="md:col-span-2">
        <Checkbox
          id="professional-public"
          label="Show this profile publicly once marketplace listings are available"
          checked={form.publicProfile}
          onChange={(checked) => update("publicProfile", checked)}
        />
        <p className="mt-1 pl-6 text-xs text-slate-500">Public visibility is separate from verification.</p>
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
