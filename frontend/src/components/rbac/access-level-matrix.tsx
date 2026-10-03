"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type Flag = "canView" | "canCreate" | "canEdit" | "canDelete";
type Flags = Record<Flag, boolean>;

type MatrixModule = {
  id: string;
  code: string;
  name: string;
  subModules: Array<{
    id: string;
    code: string;
    name: string;
    functionalities: Array<{ id: string; code: string; name: string; action: string }>;
  }>;
};

type MatrixAccessLevel = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
};

type SavedPermission = Partial<Flags> & { functionalityId: string };

const columns: Array<{ flag: Flag; label: string }> = [
  { flag: "canView", label: "Read" },
  { flag: "canCreate", label: "Write" },
  { flag: "canEdit", label: "Edit" },
  { flag: "canDelete", label: "Delete" },
];

const noFlags: Flags = { canView: false, canCreate: false, canEdit: false, canDelete: false };

const presets: Record<string, { rank: number; label: string; description: string; flags: Flags }> = {
  ADMIN: {
    rank: 0,
    label: "Admin",
    description: "Full control: create, edit, delete, approve, and configure settings for this module.",
    flags: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  },
  CREATOR: {
    rank: 1,
    label: "Creator",
    description: "Can create new records and update existing ones. Cannot delete or change module settings.",
    flags: { canView: false, canCreate: true, canEdit: true, canDelete: false },
  },
  EDITOR: {
    rank: 2,
    label: "Editor",
    description: "Can view and edit existing records. Cannot create new records or delete.",
    flags: { canView: true, canCreate: false, canEdit: true, canDelete: false },
  },
  VIEWER: {
    rank: 3,
    label: "Viewer",
    description: "Read-only. Can view data and reports but cannot make any changes.",
    flags: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  },
};

function presetFor(level?: MatrixAccessLevel) {
  return level ? presets[level.code.toUpperCase()] : undefined;
}

function functionalityIds(module: MatrixModule) {
  return module.subModules.flatMap((subModule) => subModule.functionalities.map((item) => item.id));
}

function TriCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      ref={(element) => {
        if (element) {
          element.indeterminate = indeterminate;
        }
      }}
      onChange={(event) => onChange(event.target.checked)}
      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
    />
  );
}

