"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CornerDownRight } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ConfirmDialog, type ConfirmRequest } from "@/features/organizations/components/confirm-dialog";
import { useApiResource } from "@/features/organizations/hooks/use-api-resource";
import { MARKETPLACE_FUNCTIONALITIES as M } from "@/features/organizations/utils/permissions";

import { taxonomyService } from "../services/taxonomy.service";
import type { ActiveFilter, CategoryInput, CategoryType, TaxonomyCategory } from "../types";
import { CATEGORY_TYPES, categoryTypeLabels } from "../utils/labels";
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

export function CategoriesPanel() {
  const permissions = useTaxonomyPermissions(M.categories);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<ActiveFilter>("all");
  const [categoryType, setCategoryType] = useState<CategoryType | "">("");
  const [editing, setEditing] = useState<TaxonomyCategory | "new" | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const list = useApiResource(
    () => taxonomyService.categories.list({ search: debouncedSearch, active, categoryType: categoryType || undefined }),
    [debouncedSearch, active, categoryType],
  );
  // Unfiltered tree for the parent picker.
  const all = useApiResource(() => taxonomyService.categories.list(), []);

  const reload = async () => {
    await Promise.all([list.reload(), all.reload()]);
  };

  const toggleActive = async (category: TaxonomyCategory) => {
    try {
      await taxonomyService.categories.update(category.id, { active: !category.active });
      setNotice(`${category.name} is now ${category.active ? "inactive" : "active"}.`);
      await reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Unable to update the category");
    }
  };

  return (
    <div className="space-y-4">
      <TaxonomyToolbar
        search={search}
        onSearchChange={setSearch}
        active={active}
        onActiveChange={setActive}
        createLabel="New category"
        onCreate={permissions.canCreate ? () => setEditing("new") : undefined}
      >
        <Select
          aria-label="Category type filter"
          className="sm:w-48"
          value={categoryType}
          onChange={(event) => setCategoryType(event.target.value as CategoryType | "")}
        >
          <option value="">All types</option>
          {CATEGORY_TYPES.map((type) => (
            <option key={type} value={type}>
              {categoryTypeLabels[type]}
            </option>
          ))}
        </Select>
      </TaxonomyToolbar>

      <Notice message={notice} onDismiss={() => setNotice(null)} />

      {list.loading ? (
        <LoadingState label="Loading categories..." />
      ) : list.error ? (
        <ErrorState title="Unable to load categories" description={list.error} />
      ) : !list.data?.length ? (
        <EmptyState title="No categories found" description="Adjust the filters or create a category." />
      ) : (
        <TableShell headers={["Category", "Type", "Services", "Status", ""]}>
          {list.data.map((category) => (
            <tr key={category.id} className="align-top">
              <td className="px-4 py-3">
                <div className="flex items-start gap-2" style={{ paddingLeft: `${category.depth * 1.25}rem` }}>
                  {category.depth > 0 ? <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" /> : null}
                  <div>
                    <p className="font-medium text-slate-900">{category.name}</p>
                    <p className="font-mono text-xs text-slate-500">{category.slug}</p>
                    {debouncedSearch && category.path.length > 0 ? (
                      <p className="text-xs text-slate-500">{category.path.map((entry) => entry.name).join(" / ")}</p>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge tone="info">{categoryTypeLabels[category.categoryType]}</Badge>
              </td>
              <td className="px-4 py-3 text-slate-700">{category.serviceCount}</td>
              <td className="px-4 py-3">
                <ActiveBadge active={category.active} effectiveActive={category.effectiveActive} />
              </td>
              <td className="px-4 py-3">
                <RowActions
                  permissions={permissions}
                  active={category.active}
                  onEdit={() => setEditing(category)}
                  onToggleActive={() => void toggleActive(category)}
                  onDelete={() =>
                    setConfirm({
                      title: `Delete ${category.name}?`,
                      description:
                        "Categories that still have sub-categories or services are deactivated instead of deleted.",
                      confirmLabel: "Delete",
                      destructive: true,
                      action: async () => {
                        const outcome = await taxonomyService.categories.remove(category.id);
                        setNotice(deleteOutcomeMessage(category.name, outcome));
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
        <CategoryFormDialog
          category={editing === "new" ? null : editing}
          categories={all.data ?? []}
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

function CategoryFormDialog({
  category,
  categories,
  onClose,
  onSaved,
}: {
  category: TaxonomyCategory | null;
  categories: TaxonomyCategory[];
  onClose: () => void;
  onSaved: (category: TaxonomyCategory) => void;
}) {
  const [form, setForm] = useState({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    parentId: category?.parentId ?? "",
    categoryType: category?.categoryType ?? ("CERTIFICATION" as CategoryType),
    description: category?.description ?? "",
    sortOrder: String(category?.sortOrder ?? 0),
    active: category?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A category cannot be moved under itself or one of its descendants.
  const parentOptions = useMemo(
    () =>
      categories.filter(
        (option) => !category || (option.id !== category.id && !option.path.some((entry) => entry.id === category.id)),
      ),
    [categories, category],
  );
  const parent = categories.find((option) => option.id === form.parentId);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const input: CategoryInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      parentId: form.parentId || null,
      sortOrder: Number(form.sortOrder) || 0,
      active: form.active,
    };
    if (form.slug.trim()) input.slug = form.slug.trim().toLowerCase();
    // Child categories inherit their parent's type.
    if (!form.parentId) input.categoryType = form.categoryType;

    try {
      onSaved(
        category
          ? await taxonomyService.categories.update(category.id, input)
          : await taxonomyService.categories.create(input),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={category ? `Edit ${category.name}` : "New category"} className="max-w-2xl">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Name" htmlFor="category-name">
          <Input id="category-name" required minLength={2} maxLength={120} value={form.name} onChange={(event) => update("name", event.target.value)} />
        </Field>
        <Field label="Slug" htmlFor="category-slug" hint={category ? undefined : "Generated from the name when left empty."}>
          <Input
            id="category-slug"
            maxLength={120}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={form.slug}
            onChange={(event) => update("slug", event.target.value)}
          />
        </Field>
        <Field label="Parent category" htmlFor="category-parent">
          <Select id="category-parent" value={form.parentId} onChange={(event) => update("parentId", event.target.value)}>
            <option value="">— Top level —</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {"\u00a0\u00a0".repeat(option.depth)}
                {option.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Category type"
          htmlFor="category-type"
          hint={parent ? "Inherited from the parent category." : category?.childCount ? "Changing it updates all sub-categories." : undefined}
        >
          <Select
            id="category-type"
            disabled={Boolean(parent)}
            value={parent ? parent.categoryType : form.categoryType}
            onChange={(event) => update("categoryType", event.target.value as CategoryType)}
          >
            {CATEGORY_TYPES.map((type) => (
              <option key={type} value={type}>
                {categoryTypeLabels[type]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="category-description" className="md:col-span-2">
          <Textarea id="category-description" maxLength={2000} value={form.description} onChange={(event) => update("description", event.target.value)} />
        </Field>
        <Field label="Sort order" htmlFor="category-sort">
          <Input id="category-sort" type="number" min={0} max={100000} value={form.sortOrder} onChange={(event) => update("sortOrder", event.target.value)} />
        </Field>
        <div className="flex items-end pb-2">
          <Checkbox id="category-active" label="Active" checked={form.active} onChange={(checked) => update("active", checked)} />
        </div>
        <div className="md:col-span-2">
          <FormError message={error} />
        </div>
        <div className="flex justify-end gap-3 md:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save category"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
