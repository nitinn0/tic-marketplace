"use client";

import { useState, type FormEvent } from "react";

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
import type { ActiveFilter, ServiceInput, TaxonomyCategory, TaxonomyService } from "../types";
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

function CategoryOptions({ categories }: { categories: TaxonomyCategory[] }) {
  return (
    <>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {"\u00a0\u00a0".repeat(category.depth)}
          {category.name}
          {category.active ? "" : " (inactive)"}
        </option>
      ))}
    </>
  );
}

export function ServicesPanel() {
  const permissions = useTaxonomyPermissions(M.services);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<ActiveFilter>("all");
  const [categoryId, setCategoryId] = useState("");
  const [editing, setEditing] = useState<TaxonomyService | "new" | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const list = useApiResource(
    () => taxonomyService.services.list({ search: debouncedSearch, active, categoryId: categoryId || undefined }),
    [debouncedSearch, active, categoryId],
  );
  const categories = useApiResource(() => taxonomyService.categories.list(), []);

  const toggleActive = async (service: TaxonomyService) => {
    try {
      await taxonomyService.services.update(service.id, { active: !service.active });
      setNotice(`${service.name} is now ${service.active ? "inactive" : "active"}.`);
      await list.reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Unable to update the service");
    }
  };

  return (
    <div className="space-y-4">
      <TaxonomyToolbar
        search={search}
        onSearchChange={setSearch}
        active={active}
        onActiveChange={setActive}
        createLabel="New service"
        onCreate={permissions.canCreate ? () => setEditing("new") : undefined}
      >
        <Select aria-label="Category filter" className="sm:w-56" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">All categories</option>
          <CategoryOptions categories={categories.data ?? []} />
        </Select>
      </TaxonomyToolbar>

      <Notice message={notice} onDismiss={() => setNotice(null)} />

      {list.loading ? (
        <LoadingState label="Loading services..." />
      ) : list.error ? (
        <ErrorState title="Unable to load services" description={list.error} />
      ) : !list.data?.length ? (
        <EmptyState title="No services found" description="Adjust the filters or create a service." />
      ) : (
        <TableShell headers={["Service", "Category", "Providers", "Status", ""]}>
          {list.data.map((service) => (
            <tr key={service.id} className="align-top">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900">{service.name}</p>
                <p className="font-mono text-xs text-slate-500">{service.slug}</p>
              </td>
              <td className="px-4 py-3 text-slate-700">{service.categoryPath.join(" / ")}</td>
              <td className="px-4 py-3 text-slate-700">{service.providerCount}</td>
              <td className="px-4 py-3">
                <ActiveBadge active={service.active} effectiveActive={service.effectiveActive} />
              </td>
              <td className="px-4 py-3">
                <RowActions
                  permissions={permissions}
                  active={service.active}
                  onEdit={() => setEditing(service)}
                  onToggleActive={() => void toggleActive(service)}
                  onDelete={() =>
                    setConfirm({
                      title: `Delete ${service.name}?`,
                      description: "Services offered by providers are deactivated instead of deleted.",
                      confirmLabel: "Delete",
                      destructive: true,
                      action: async () => {
                        const outcome = await taxonomyService.services.remove(service.id);
                        setNotice(deleteOutcomeMessage(service.name, outcome));
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
        <ServiceFormDialog
          service={editing === "new" ? null : editing}
          categories={categories.data ?? []}
          defaultCategoryId={categoryId}
          onClose={() => setEditing(null)}
          onSaved={async (saved) => {
            setEditing(null);
            setNotice(`${saved.name} was saved.`);
            await list.reload();
          }}
        />
      ) : null}
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

function ServiceFormDialog({
  service,
  categories,
  defaultCategoryId,
  onClose,
  onSaved,
}: {
  service: TaxonomyService | null;
  categories: TaxonomyCategory[];
  defaultCategoryId: string;
  onClose: () => void;
  onSaved: (service: TaxonomyService) => void;
}) {
  const [form, setForm] = useState({
    name: service?.name ?? "",
    slug: service?.slug ?? "",
    categoryId: service?.categoryId ?? defaultCategoryId,
    description: service?.description ?? "",
    sortOrder: String(service?.sortOrder ?? 0),
    active: service?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const input: ServiceInput = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      description: form.description.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      active: form.active,
    };
    if (form.slug.trim()) input.slug = form.slug.trim().toLowerCase();

    try {
      onSaved(service ? await taxonomyService.services.update(service.id, input) : await taxonomyService.services.create(input));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the service");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={service ? `Edit ${service.name}` : "New service"} className="max-w-2xl">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Name" htmlFor="service-name">
          <Input id="service-name" required minLength={2} maxLength={160} value={form.name} onChange={(event) => update("name", event.target.value)} />
        </Field>
        <Field label="Slug" htmlFor="service-slug" hint={service ? undefined : "Generated from the name when left empty."}>
          <Input
            id="service-slug"
            maxLength={120}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={form.slug}
            onChange={(event) => update("slug", event.target.value)}
          />
        </Field>
        <Field label="Category" htmlFor="service-category" className="md:col-span-2">
          <Select id="service-category" required value={form.categoryId} onChange={(event) => update("categoryId", event.target.value)}>
            <option value="" disabled>
              Select a category
            </option>
            <CategoryOptions categories={categories} />
          </Select>
        </Field>
        <Field label="Description" htmlFor="service-description" className="md:col-span-2">
          <Textarea id="service-description" maxLength={2000} value={form.description} onChange={(event) => update("description", event.target.value)} />
        </Field>
        <Field label="Sort order" htmlFor="service-sort">
          <Input id="service-sort" type="number" min={0} max={100000} value={form.sortOrder} onChange={(event) => update("sortOrder", event.target.value)} />
        </Field>
        <div className="flex items-end pb-2">
          <Checkbox id="service-active" label="Active" checked={form.active} onChange={(checked) => update("active", checked)} />
        </div>
        <div className="md:col-span-2">
          <FormError message={error} />
        </div>
        <div className="flex justify-end gap-3 md:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save service"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
