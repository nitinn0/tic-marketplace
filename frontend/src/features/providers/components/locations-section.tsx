"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { locationLevelLabels } from "@/features/taxonomy/utils/labels";

import type { CoverageType, LocationSelection, LocationSummary, ProviderLocationItem } from "../types";
import { COVERAGE_TYPES, coverageTypeLabels } from "../utils/labels";
import { SectionCard } from "./capability-section";

export function LocationsSection({
  assigned,
  catalog,
  canEdit,
  onSave,
}: {
  assigned: ProviderLocationItem[];
  catalog: LocationSummary[];
  canEdit: boolean;
  onSave: (locations: LocationSelection[]) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <SectionCard
      title="Locations"
      description="Where you deliver services. A country-level entry means nationwide coverage."
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
        <LocationsEditor
          assigned={assigned}
          catalog={catalog}
          onCancel={() => setEditing(false)}
          onSave={async (locations) => {
            await onSave(locations);
            setEditing(false);
          }}
        />
      ) : assigned.length === 0 ? (
        <p className="text-sm text-slate-500">No locations added yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {assigned.map((location) => (
            <li key={location.id} className="flex items-center justify-between gap-4 py-2 text-sm">
              <span className="text-slate-900">
                {location.label}
                {!location.active ? <span className="ml-2 text-amber-700">(inactive)</span> : null}
              </span>
              <span className="flex gap-2">
                <Badge>{locationLevelLabels[location.level]}</Badge>
                {location.coverageType ? <Badge tone="info">{coverageTypeLabels[location.coverageType]}</Badge> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function LocationsEditor({
  assigned,
  catalog,
  onCancel,
  onSave,
}: {
  assigned: ProviderLocationItem[];
  catalog: LocationSummary[];
  onCancel: () => void;
  onSave: (locations: LocationSelection[]) => Promise<void>;
}) {
  const [selection, setSelection] = useState(
    () => new Map(assigned.map((location) => [location.id, location.coverageType] as const)),
  );
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => {
    const known = new Set(catalog.map((location) => location.id));
    const all = [...catalog, ...assigned.filter((location) => !known.has(location.id))];
    const needle = filter.trim().toLowerCase();
    return needle ? all.filter((location) => location.label.toLowerCase().includes(needle)) : all;
  }, [catalog, assigned, filter]);

  const toggle = (location: LocationSummary) =>
    setSelection((current) => {
      const next = new Map(current);
      if (next.has(location.id)) next.delete(location.id);
      else next.set(location.id, null);
      return next;
    });

  const setCoverage = (locationId: string, coverageType: CoverageType | null) =>
    setSelection((current) => new Map(current).set(locationId, coverageType));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave([...selection].map(([locationId, coverageType]) => ({ locationId, coverageType })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input type="search" aria-label="Filter locations" placeholder="Filter..." value={filter} onChange={(event) => setFilter(event.target.value)} />
      <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100">
        {options.map((location) => {
          const checked = selection.has(location.id);
          return (
            <li key={location.id} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={checked}
                  disabled={!location.active && !checked}
                  onChange={() => toggle(location)}
                />
                <span className="text-slate-900">{location.label}</span>
                <span className="text-xs text-slate-500">{locationLevelLabels[location.level]}</span>
                {!location.active ? <span className="text-xs text-amber-700">(inactive)</span> : null}
              </label>
              {checked ? (
                <Select
                  aria-label={`Coverage for ${location.label}`}
                  className="sm:w-44"
                  value={selection.get(location.id) ?? ""}
                  onChange={(event) => setCoverage(location.id, (event.target.value || null) as CoverageType | null)}
                >
                  <option value="">Coverage not set</option>
                  {COVERAGE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {coverageTypeLabels[type]}
                    </option>
                  ))}
                </Select>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{selection.size} selected</p>
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
