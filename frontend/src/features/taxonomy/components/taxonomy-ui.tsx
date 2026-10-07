"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Pencil, Plus, Power, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { hasPermission } from "@/features/organizations/utils/permissions";

import type { ActiveFilter, DeleteOutcome } from "../types";

export type TaxonomyPermissions = { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };

/** Taxonomy is platform master data, so access comes from the user's global roles. */
export function useTaxonomyPermissions(functionalityCode: string): TaxonomyPermissions {
  const { me } = useOrganizations();
  const permissions = me?.permissions;
  return {
    canView: hasPermission(permissions, functionalityCode, "view"),
    canCreate: hasPermission(permissions, functionalityCode, "create"),
    canEdit: hasPermission(permissions, functionalityCode, "edit"),
    canDelete: hasPermission(permissions, functionalityCode, "delete"),
  };
}

export function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function TaxonomyToolbar({
  search,
  onSearchChange,
  active,
  onActiveChange,
  createLabel,
  onCreate,
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  active: ActiveFilter;
  onActiveChange: (value: ActiveFilter) => void;
  createLabel: string;
  onCreate?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            type="search"
            aria-label="Search"
            placeholder="Search..."
            className="pl-9"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <Select
          aria-label="Status filter"
          className="sm:w-40"
          value={active}
          onChange={(event) => onActiveChange(event.target.value as ActiveFilter)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        {children}
      </div>
      {onCreate ? (
        <Button type="button" onClick={onCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {createLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function ActiveBadge({ active, effectiveActive = active }: { active: boolean; effectiveActive?: boolean }) {
  if (!active) return <Badge tone="neutral">Inactive</Badge>;
  if (!effectiveActive) return <Badge tone="warning">Parent inactive</Badge>;
  return <Badge tone="success">Active</Badge>;
}

export function RowActions({
  permissions,
  active,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  permissions: TaxonomyPermissions;
  active: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  if (!permissions.canEdit && !permissions.canDelete) return null;
  return (
    <div className="flex justify-end gap-1">
      {permissions.canEdit ? (
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label="Edit">
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onToggleActive}>
            <Power className="h-4 w-4" aria-hidden="true" />
            {active ? "Deactivate" : "Activate"}
          </Button>
        </>
      ) : null}
      {permissions.canDelete ? (
        <Button type="button" variant="ghost" size="sm" onClick={onDelete} aria-label="Delete" className="text-red-600 hover:bg-red-50">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}

export function Notice({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
      <p>{message}</p>
      <button type="button" onClick={onDismiss} className="text-sky-700 hover:underline">
        Dismiss
      </button>
    </div>
  );
}

export function deleteOutcomeMessage(label: string, outcome: DeleteOutcome) {
  return outcome.deleted
    ? `${label} was deleted.`
    : `${label} is still referenced, so it was deactivated instead of deleted.`;
}

export function TableShell({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {headers.map((header, index) => (
              <th key={header || index} scope="col" className={index === headers.length - 1 ? "px-4 py-3 text-right" : "px-4 py-3"}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

/** Reads an optional numeric form field: "" means "not set". */
export function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}
