"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CornerDownRight } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ConfirmDialog, type ConfirmRequest } from "@/features/organizations/components/confirm-dialog";
import { useApiResource } from "@/features/organizations/hooks/use-api-resource";
import { MARKETPLACE_FUNCTIONALITIES as M } from "@/features/organizations/utils/permissions";

import { taxonomyService } from "../services/taxonomy.service";
import type { ActiveFilter, IndustryInput, TaxonomyIndustry } from "../types";
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

export function IndustriesPanel() {
  const permissions = useTaxonomyPermissions(M.industries);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<ActiveFilter>("all");
  const [editing, setEditing] = useState<TaxonomyIndustry | "new" | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const list = useApiResource(() => taxonomyService.industries.list({ search: debouncedSearch, active }), [debouncedSearch, active]);
  const all = useApiResource(() => taxonomyService.industries.list(), []);

  const reload = async () => {
    await Promise.all([list.reload(), all.reload()]);
  };

  const toggleActive = async (industry: TaxonomyIndustry) => {
    try {
      await taxonomyService.industries.update(industry.id, { active: !industry.active });
      setNotice(`${industry.name} is now ${industry.active ? "inactive" : "active"}.`);
      await reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Unable to update the industry");
    }
  };

  return (
    <div className="space-y-4">
      <TaxonomyToolbar
        search={search}
        onSearchChange={setSearch}
        active={active}
        onActiveChange={setActive}
        createLabel="New industry"
        onCreate={permissions.canCreate ? () => setEditing("new") : undefined}
      />

      <Notice message={notice} onDismiss={() => setNotice(null)} />

      {list.loading ? (
        <LoadingState label="Loading industries..." />
      ) : list.error ? (
        <ErrorState title="Unable to load industries" description={list.error} />
      ) : !list.data?.length ? (
        <EmptyState title="No industries found" description="Adjust the filters or create an industry." />
      ) : (
        <TableShell headers={["Industry", "Providers", "Status", ""]}>
          {list.data.map((industry) => (
            <tr key={industry.id} className="align-top">
              <td className="px-4 py-3">
                <div className="flex items-start gap-2" style={{ paddingLeft: `${industry.depth * 1.25}rem` }}>
                  {industry.depth > 0 ? <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" /> : null}
                  <div>
                    <p className="font-medium text-slate-900">{industry.name}</p>
                    <p className="font-mono text-xs text-slate-500">{industry.slug}</p>
                    {debouncedSearch && industry.path.length > 0 ? (
                      <p className="text-xs text-slate-500">{industry.path.map((entry) => entry.name).join(" / ")}</p>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-700">{industry.providerCount}</td>
              <td className="px-4 py-3">
                <ActiveBadge active={industry.active} effectiveActive={industry.effectiveActive} />
              </td>
              <td className="px-4 py-3">
                <RowActions
                  permissions={permissions}
                  active={industry.active}
                  onEdit={() => setEditing(industry)}
                  onToggleActive={() => void toggleActive(industry)}
                  onDelete={() =>
                    setConfirm({
                      title: `Delete ${industry.name}?`,
                      description: "Industries with sub-industries or provider references are deactivated instead of deleted.",
                      confirmLabel: "Delete",
                      destructive: true,
                      action: async () => {
                        const outcome = await taxonomyService.industries.remove(industry.id);
                        setNotice(deleteOutcomeMessage(industry.name, outcome));
                        await reload();
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
        <IndustryFormDialog
          industry={editing === "new" ? null : editing}
          industries={all.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={async (saved) => {
            setEditing(null);
            setNotice(`${saved.name} was saved.`);
            await reload();
          }}
        />
      ) : null}
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

function IndustryFormDialog({
  industry,
  industries,
  onClose,
  onSaved,
}: {
  industry: TaxonomyIndustry | null;
  industries: TaxonomyIndustry[];
  onClose: () => void;
  onSaved: (industry: TaxonomyIndustry) => void;
}) {
  const [form, setForm] = useState({
    name: industry?.name ?? "",
    slug: industry?.slug ?? "",
    parentId: industry?.parentId ?? "",
    description: industry?.description ?? "",
    sortOrder: String(industry?.sortOrder ?? 0),
    active: industry?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentOptions = useMemo(
    () =>
      industries.filter(
        (option) => !industry || (option.id !== industry.id && !option.path.some((entry) => entry.id === industry.id)),
      ),
    [industries, industry],
  );

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const input: IndustryInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      parentId: form.parentId || null,
      sortOrder: Number(form.sortOrder) || 0,
      active: form.active,
    };
    if (form.slug.trim()) input.slug = form.slug.trim().toLowerCase();

    try {
      onSaved(industry ? await taxonomyService.industries.update(industry.id, input) : await taxonomyService.industries.create(input));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the industry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={industry ? `Edit ${industry.name}` : "New industry"} className="max-w-2xl">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Name" htmlFor="industry-name">
          <Input id="industry-name" required minLength={2} maxLength={120} value={form.name} onChange={(event) => update("name", event.target.value)} />
        </Field>
        <Field label="Slug" htmlFor="industry-slug" hint={industry ? undefined : "Generated from the name when left empty."}>
          <Input
            id="industry-slug"
            maxLength={120}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={form.slug}
            onChange={(event) => update("slug", event.target.value)}
          />
        </Field>
        <Field label="Parent industry" htmlFor="industry-parent" className="md:col-span-2">
          <Select id="industry-parent" value={form.parentId} onChange={(event) => update("parentId", event.target.value)}>
            <option value="">— Top level —</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {"\u00a0\u00a0".repeat(option.depth)}
                {option.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="industry-description" className="md:col-span-2">
          <Textarea id="industry-description" maxLength={2000} value={form.description} onChange={(event) => update("description", event.target.value)} />
        </Field>
        <Field label="Sort order" htmlFor="industry-sort">
          <Input id="industry-sort" type="number" min={0} max={100000} value={form.sortOrder} onChange={(event) => update("sortOrder", event.target.value)} />
        </Field>
        <div className="flex items-end pb-2">
          <Checkbox id="industry-active" label="Active" checked={form.active} onChange={(checked) => update("active", checked)} />
        </div>
        <div className="md:col-span-2">
          <FormError message={error} />
        </div>
        <div className="flex justify-end gap-3 md:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save industry"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
