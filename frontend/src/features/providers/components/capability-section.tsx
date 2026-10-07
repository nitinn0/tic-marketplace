"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type CapabilityOption = {
  id: string;
  label: string;
  detail?: string;
  /** Options with the same group are listed under one heading. */
  group?: string;
  depth?: number;
  /** Assigned earlier but no longer active in the taxonomy; it can be kept or removed, not newly added. */
  inactive?: boolean;
};

/** Catalog options plus already-assigned entries that are no longer in the active catalog. */
export function mergeOptions(catalog: CapabilityOption[], assigned: CapabilityOption[]) {
  const known = new Set(catalog.map((option) => option.id));
  return [...catalog, ...assigned.filter((option) => !known.has(option.id)).map((option) => ({ ...option, inactive: true }))];
}

export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function CapabilitySection({
  title,
  description,
  emptyText,
  assigned,
  options,
  canEdit,
  onSave,
}: {
  title: string;
  description: string;
  emptyText: string;
  assigned: CapabilityOption[];
  options: CapabilityOption[];
  canEdit: boolean;
  onSave: (ids: string[]) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <SectionCard
      title={title}
      description={description}
      action={
        canEdit && !editing ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </Button>
        ) : null
      }
    >
      {editing ? (
        <CapabilityEditor
          assigned={assigned}
          options={mergeOptions(options, assigned)}
          onCancel={() => setEditing(false)}
          onSave={async (ids) => {
            await onSave(ids);
            setEditing(false);
          }}
        />
      ) : assigned.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {assigned.map((item) => (
            <li key={item.id}>
              <Badge tone={item.inactive ? "warning" : "info"} className="text-sm">
                {item.label}
                {item.inactive ? " (inactive)" : ""}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function CapabilityEditor({
  assigned,
  options,
  onCancel,
  onSave,
}: {
  assigned: CapabilityOption[];
  options: CapabilityOption[];
  onCancel: () => void;
  onSave: (ids: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState(() => new Set(assigned.map((item) => item.id)));
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const visible = needle
      ? options.filter((option) => `${option.label} ${option.detail ?? ""} ${option.group ?? ""}`.toLowerCase().includes(needle))
      : options;
    const result = new Map<string, CapabilityOption[]>();
    for (const option of visible) {
      const key = option.group ?? "";
      result.set(key, [...(result.get(key) ?? []), option]);
    }
    return [...result.entries()];
  }, [options, filter]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave([...selected]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input type="search" aria-label="Filter options" placeholder="Filter..." value={filter} onChange={(event) => setFilter(event.target.value)} />
      <div className="max-h-96 space-y-4 overflow-y-auto rounded-xl border border-slate-100 p-3">
        {groups.length === 0 ? <p className="text-sm text-slate-500">No matching options.</p> : null}
        {groups.map(([group, groupOptions]) => (
          <fieldset key={group || "all"}>
            {group ? <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</legend> : null}
            <div className="space-y-1">
              {groupOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                  style={option.depth ? { paddingLeft: `${0.5 + option.depth * 1.25}rem` } : undefined}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                    checked={selected.has(option.id)}
                    disabled={option.inactive && !selected.has(option.id)}
                    onChange={() => toggle(option.id)}
                  />
                  <span>
                    <span className="text-slate-900">{option.label}</span>
                    {option.detail ? <span className="ml-2 text-slate-500">{option.detail}</span> : null}
                    {option.inactive ? <span className="ml-2 text-amber-700">(inactive)</span> : null}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{selected.size} selected</p>
        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
