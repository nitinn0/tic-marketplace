"use client";

import { useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

import { organizationsService } from "../services/organizations.service";
import type { OrganizationDetails, OrganizationStatus, UpdateOrganizationInput } from "../types";
import { formatDate, organizationTypeLabels } from "../utils/labels";

function ProfileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-slate-100 py-3 text-sm last:border-b-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="col-span-2 break-words text-slate-900">{value || "—"}</dd>
    </div>
  );
}

export function OrganizationProfileCard({
  organization,
  canEdit,
  canEditStatus,
  onUpdated,
}: {
  organization: OrganizationDetails;
  canEdit: boolean;
  canEditStatus: boolean;
  onUpdated: (organization: OrganizationDetails) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">Organization profile</h2>
        {(canEdit || canEditStatus) && !editing ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </Button>
        ) : null}
      </div>

      {editing ? (
        <OrganizationEditForm
          organization={organization}
          canEditProfile={canEdit}
          canEditStatus={canEditStatus}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setEditing(false);
            onUpdated(updated);
          }}
        />
      ) : (
        <dl className="mt-4">
          <ProfileRow label="Legal name" value={organization.legalName} />
          <ProfileRow label="Display name" value={organization.displayName} />
          <ProfileRow label="Type" value={organizationTypeLabels[organization.organizationType]} />
          <ProfileRow label="Registration number" value={organization.registrationNumber} />
          <ProfileRow label="Tax ID" value={organization.taxId} />
          <ProfileRow
            label="Website"
            value={
              organization.website ? (
                <a href={organization.website} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline">
                  {organization.website}
                </a>
              ) : null
            }
          />
          <ProfileRow label="Country" value={organization.countryCode} />
          <ProfileRow label="Description" value={organization.description} />
          <ProfileRow label="Created" value={formatDate(organization.createdAt)} />
        </dl>
      )}
    </section>
  );
}

function OrganizationEditForm({
  organization,
  canEditProfile,
  canEditStatus,
  onCancel,
  onSaved,
}: {
  organization: OrganizationDetails;
  canEditProfile: boolean;
  canEditStatus: boolean;
  onCancel: () => void;
  onSaved: (organization: OrganizationDetails) => void;
}) {
  const [form, setForm] = useState({
    legalName: organization.legalName,
    displayName: organization.displayName,
    registrationNumber: organization.registrationNumber ?? "",
    taxId: organization.taxId ?? "",
    website: organization.website ?? "",
    countryCode: organization.countryCode ?? "",
    description: organization.description ?? "",
    status: organization.status,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    // Send only fields the user may change; empty optional fields clear the stored value.
    const input: UpdateOrganizationInput = {};
    if (canEditProfile) {
      Object.assign(input, {
        legalName: form.legalName.trim(),
        displayName: form.displayName.trim(),
        registrationNumber: form.registrationNumber.trim(),
        taxId: form.taxId.trim(),
        website: form.website.trim(),
        countryCode: form.countryCode.trim().toUpperCase(),
        description: form.description.trim(),
      });
    }
    if (canEditStatus && form.status !== organization.status) {
      input.status = form.status;
    }

    try {
      onSaved(await organizationsService.update(organization.id, input));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
      <Field label="Legal name" htmlFor="edit-legal-name">
        <Input
          id="edit-legal-name"
          required
          minLength={2}
          maxLength={200}
          disabled={!canEditProfile}
          value={form.legalName}
          onChange={(event) => update("legalName", event.target.value)}
        />
      </Field>
      <Field label="Display name" htmlFor="edit-display-name">
        <Input
          id="edit-display-name"
          required
          minLength={2}
          maxLength={120}
          disabled={!canEditProfile}
          value={form.displayName}
          onChange={(event) => update("displayName", event.target.value)}
        />
      </Field>
      <Field label="Registration number" htmlFor="edit-registration">
        <Input
          id="edit-registration"
          maxLength={100}
          disabled={!canEditProfile}
          value={form.registrationNumber}
          onChange={(event) => update("registrationNumber", event.target.value)}
        />
      </Field>
      <Field label="Tax ID" htmlFor="edit-tax">
        <Input
          id="edit-tax"
          maxLength={100}
          disabled={!canEditProfile}
          value={form.taxId}
          onChange={(event) => update("taxId", event.target.value)}
        />
      </Field>
      <Field label="Website" htmlFor="edit-website">
        <Input
          id="edit-website"
          type="url"
          maxLength={255}
          disabled={!canEditProfile}
          value={form.website}
          onChange={(event) => update("website", event.target.value)}
        />
      </Field>
      <Field label="Country code" htmlFor="edit-country">
        <Input
          id="edit-country"
          maxLength={2}
          pattern="[A-Za-z]{2}"
          disabled={!canEditProfile}
          value={form.countryCode}
          onChange={(event) => update("countryCode", event.target.value)}
        />
      </Field>
      <Field label="Description" htmlFor="edit-description" className="md:col-span-2">
        <Textarea
          id="edit-description"
          maxLength={2000}
          disabled={!canEditProfile}
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
        />
      </Field>
      {canEditStatus ? (
        <Field label="Status" htmlFor="edit-status" hint="Non-active organizations are read-only for members.">
          <Select
            id="edit-status"
            value={form.status}
            onChange={(event) => update("status", event.target.value as OrganizationStatus)}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
        </Field>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3 md:col-span-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
