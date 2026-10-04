"use client";

import { useEffect, useMemo, useState } from "react";

import { Container } from "@/components/common/container";
import { AccessLevelMatrix } from "@/components/rbac/access-level-matrix";
import { RolesManager, type RbacRole } from "@/components/rbac/roles-manager";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const tabs = [
  { key: "modules", label: "Modules & Functionality" },
  { key: "accessLevels", label: "Access Levels" },
  { key: "roles", label: "Roles & Access Grants" },
] as const;

type ModuleEntity = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  subModules: Array<{
    id: string;
    code: string;
    name: string;
    functionalities: Array<{
      id: string;
      code: string;
      name: string;
      action: string;
    }>;
  }>;
};

type AccessLevel = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
};

export default function RbacAdminPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["key"]>("modules");
  const [modules, setModules] = useState<ModuleEntity[]>([]);
  const [accessLevels, setAccessLevels] = useState<AccessLevel[]>([]);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [moduleForm, setModuleForm] = useState({ name: "", code: "", description: "" });
  const [accessLevelForm, setAccessLevelForm] = useState({ name: "", code: "", description: "" });
  const [moduleDraft, setModuleDraft] = useState({ name: "", code: "", description: "" });
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

  const fetchData = () =>
    Promise.all([
      api.get<ModuleEntity[]>("/rbac/modules"),
      api.get<AccessLevel[]>("/rbac/access-levels"),
      api.get<RbacRole[]>("/rbac/roles"),
    ])
      .then(([modulesData, levelsData, rolesData]) => {
        setModules(modulesData);
        setAccessLevels(levelsData);
        setRoles(rolesData);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load RBAC data.");
      })
      .finally(() => {
        setLoading(false);
      });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    await fetchData();
  };

  const reloadRoles = async () => {
    setRoles(await api.get<RbacRole[]>("/rbac/roles"));
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const activeCount = useMemo(() => {
    if (activeTab === "modules") return modules.length;
    if (activeTab === "accessLevels") return accessLevels.length;
    return roles.length;
  }, [activeTab, modules.length, accessLevels.length, roles.length]);

  const createModule = async () => {
    try {
      setError(null);
      await api.post("/rbac/modules", {
        name: moduleForm.name,
        code: moduleForm.code,
        description: moduleForm.description || undefined,
      });
      setModuleForm({ name: "", code: "", description: "" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create module.");
    }
  };

  const createAccessLevel = async () => {
    try {
      setError(null);
      await api.post("/rbac/access-levels", {
        name: accessLevelForm.name,
        code: accessLevelForm.code,
        description: accessLevelForm.description || undefined,
      });
      setAccessLevelForm({ name: "", code: "", description: "" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create access level.");
    }
  };

  const beginEditModule = (module: ModuleEntity) => {
    setEditingModuleId(module.id);
    setModuleDraft({
      name: module.name,
      code: module.code,
      description: module.description ?? "",
    });
  };

  const saveModule = async (moduleId: string) => {
    try {
      setError(null);
      await api.patch(`/rbac/modules/${moduleId}`, {
        name: moduleDraft.name,
        code: moduleDraft.code,
        description: moduleDraft.description || undefined,
      });
      setEditingModuleId(null);
      setModuleDraft({ name: "", code: "", description: "" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update module.");
    }
  };

  const deleteModule = async (moduleId: string) => {
    try {
      setError(null);
      await api.delete(`/rbac/modules/${moduleId}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete module.");
    }
  };

  const renderModuleActions = (module: ModuleEntity) => {
    if (editingModuleId !== module.id) {
      return (
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" onClick={() => beginEditModule(module)}>
            Edit
          </Button>
          <Button type="button" variant="destructive" onClick={() => void deleteModule(module.id)}>
            Delete
          </Button>
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={moduleDraft.name}
            onChange={(e) => setModuleDraft((current) => ({ ...current, name: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={moduleDraft.code}
            onChange={(e) => setModuleDraft((current) => ({ ...current, code: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={moduleDraft.description}
            onChange={(e) => setModuleDraft((current) => ({ ...current, description: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={() => void saveModule(module.id)}>
            Save
          </Button>
          <Button type="button" variant="secondary" onClick={() => setEditingModuleId(null)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  const renderModuleBody = () => (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
        <input
          value={moduleForm.name}
          onChange={(e) => setModuleForm((current) => ({ ...current, name: e.target.value }))}
          placeholder="Module name"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <input
          value={moduleForm.code}
          onChange={(e) => setModuleForm((current) => ({ ...current, code: e.target.value }))}
          placeholder="module_code"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <input
          value={moduleForm.description}
          onChange={(e) => setModuleForm((current) => ({ ...current, description: e.target.value }))}
          placeholder="Description"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>
      <Button type="button" onClick={() => void createModule()}>
        Create module
      </Button>

      <div className="space-y-5">
        {modules.map((module) => (
          <div key={module.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">{module.name}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{module.code}</p>
              </div>
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
                {module.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            {module.subModules.length > 0 ? (
              <div className="mt-4 space-y-3">
                {module.subModules.map((subModule) => (
                  <div key={subModule.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="font-medium text-slate-900">{subModule.name}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{subModule.code}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {subModule.functionalities.map((item) => (
                        <span
                          key={item.id}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                        >
                          {item.name} · {item.action}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No submodules configured.</p>
            )}

            {renderModuleActions(module)}
          </div>
        ))}
      </div>
    </div>
  );

  const renderAccessLevelBody = () => (
    <div className="space-y-6">
      <AccessLevelMatrix modules={modules} accessLevels={accessLevels} />

      <details className="rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">
          Add a custom access level
        </summary>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
            <input
              value={accessLevelForm.name}
              onChange={(e) => setAccessLevelForm((current) => ({ ...current, name: e.target.value }))}
              placeholder="Access level name"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <input
              value={accessLevelForm.code}
              onChange={(e) => setAccessLevelForm((current) => ({ ...current, code: e.target.value }))}
              placeholder="CUSTOM_LEVEL"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <input
              value={accessLevelForm.description}
              onChange={(e) => setAccessLevelForm((current) => ({ ...current, description: e.target.value }))}
              placeholder="Description"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <Button type="button" onClick={() => void createAccessLevel()}>
            Create access level
          </Button>
        </div>
      </details>
    </div>
  );

  return (
    <Container className="py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            RBAC admin
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Access control center</h1>
        </div>
        <Button type="button" variant="secondary" onClick={() => void loadData()}>
          Refresh data
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-sky-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
          Loading RBAC metadata...
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      ) : activeTab === "roles" ? (
        <div className="mt-8">
          <RolesManager roles={roles} accessLevels={accessLevels} onRolesChanged={reloadRoles} />
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                {tabs.find((tab) => tab.key === activeTab)?.label}
              </p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {activeCount} items
              </span>
            </div>

            {activeTab === "modules" ? renderModuleBody() : null}

            {activeTab === "accessLevels" ? renderAccessLevelBody() : null}
          </div>
        </div>
      )}
    </Container>
  );
}
