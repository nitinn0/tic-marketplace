"use client";

import { useEffect, useMemo, useState } from "react";

import { Container } from "@/components/common/container";
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load RBAC data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const activeCount = useMemo(() => {
    if (activeTab === "modules") return modules.length;
    if (activeTab === "accessLevels") return accessLevels.length;
    return roles.length;
  }, [activeTab, modules.length, accessLevels.length, roles.length]);

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
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              {tabs.find((tab) => tab.key === activeTab)?.label}
            </p>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {activeCount} items
            </span>
          </div>

          {activeTab === "modules" ? (
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
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === "accessLevels" ? (
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
                  <p className="mt-3 text-sm text-slate-600">
                    {level.description ?? "No description provided."}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === "roles" ? (
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
                      <span className="rounded-full bg-white px-2 py-1">
                        Baseline: {role.baselineAccessLevel.name}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </Container>
  );
}