export function AccessLevelMatrix({
  modules,
  accessLevels,
}: {
  modules: MatrixModule[];
  accessLevels: MatrixAccessLevel[];
}) {
  const sortedLevels = useMemo(
    () =>
      [...accessLevels].sort(
        (a, b) => (presetFor(a)?.rank ?? 99) - (presetFor(b)?.rank ?? 99) || a.name.localeCompare(b.name),
      ),
    [accessLevels],
  );

  const [pickedLevelId, setPickedLevelId] = useState("");
  const [pickedModuleId, setPickedModuleId] = useState("");
  const [search, setSearch] = useState("");
  const [matrix, setMatrix] = useState<{
    levelId: string;
    drafts: Record<string, Flags>;
    usingDefaults: boolean;
  } | null>(null);
  const [failedLevelId, setFailedLevelId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedLevel = sortedLevels.find((level) => level.id === pickedLevelId) ?? sortedLevels[0];
  const selectedLevelId = selectedLevel?.id ?? "";
  const selectedPreset = presetFor(selectedLevel);
  const levelLabel = selectedPreset?.label ?? selectedLevel?.name ?? "";
  const selectedModule = modules.find((module) => module.id === pickedModuleId) ?? modules[0];
  const selectedModuleId = selectedModule?.id ?? "";

  const matrixReady = matrix?.levelId === selectedLevelId;
  const drafts = matrixReady ? matrix.drafts : {};
  const usingDefaults = matrixReady && matrix.usingDefaults;
  const loadingMatrix = Boolean(selectedLevelId) && !matrixReady && failedLevelId !== selectedLevelId;

  useEffect(() => {
    if (!selectedLevelId) {
      return;
    }

    let cancelled = false;
    const defaults = presetFor(selectedLevel)?.flags ?? noFlags;
    const allIds = modules.flatMap(functionalityIds);

    api
      .get<SavedPermission[]>(`/rbac/access-levels/${selectedLevelId}/matrix`)
      .then((saved) => {
        if (cancelled) {
          return;
        }
        const savedById = new Map(saved.map((entry) => [entry.functionalityId, entry]));
        const hasSaved = saved.length > 0;
        setMatrix({
          levelId: selectedLevelId,
          usingDefaults: !hasSaved,
          drafts: Object.fromEntries(
            allIds.map((id) => {
              const entry = savedById.get(id);
              const flags: Flags = hasSaved
                ? {
                    canView: Boolean(entry?.canView),
                    canCreate: Boolean(entry?.canCreate),
                    canEdit: Boolean(entry?.canEdit),
                    canDelete: Boolean(entry?.canDelete),
                  }
                : { ...defaults };
              return [id, flags];
            }),
          ),
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFailedLevelId(selectedLevelId);
          setMessage(err instanceof Error ? err.message : "Unable to load access level permissions.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedLevelId, selectedLevel, modules]);

  const setDrafts = (update: (current: Record<string, Flags>) => Record<string, Flags>) => {
    setMatrix((current) => (current ? { ...current, drafts: update(current.drafts) } : current));
  };

  const pickLevel = (levelId: string) => {
    setPickedLevelId(levelId);
    setFailedLevelId(null);
    setMessage(null);
  };

  const aggregate = (ids: string[], flag: Flag) => {
    const granted = ids.filter((id) => drafts[id]?.[flag]).length;
    return {
      checked: ids.length > 0 && granted === ids.length,
      indeterminate: granted > 0 && granted < ids.length,
    };
  };

  const setFlag = (ids: string[], flag: Flag, value: boolean) => {
    setDrafts((current) => {
      const next = { ...current };
      for (const id of ids) {
        next[id] = { ...(next[id] ?? noFlags), [flag]: value };
      }
      return next;
    });
  };

  const applyPreset = (ids: string[]) => {
    if (!selectedPreset) {
      return;
    }
    setDrafts((current) => {
      const next = { ...current };
      for (const id of ids) {
        next[id] = { ...selectedPreset.flags };
      }
      return next;
    });
  };

  const save = async () => {
    if (!selectedLevel) {
      return;
    }
    const isAdmin = selectedLevel.code.toUpperCase() === "ADMIN";
    try {
      setSaving(true);
      setMessage(null);
      await api.put(`/rbac/access-levels/${selectedLevel.id}/matrix`, {
        permissions: Object.entries(drafts).map(([functionalityId, flags]) => {
          const full = flags.canView && flags.canCreate && flags.canEdit && flags.canDelete;
          return {
            functionalityId,
            ...flags,
            canApprove: isAdmin && full,
            canConfigure: isAdmin && full,
          };
        }),
      });
      setMatrix((current) => (current ? { ...current, usingDefaults: false } : current));
      setMessage(`${levelLabel} matrix saved.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to save access level permissions.");
    } finally {
      setSaving(false);
    }
  };

  const filteredModules = modules.filter((module) => {
    const term = search.trim().toLowerCase();
    return !term || module.name.toLowerCase().includes(term) || module.code.toLowerCase().includes(term);
  });

  const renderFlagCells = (ids: string[], labelPrefix: string) =>
    columns.map((column) => {
      const state = aggregate(ids, column.flag);
      return (
        <td key={column.flag} className="px-3 py-3 text-center">
          <TriCheckbox
            label={`${labelPrefix} ${column.label}`}
            checked={state.checked}
            indeterminate={state.indeterminate}
            disabled={ids.length === 0}
            onChange={(value) => setFlag(ids, column.flag, value)}
          />
        </td>
      );
    });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Platform-wide access level definitions
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {sortedLevels.map((level) => {
            const preset = presetFor(level);
            const active = level.id === selectedLevelId;
            return (
              <button
                key={level.id}
                type="button"
                onClick={() => pickLevel(level.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-sky-600 bg-sky-50 ring-2 ring-sky-600/20"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className="font-semibold text-slate-900">{preset?.label ?? level.name}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {preset?.description ?? level.description ?? "Custom access level."}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-semibold text-slate-900">Platform default permission matrix</p>
            <p className="mt-1 text-xs text-slate-500">
              Module → Sub Module → Functionality. Module and sub module checkboxes apply to everything beneath them.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedPreset && selectedModule ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset(functionalityIds(selectedModule))}
              >
                Apply {levelLabel} to this tree
              </Button>
            ) : null}
            {selectedPreset ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset(modules.flatMap(functionalityIds))}
              >
                Apply {levelLabel} to all modules
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={saving || loadingMatrix || !selectedLevel}
              onClick={() => void save()}
            >
              {saving ? "Saving..." : "Save matrix"}
            </Button>
          </div>
        </div>

        {usingDefaults && selectedPreset ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Nothing saved for {levelLabel} yet, so its default preset is pre-selected. Click Save matrix to keep it.
          </p>
        ) : null}
        {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search module..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <div className="mt-3 space-y-1">
              {filteredModules.map((module) => {
                const ids = functionalityIds(module);
                const granted = columns.filter((column) => aggregate(ids, column.flag).checked).length;
                const active = module.id === selectedModuleId;
                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => setPickedModuleId(module.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left transition ${
                      active ? "bg-sky-700 text-white" : "hover:bg-slate-100"
                    }`}
                  >
                    <p className="text-sm font-medium">{module.name}</p>
                    <p className={`text-xs ${active ? "text-sky-100" : "text-slate-500"}`}>
                      {module.subModules.length} sub · {granted}/{columns.length} permissions
                    </p>
                  </button>
                );
              })}
              {filteredModules.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500">No modules match your search.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            {selectedModule ? (
              <>
                <div className="border-b border-slate-200 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Module</p>
                  <p className="text-lg font-semibold text-slate-900">{selectedModule.name}</p>
                  <p className="text-xs text-slate-500">Editing defaults for {levelLabel}</p>
                </div>

                {loadingMatrix ? (
                  <p className="p-4 text-sm text-slate-500">Loading permissions...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Name</th>
                          {columns.map((column) => (
                            <th key={column.flag} className="px-3 py-3 text-center font-semibold">
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="bg-sky-50/60">
                          <td className="px-4 py-3">
                            <span className="mr-2 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sky-800">
                              Module
                            </span>
                            <span className="font-semibold text-slate-900">{selectedModule.name}</span>
                          </td>
                          {renderFlagCells(functionalityIds(selectedModule), selectedModule.name)}
                        </tr>

                        {selectedModule.subModules.map((subModule) => {
                          const subIds = subModule.functionalities.map((item) => item.id);
                          return [
                            <tr key={subModule.id}>
                              <td className="py-3 pl-8 pr-4">
                                <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                                  Sub
                                </span>
                                <span className="font-medium text-slate-800">{subModule.name}</span>
                              </td>
                              {renderFlagCells(subIds, subModule.name)}
                            </tr>,
                            ...subModule.functionalities.map((functionality) => (
                              <tr key={functionality.id}>
                                <td className="py-2.5 pl-14 pr-4 text-slate-600">
                                  {functionality.name}
                                  <span className="ml-2 text-xs text-slate-400">{functionality.code}</span>
                                </td>
                                {renderFlagCells([functionality.id], functionality.name)}
                              </tr>
                            )),
                          ];
                        })}
                      </tbody>
                    </table>

                    {functionalityIds(selectedModule).length === 0 ? (
                      <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                        This module has no functionalities yet. Add a sub module and functionality in the
                        Modules &amp; Functionality tab to set permissions here.
                      </p>
                    ) : null}
                  </div>
                )}
              </>
            ) : (
              <p className="p-4 text-sm text-slate-500">Create a module to start defining permissions.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
