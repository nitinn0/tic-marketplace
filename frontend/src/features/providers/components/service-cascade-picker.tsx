"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { ProviderCatalog } from "../types";

export type CustomServiceDraft = {
  key: string;
  categoryId: string;
  name: string;
  description?: string;
};

const ROOT_SLUGS = ["testing", "inspection", "certification", "professional-services"] as const;

type CascadeCatalog = Pick<ProviderCatalog, "categories" | "services">;
type CatalogCategory = CascadeCatalog["categories"][number];
type CatalogService = CascadeCatalog["services"][number];

function MultiSelectPanel({
  label,
  items,
  selectedIds,
  onToggle,
  emptyText,
  disabled,
}: {
  label: string;
  items: Array<{ id: string; label: string; hint?: string }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyText: string;
  disabled?: boolean;
}) {
  const selected = new Set(selectedIds);
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>
      <div
        className={cn(
          "max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2",
          disabled ? "opacity-60" : null,
        )}
      >
        {items.length === 0 ? <p className="px-2 py-3 text-sm text-slate-500">{emptyText}</p> : null}
        {items.map((item) => {
          const active = selected.has(item.id);
          return (
            <label
              key={item.id}
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white",
                disabled ? "pointer-events-none" : null,
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
                checked={active}
                disabled={disabled}
                onChange={() => onToggle(item.id)}
              />
              <span>
                <span className="font-medium text-slate-900">{item.label}</span>
                {item.hint ? <span className="mt-0.5 block text-xs text-slate-500">{item.hint}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-slate-500">{selectedIds.length} selected</p>
    </div>
  );
}

export function ServiceCascadePicker({
  catalog,
  selectedServiceIds,
  onSelectedServiceIdsChange,
  customServices,
  onCustomServicesChange,
  disabled,
}: {
  catalog: CascadeCatalog | null;
  selectedServiceIds: string[];
  onSelectedServiceIdsChange: (ids: string[]) => void;
  customServices: CustomServiceDraft[];
  onCustomServicesChange: (items: CustomServiceDraft[]) => void;
  disabled?: boolean;
}) {
  const [rootIds, setRootIds] = useState<string[]>([]);
  const [subcategoryIds, setSubcategoryIds] = useState<string[]>([]);
  const [customCategoryId, setCustomCategoryId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [showAddNew, setShowAddNew] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!catalog || hydratedRef.current || selectedServiceIds.length === 0) return;
    const nextSubs = new Set<string>();
    const nextRoots = new Set<string>();
    for (const serviceId of selectedServiceIds) {
      const service = catalog.services.find((entry) => entry.id === serviceId);
      const subcategoryId = service?.categoryId ?? service?.category.id;
      if (!subcategoryId) continue;
      nextSubs.add(subcategoryId);
      const subcategory = catalog.categories.find((category) => category.id === subcategoryId);
      if (subcategory?.parentId) nextRoots.add(subcategory.parentId);
    }
    if (nextRoots.size === 0) return;
    hydratedRef.current = true;
    setRootIds([...nextRoots]);
    setSubcategoryIds([...nextSubs]);
  }, [catalog, selectedServiceIds]);

  const roots = useMemo(() => {
    const rows = (catalog?.categories ?? []).filter((category) => category.depth === 0);
    const preferred = ROOT_SLUGS.map((slug) => rows.find((row) => row.slug === slug)).filter(Boolean) as CatalogCategory[];
    return preferred.length ? preferred : rows;
  }, [catalog]);

  const subcategories = useMemo(() => {
    if (!catalog || rootIds.length === 0) return [] as CatalogCategory[];
    const rootSet = new Set(rootIds);
    return catalog.categories.filter((category) => category.depth === 1 && category.parentId && rootSet.has(category.parentId));
  }, [catalog, rootIds]);

  const services = useMemo(() => {
    if (!catalog || subcategoryIds.length === 0) return [] as CatalogService[];
    const subSet = new Set(subcategoryIds);
    return catalog.services.filter((service) => subSet.has(service.categoryId ?? service.category.id));
  }, [catalog, subcategoryIds]);

  const toggleRoot = (id: string) => {
    setRootIds((current) => {
      const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
      const allowedRoots = new Set(next);
      const nextSubs = subcategoryIds.filter((subId) => {
        const sub = catalog?.categories.find((category) => category.id === subId);
        return Boolean(sub?.parentId && allowedRoots.has(sub.parentId));
      });
      setSubcategoryIds(nextSubs);
      const allowedSubs = new Set(nextSubs);
      onSelectedServiceIdsChange(
        selectedServiceIds.filter((serviceId) => {
          const service = catalog?.services.find((entry) => entry.id === serviceId);
          const categoryId = service?.categoryId ?? service?.category.id;
          return Boolean(categoryId && allowedSubs.has(categoryId));
        }),
      );
      return next;
    });
  };

  const toggleSubcategory = (id: string) => {
    setSubcategoryIds((current) => {
      const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
      const allowedSubs = new Set(next);
      onSelectedServiceIdsChange(
        selectedServiceIds.filter((serviceId) => {
          const service = catalog?.services.find((entry) => entry.id === serviceId);
          const categoryId = service?.categoryId ?? service?.category.id;
          return Boolean(categoryId && allowedSubs.has(categoryId));
        }),
      );
      return next;
    });
  };

  const toggleService = (id: string) => {
    onSelectedServiceIdsChange(
      selectedServiceIds.includes(id) ? selectedServiceIds.filter((entry) => entry !== id) : [...selectedServiceIds, id],
    );
  };

  const addCustom = () => {
    const name = customName.trim();
    if (!customCategoryId || name.length < 2) return;
    onCustomServicesChange([
      ...customServices,
      {
        key: `${customCategoryId}:${name.toLowerCase()}:${Date.now()}`,
        categoryId: customCategoryId,
        name,
        description: customDescription.trim() || undefined,
      },
    ]);
    setCustomName("");
    setCustomDescription("");
    setShowAddNew(false);
  };

  const addableSubcategories = subcategoryIds.length
    ? subcategories.filter((category) => subcategoryIds.includes(category.id))
    : subcategories;

  return (
    <div className="space-y-4">
      <MultiSelectPanel
        label="Categories"
        items={roots.map((category) => ({ id: category.id, label: category.name }))}
        selectedIds={rootIds}
        onToggle={toggleRoot}
        emptyText="No categories available."
        disabled={disabled || !catalog}
      />

      <MultiSelectPanel
        label="Subcategories"
        items={subcategories.map((category) => ({
          id: category.id,
          label: category.name,
          hint: category.path.slice(0, -1).join(" / ") || undefined,
        }))}
        selectedIds={subcategoryIds}
        onToggle={toggleSubcategory}
        emptyText={rootIds.length === 0 ? "Select one or more categories first." : "No subcategories for the selected categories."}
        disabled={disabled || rootIds.length === 0}
      />

      <MultiSelectPanel
        label="Services"
        items={services.map((service) => ({
          id: service.id,
          label: service.name,
          hint: service.categoryPath.join(" / "),
        }))}
        selectedIds={selectedServiceIds}
        onToggle={toggleService}
        emptyText={
          subcategoryIds.length === 0 ? "Select one or more subcategories first." : "No catalogue services in these subcategories."
        }
        disabled={disabled || subcategoryIds.length === 0}
      />

      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-slate-800">Add a new service</p>
            <p className="text-xs text-slate-500">If your offering is missing from the catalogue, add it under a subcategory.</p>
          </div>
          {!showAddNew ? (
            <Button type="button" variant="outline" size="sm" disabled={disabled || addableSubcategories.length === 0} onClick={() => setShowAddNew(true)}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add new service
            </Button>
          ) : null}
        </div>

        {showAddNew ? (
          <div className="mt-3 space-y-3">
            <Field label="Subcategory" htmlFor="custom-service-category">
              <Select
                id="custom-service-category"
                required
                value={customCategoryId}
                onChange={(event) => setCustomCategoryId(event.target.value)}
                disabled={disabled}
              >
                <option value="">Select subcategory</option>
                {addableSubcategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.path.join(" / ")}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Service name" htmlFor="custom-service-name">
              <Input
                id="custom-service-name"
                required
                minLength={2}
                maxLength={160}
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                placeholder="e.g. On-site stack sampling"
                disabled={disabled}
              />
            </Field>
            <Field label="Description (optional)" htmlFor="custom-service-description">
              <Input
                id="custom-service-description"
                maxLength={2000}
                value={customDescription}
                onChange={(event) => setCustomDescription(event.target.value)}
                disabled={disabled}
              />
            </Field>
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={disabled || !customCategoryId || customName.trim().length < 2} onClick={addCustom}>
                Add to selection
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => {
                  setShowAddNew(false);
                  setCustomName("");
                  setCustomDescription("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {customServices.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {customServices.map((item) => {
              const category = catalog?.categories.find((entry) => entry.id === item.categoryId);
              return (
                <li key={item.key} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium text-slate-900">{item.name}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{category?.path.join(" / ") ?? "Subcategory"}</span>
                  </span>
                  <button
                    type="button"
                    className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-slate-800"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => onCustomServicesChange(customServices.filter((entry) => entry.key !== item.key))}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
