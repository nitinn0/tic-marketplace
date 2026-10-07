"use client";

import { useState, type FormEvent } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { ConfirmDialog, type ConfirmRequest } from "@/features/organizations/components/confirm-dialog";
import { useApiResource } from "@/features/organizations/hooks/use-api-resource";
import { MARKETPLACE_FUNCTIONALITIES as M } from "@/features/organizations/utils/permissions";

import { taxonomyService } from "../services/taxonomy.service";
import type { ActiveFilter, LocationInput, TaxonomyLocation } from "../types";
import { locationLevelLabels } from "../utils/labels";
import {
  ActiveBadge,
  deleteOutcomeMessage,
  FormError,
  Notice,
  parseOptionalNumber,
  RowActions,
  TableShell,
  TaxonomyToolbar,
  useDebouncedValue,
  useTaxonomyPermissions,
} from "./taxonomy-ui";

export function LocationsPanel() {
  const permissions = useTaxonomyPermissions(M.locations);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<ActiveFilter>("all");
  const [editing, setEditing] = useState<TaxonomyLocation | "new" | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const list = useApiResource(() => taxonomyService.locations.list({ search: debouncedSearch, active }), [debouncedSearch, active]);

  const toggleActive = async (location: TaxonomyLocation) => {
    try {
      await taxonomyService.locations.update(location.id, { active: !location.active });
      setNotice(`${location.label} is now ${location.active ? "inactive" : "active"}.`);
      await list.reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Unable to update the location");
    }
  };

  return (
    <div className="space-y-4">
      <TaxonomyToolbar
        search={search}
        onSearchChange={setSearch}
        active={active}
        onActiveChange={setActive}
        createLabel="New location"
        onCreate={permissions.canCreate ? () => setEditing("new") : undefined}
      />

      <Notice message={notice} onDismiss={() => setNotice(null)} />

      {list.loading ? (
        <LoadingState label="Loading locations..." />
      ) : list.error ? (
        <ErrorState title="Unable to load locations" description={list.error} />
      ) : !list.data?.length ? (
        <EmptyState title="No locations found" description="Adjust the filters or create a location." />
      ) : (
        <TableShell headers={["Location", "Level", "Postal code", "Providers", "Status", ""]}>
          {list.data.map((location) => (
            <tr key={location.id} className="align-top">
              <td className="px-4 py-3 font-medium text-slate-900">{location.label}</td>
              <td className="px-4 py-3">
                <Badge tone="info">{locationLevelLabels[location.level]}</Badge>
              </td>
              <td className="px-4 py-3 text-slate-700">{location.postalCode ?? "—"}</td>
              <td className="px-4 py-3 text-slate-700">{location.providerCount}</td>
              <td className="px-4 py-3">
                <ActiveBadge active={location.active} />
              </td>
              <td className="px-4 py-3">
                <RowActions
                  permissions={permissions}
                  active={location.active}
                  onEdit={() => setEditing(location)}
                  onToggleActive={() => void toggleActive(location)}
                  onDelete={() =>
                    setConfirm({
                      title: `Delete ${location.label}?`,
                      description: "Locations covered by providers are deactivated instead of deleted.",
                      confirmLabel: "Delete",
                      destructive: true,
                      action: async () => {
                        const outcome = await taxonomyService.locations.remove(location.id);
                        setNotice(deleteOutcomeMessage(location.label, outcome));
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
        <LocationFormDialog
          location={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async (saved) => {
            setEditing(null);
            setNotice(`${saved.label} was saved.`);
            await list.reload();
          }}
        />
      ) : null}
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

function LocationFormDialog({
  location,
  onClose,
  onSaved,
}: {
  location: TaxonomyLocation | null;
  onClose: () => void;
  onSaved: (location: TaxonomyLocation) => void;
}) {
  const [form, setForm] = useState({
    countryCode: location?.countryCode ?? "IN",
    state: location?.state ?? "",
    city: location?.city ?? "",
    postalCode: location?.postalCode ?? "",
    latitude: location?.latitude?.toString() ?? "",
    longitude: location?.longitude?.toString() ?? "",
    active: location?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const latitude = parseOptionalNumber(form.latitude);
    const longitude = parseOptionalNumber(form.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError("Latitude and longitude must be numbers.");
      return;
    }

    const input: LocationInput = {
      countryCode: form.countryCode.trim().toUpperCase(),
      state: form.state.trim() || null,
      city: form.city.trim() || null,
      postalCode: form.postalCode.trim() || null,
      latitude,
      longitude,
      active: form.active,
    };

    setSaving(true);
    try {
      onSaved(location ? await taxonomyService.locations.update(location.id, input) : await taxonomyService.locations.create(input));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the location");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={location ? `Edit ${location.label}` : "New location"}
      description="Leave state empty for country-wide coverage and city empty for state-wide coverage."
      className="max-w-2xl"
    >
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Country code" htmlFor="location-country" hint="ISO 3166-1 alpha-2, e.g. IN.">
          <Input
            id="location-country"
            required
            maxLength={2}
            pattern="[A-Za-z]{2}"
            value={form.countryCode}
            onChange={(event) => update("countryCode", event.target.value)}
          />
        </Field>
        <Field label="State" htmlFor="location-state">
          <Input id="location-state" maxLength={100} value={form.state} onChange={(event) => update("state", event.target.value)} />
        </Field>
        <Field label="City" htmlFor="location-city" hint="Requires a state.">
          <Input id="location-city" maxLength={100} value={form.city} onChange={(event) => update("city", event.target.value)} />
        </Field>
        <Field label="Postal code" htmlFor="location-postal" hint="Requires a city.">
          <Input id="location-postal" maxLength={20} value={form.postalCode} onChange={(event) => update("postalCode", event.target.value)} />
        </Field>
        <Field label="Latitude" htmlFor="location-lat">
          <Input id="location-lat" inputMode="decimal" value={form.latitude} onChange={(event) => update("latitude", event.target.value)} />
        </Field>
        <Field label="Longitude" htmlFor="location-lng">
          <Input id="location-lng" inputMode="decimal" value={form.longitude} onChange={(event) => update("longitude", event.target.value)} />
        </Field>
        <div className="md:col-span-2">
          <Checkbox id="location-active" label="Active" checked={form.active} onChange={(checked) => update("active", checked)} />
        </div>
        <div className="md:col-span-2">
          <FormError message={error} />
        </div>
        <div className="flex justify-end gap-3 md:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save location"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
