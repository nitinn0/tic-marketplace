"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ConfirmDialog, type ConfirmRequest } from "@/features/organizations/components/confirm-dialog";
import { SectionCard } from "@/features/providers/components/capability-section";

import { professionalsService } from "../services/professionals.service";
import type { ExperienceInput, ProfessionalExperience } from "../types";
import { formatMonth } from "../utils/labels";

export function ExperienceSection({
  experience,
  canCreate,
  canEdit,
  canDelete,
  onChanged,
}: {
  experience: ProfessionalExperience[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<ProfessionalExperience | "new" | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  return (
    <SectionCard
      title="Experience"
      description="Most recent first."
      action={
        canCreate ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add experience
          </Button>
        ) : null
      }
    >
      {experience.length === 0 ? (
        <p className="text-sm text-slate-500">No experience added yet.</p>
      ) : (
        <ol className="space-y-4">
          {experience.map((entry) => (
            <li key={entry.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 p-4">
              <div>
                <p className="font-medium text-slate-900">{entry.jobTitle}</p>
                <p className="text-sm text-slate-600">{entry.organizationName}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  {formatMonth(entry.startDate)} – {formatMonth(entry.endDate)}
                  {entry.current ? <Badge tone="success">Current</Badge> : null}
                </p>
                {entry.description ? <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{entry.description}</p> : null}
              </div>
              <div className="flex shrink-0 gap-1">
                {canEdit ? (
                  <Button type="button" variant="ghost" size="sm" aria-label="Edit experience" onClick={() => setEditing(entry)}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Delete experience"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() =>
                      setConfirm({
                        title: "Delete this experience?",
                        description: `${entry.jobTitle} at ${entry.organizationName} will be removed from your profile.`,
                        confirmLabel: "Delete",
                        destructive: true,
                        action: async () => {
                          await professionalsService.deleteExperience(entry.id);
                          await onChanged();
                        },
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}

      {editing ? (
        <ExperienceDialog
          entry={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await onChanged();
          }}
        />
      ) : null}
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </SectionCard>
  );
}

function ExperienceDialog({
  entry,
  onClose,
  onSaved,
}: {
  entry: ProfessionalExperience | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    organizationName: entry?.organizationName ?? "",
    jobTitle: entry?.jobTitle ?? "",
    startDate: entry?.startDate ?? "",
    endDate: entry?.endDate ?? "",
    current: entry ? entry.current : false,
    description: entry?.description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const input: ExperienceInput = {
      organizationName: form.organizationName.trim(),
      jobTitle: form.jobTitle.trim(),
      startDate: form.startDate,
      endDate: form.current ? null : form.endDate || null,
      description: form.description.trim(),
    };
    try {
      if (entry) await professionalsService.updateExperience(entry.id, input);
      else await professionalsService.createExperience(input);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the experience");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={entry ? "Edit experience" : "Add experience"} className="max-w-2xl">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Job title" htmlFor="experience-title">
          <Input id="experience-title" required minLength={2} maxLength={160} value={form.jobTitle} onChange={(event) => update("jobTitle", event.target.value)} />
        </Field>
        <Field label="Organization" htmlFor="experience-organization">
          <Input
            id="experience-organization"
            required
            minLength={2}
            maxLength={200}
            value={form.organizationName}
            onChange={(event) => update("organizationName", event.target.value)}
          />
        </Field>
        <Field label="Start date" htmlFor="experience-start">
          <Input id="experience-start" type="date" required max={today} value={form.startDate} onChange={(event) => update("startDate", event.target.value)} />
        </Field>
        <Field label="End date" htmlFor="experience-end">
          <Input
            id="experience-end"
            type="date"
            disabled={form.current}
            required={!form.current}
            min={form.startDate || undefined}
            value={form.current ? "" : form.endDate}
            onChange={(event) => update("endDate", event.target.value)}
          />
        </Field>
        <div className="md:col-span-2">
          <Checkbox id="experience-current" label="I currently work here" checked={form.current} onChange={(checked) => update("current", checked)} />
        </div>
        <Field label="Description" htmlFor="experience-description" className="md:col-span-2">
          <Textarea id="experience-description" maxLength={2000} value={form.description} onChange={(event) => update("description", event.target.value)} />
        </Field>
        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-3 md:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save experience"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
