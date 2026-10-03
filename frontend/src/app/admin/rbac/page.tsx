"use client";

import { useEffect, useMemo, useState } from "react";

import { Container } from "@/components/common/container";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getStoredSession } from "@/lib/auth";

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

type Role = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
  baselineAccessLevel?: { id: string; name: string; code: string } | null;
  isSystem: boolean;
  isActive: boolean;
};

export default function RbacAdminPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["key"]>("modules");
  const [modules, setModules] = useState<ModuleEntity[]>([]);
  const [accessLevels, setAccessLevels] = useState<AccessLevel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [assignMessage, setAssignMessage] = useState<string | null>(null);

  const [moduleForm, setModuleForm] = useState({ name: "", code: "", description: "" });
  const [accessLevelForm, setAccessLevelForm] = useState({ name: "", code: "", description: "" });
  const [roleForm, setRoleForm] = useState({
    name: "",
    code: "",
    description: "",
    category: "system",
    baselineAccessLevelId: "",
  });
  const [moduleDraft, setModuleDraft] = useState({ name: "", code: "", description: "" });
  const [roleDraft, setRoleDraft] = useState({
    name: "",
    code: "",
    description: "",
    category: "system",
    baselineAccessLevelId: "",
  });
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [modulesData, levelsData, rolesData] = await Promise.all([
        api.get<ModuleEntity[]>("/rbac/modules"),
        api.get<AccessLevel[]>("/rbac/access-levels"),
        api.get<Role[]>("/rbac/roles"),
      ]);

      setModules(modulesData);
      setAccessLevels(levelsData);
      setRoles(rolesData);
      if (!selectedRoleId && rolesData[0]) {
        setSelectedRoleId(rolesData[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load RBAC data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUserId(session.user.id);
    }
    void loadData();
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

  const createRole = async () => {
    try {
      setError(null);
      await api.post("/rbac/roles", {
        name: roleForm.name,
        code: roleForm.code,
        description: roleForm.description || undefined,
        category: roleForm.category || undefined,
        baselineAccessLevelId: roleForm.baselineAccessLevelId || undefined,
      });
      setRoleForm({
        name: "",
        code: "",
        description: "",
        category: "system",
        baselineAccessLevelId: "",
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create role.");
    }
  };

  const assignRoleToUser = async () => {
    if (!userId || !selectedRoleId) {
      setAssignMessage("Select a user and a role");
      return;
    }

    try {
      setAssignMessage(null);
      await api.post(`/rbac/users/${userId}/roles`, { roleId: selectedRoleId });
      setAssignMessage("Role assigned successfully.");
    } catch (err) {
      setAssignMessage(err instanceof Error ? err.message : "Unable to assign role.");
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

  const beginEditRole = (role: Role) => {
    setEditingRoleId(role.id);
    setRoleDraft({
      name: role.name,
      code: role.code,
      description: role.description ?? "",
      category: role.category ?? "system",
      baselineAccessLevelId: role.baselineAccessLevel?.id ?? "",
    });
  };

  const saveRole = async (roleId: string) => {
    try {
      setError(null);
      await api.patch(`/rbac/roles/${roleId}`, {
        name: roleDraft.name,
        code: roleDraft.code,
        description: roleDraft.description || undefined,
        category: roleDraft.category || undefined,
        baselineAccessLevelId: roleDraft.baselineAccessLevelId || undefined,
      });
      setEditingRoleId(null);
      setRoleDraft({ name: "", code: "", description: "", category: "system", baselineAccessLevelId: "" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update role.");
    }
  };

  const deleteRole = async (roleId: string) => {
    try {
      setError(null);
      await api.delete(`/rbac/roles/${roleId}`);
      if (selectedRoleId === roleId) {
        setSelectedRoleId("");
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete role.");
    }
  };

  const removeUserRole = async (roleId: string) => {
    if (!userId) {
      setAssignMessage("User ID is required to remove a role.");
      return;
    }

    try {
      setAssignMessage(null);
      await api.delete(`/rbac/users/${userId}/roles/${roleId}`);
      setAssignMessage("Role removed successfully.");
    } catch (err) {
      setAssignMessage(err instanceof Error ? err.message : "Unable to remove role.");
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

  const renderRoleActions = (role: Role) => {
    if (editingRoleId !== role.id) {
      return (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => beginEditRole(role)}>
            Edit
          </Button>
          {!role.isSystem ? (
            <Button type="button" variant="destructive" onClick={() => void deleteRole(role.id)}>
              Delete
            </Button>
          ) : null}
          {userId ? (
            <Button type="button" variant="secondary" onClick={() => void removeUserRole(role.id)}>
              Remove from user
            </Button>
          ) : null}
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={roleDraft.name}
            onChange={(e) => setRoleDraft((current) => ({ ...current, name: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={roleDraft.code}
            onChange={(e) => setRoleDraft((current) => ({ ...current, code: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={roleDraft.category}
            onChange={(e) => setRoleDraft((current) => ({ ...current, category: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={roleDraft.baselineAccessLevelId}
            onChange={(e) => setRoleDraft((current) => ({ ...current, baselineAccessLevelId: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Choose access level</option>
            {accessLevels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
        </div>
        <input
          value={roleDraft.description}
          onChange={(e) => setRoleDraft((current) => ({ ...current, description: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <Button type="button" onClick={() => void saveRole(role.id)}>
            Save
          </Button>
          <Button type="button" variant="secondary" onClick={() => setEditingRoleId(null)}>
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

  const renderRoleBody = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={roleForm.name}
            onChange={(e) => setRoleForm((current) => ({ ...current, name: e.target.value }))}
            placeholder="Role name"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <input
            value={roleForm.code}
            onChange={(e) => setRoleForm((current) => ({ ...current, code: e.target.value }))}
            placeholder="SUPER_ADMIN"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <input
            value={roleForm.category}
            onChange={(e) => setRoleForm((current) => ({ ...current, category: e.target.value }))}
            placeholder="system"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <select
            value={roleForm.baselineAccessLevelId}
            onChange={(e) => setRoleForm((current) => ({ ...current, baselineAccessLevelId: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Choose access level</option>
            {accessLevels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4">
          <input
            value={roleForm.description}
            onChange={(e) => setRoleForm((current) => ({ ...current, description: e.target.value }))}
            placeholder="Role description"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div className="mt-4">
          <Button type="button" onClick={() => void createRole()}>
            Create role
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Assign role to user
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-[1.3fr_1fr_auto]">
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User UUID"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Choose role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <Button type="button" onClick={() => void assignRoleToUser()}>
            Assign
          </Button>
        </div>
        {assignMessage ? <p className="mt-3 text-sm text-slate-700">{assignMessage}</p> : null}
      </div>

      <div className="space-y-4">
        {roles.map((role) => (
          <div key={role.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">{role.name}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{role.code}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                {role.isSystem ? "System" : "Custom"}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
              {role.category ? <span className="rounded-full bg-white px-2 py-1">{role.category}</span> : null}
              {role.baselineAccessLevel ? (
                <span className="rounded-full bg-white px-2 py-1">Baseline: {role.baselineAccessLevel.name}</span>
              ) : null}
            </div>

            {renderRoleActions(role)}
          </div>
        ))}
      </div>
    </div>
  );

  const renderAccessLevelBody = () => (
    <div className="space-y-6">
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
          placeholder="VIEWER"
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

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        Access level editing and deletion are not yet exposed in the backend contract, so this view is focused on creation and listing.
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {accessLevels.map((level) => (
          <div key={level.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{level.name}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{level.code}</p>
              </div>
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                {level.isSystem ? "System" : "Custom"}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-600">{level.description ?? "No description provided."}</p>
          </div>
        ))}
      </div>
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

            {activeTab === "roles" ? renderRoleBody() : null}
          </div>
        </div>
      )}
    </Container>
  );
}
