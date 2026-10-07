"use client";

import { useState, type FormEvent } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ConfirmDialog, type ConfirmRequest } from "@/features/organizations/components/confirm-dialog";
import { useApiResource } from "@/features/organizations/hooks/use-api-resource";
import { MARKETPLACE_FUNCTIONALITIES as M } from "@/features/organizations/utils/permissions";

import { taxonomyService } from "../services/taxonomy.service";
import type { ActiveFilter, StandardInput, TaxonomyStandard } from "../types";
import {
  ActiveBadge,
  deleteOutcomeMessage,
  FormError,
  Notice,
  RowActions,
  TableShell,
  TaxonomyToolbar,
  useDebouncedValue,
  useTaxonomyPermissions,
} from "./taxonomy-ui";

export function StandardsPanel() {
  const permissions = useTaxonomyPermissions(M.standards);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<ActiveFilter>("all");
  const [editing, setEditing] = useState<TaxonomyStandard | "new" | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const list = useApiResource(() => taxonomyService.standards.list({ search: debouncedSearch, active }), [debouncedSearch, active]);

  const toggleActive = async (standard: TaxonomyStandard) => {
    try {
      await taxonomyService.standards.update(standard.id, { active: !standard.active });
      setNotice(`${standard.code} is now ${standard.active ? "inactive" : "active"}.`);
      await list.reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Unable to update the standard");
    }
  };

  return (
    <div className="space-y-4">
      <TaxonomyToolbar
        search={search}
        onSearchChange={setSearch}
        active={active}
        onActiveChange={setActive}
        createLabel="New standard"
        onCreate={permissions.canCreate ? () => setEditing("new") : undefined}
      />

      <Notice message={notice} onDismiss={() => setNotice(null)} />

      {list.loading ? (
        <LoadingState label="Loading standards..." />
      ) : list.error ? (
        <ErrorState title="Unable to load standards" description={list.error} />
      ) : !list.data?.length ? (
        <EmptyState title="No standards found" description="Adjust the filters or create a standard." />
      ) : (
        <TableShell headers={["Code", "Name", "Version", "Providers", "Status", ""]}>
          {list.data.map((standard) => (
            <tr key={standard.id} className="align-top">
              <td className="px-4 py-3 font-medium text-slate-900">{standard.code}</td>
              <td className="px-4 py-3 text-slate-700">{standard.name}</td>
              <td className="px-4 py-3 text-slate-700">{standard.version ?? "—"}</td>
              <td className="px-4 py-3 text-slate-700">{standard.providerCount}</td>
              <td className="px-4 py-3">
                <ActiveBadge active={standard.active} />
              </td>
              <td className="px-4 py-3">
                <RowActions
                  permissions={permissions}
                  active={standard.active}
                  onEdit={() => setEditing(standard)}
                  onToggleActive={() => void toggleActive(standard)}
                  onDelete={() =>
                    setConfirm({
                      title: `Delete ${standard.code}?`,
                      description: "Standards declared by providers are deactivated instead of deleted.",
                      confirmLabel: "Delete",
                      destructive: true,
                      action: async () => {
                        const outcome = await taxonomyService.standards.remove(standard.id);
                        setNotice(deleteOutcomeMessage(standard.code, outcome));
                        await list.reload();
                      },
                    })
                  }
                />
              </td>
            </tr>
          ))}
        </TableShell>
      )}

      {editing ? (
        <StandardFormDialog
          standard={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async (saved) => {
            setEditing(null);
            setNotice(`${saved.code} was saved.`);
            await list.reload();
          }}
        />
      ) : null}
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

function StandardFormDialog({
  standard,
  onClose,
  onSaved,
}: {
  standard: TaxonomyStandard | null;
  onClose: () => void;
  onSaved: (standard: TaxonomyStandard) => void;
}) {
  const [form, setForm] = useState({
    code: standard?.code ?? "",
    name: standard?.name ?? "",
    version: standard?.version ?? "",
    description: standard?.description ?? "",
    active: standard?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const input: StandardInput = {
      code: form.code.trim(),
      name: form.name.trim(),
      version: form.version.trim(),
      description: form.description.trim(),
      active: form.active,
    };

    try {
      onSaved(standard ? await taxonomyService.standards.update(standard.id, input) : await taxonomyService.standards.create(input));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the standard");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={standard ? `Edit ${standard.code}` : "New standard"} className="max-w-2xl">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Code" htmlFor="standard-code" hint="For example ISO 9001. Stored in upper case.">
          <Input id="standard-code" required minLength={2} maxLength={60} value={form.code} onChange={(event) => update("code", event.target.value)} />
        </Field>
        <Field label="Version" htmlFor="standard-version">
          <Input id="standard-version" maxLength={30} value={form.version} onChange={(event) => update("version", event.target.value)} />
        </Field>
        <Field label="Name" htmlFor="standard-name" className="md:col-span-2">
          <Input id="standard-name" required minLength={2} maxLength={200} value={form.name} onChange={(event) => update("name", event.target.value)} />
        </Field>
        <Field label="Description" htmlFor="standard-description" className="md:col-span-2">
          <Textarea id="standard-description" maxLength={2000} value={form.description} onChange={(event) => update("description", event.target.value)} />
        </Field>
        <div className="md:col-span-2">
          <Checkbox id="standard-active" label="Active" checked={form.active} onChange={(checked) => update("active", checked)} />
        </div>
        <div className="md:col-span-2">
          <FormError message={error} />
        </div>
        <div className="flex justify-end gap-3 md:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save standard"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
