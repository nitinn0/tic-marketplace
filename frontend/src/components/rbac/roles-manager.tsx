"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export type RbacRoleUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  assignedAt: string;
};

export type RbacRole = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
  organizationType?: string | null;
  baselineAccessLevel?: { id: string; name: string; code: string } | null;
  isSystem: boolean;
  isActive: boolean;
  users?: RbacRoleUser[];
};

type AccessLevelOption = { id: string; name: string };

type AppUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
};

type RolePermissionEntry = {
  functionalityId: string;
  accessLevelId?: string | null;
  canView?: boolean | null;
  canCreate?: boolean | null;
  canEdit?: boolean | null;
  canDelete?: boolean | null;
  canApprove?: boolean | null;
  canConfigure?: boolean | null;
  functionality?: {
    code: string;
    name: string;
    action: string;
    subModule?: { name: string; module?: { name: string } | null } | null;
  } | null;
};

type PermissionFlag = "canView" | "canCreate" | "canEdit" | "canDelete" | "canApprove" | "canConfigure";

type PermissionDraft = {
  functionalityId: string;
  functionalityName: string;
  action: string;
  moduleName: string;
  subModuleName: string;
  accessLevelId: string | null;
} & Record<PermissionFlag, boolean>;

type RoleDraft = {
  name: string;
  description: string;
  isActive: boolean;
  category: string;
  organizationType: string;
  baselineAccessLevelId: string;
};

type Notice = { tone: "success" | "error"; text: string };

const NEW_ROLE = "__new__";

const categoryOptions = [
  { value: "system", label: "System" },
  { value: "platform", label: "Platform" },
  { value: "institute", label: "Institute Admin" },
  { value: "support", label: "Support" },
  { value: "content", label: "Content" },
  { value: "evaluation", label: "Evaluation" },
  { value: "organization", label: "Organization" },
  { value: "professional", label: "Professional" },
];

// Roles with an organization type are organization-scoped and assigned through organization membership.
const organizationTypeOptions = [
  { value: "BUYER", label: "Buyer organization" },
  { value: "PROVIDER", label: "Provider organization" },
];

const permissionColumns: Array<{ flag: PermissionFlag; label: string }> = [
  { flag: "canView", label: "View" },
  { flag: "canCreate", label: "Create" },
  { flag: "canEdit", label: "Edit" },
  { flag: "canDelete", label: "Delete" },
  { flag: "canApprove", label: "Approve" },
  { flag: "canConfigure", label: "Configure" },
];

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-600";

function draftFromRole(role: RbacRole | null): RoleDraft {
  return {
    name: role?.name ?? "",
    description: role?.description ?? "",
    isActive: role?.isActive ?? true,
    category: role?.category ?? "",
    organizationType: role?.organizationType ?? "",
    baselineAccessLevelId: role?.baselineAccessLevel?.id ?? "",
  };
}

function toRoleCode(source: string, existingCodes: Set<string>) {
  const base =
    source
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "ROLE";
  let code = base;
  for (let suffix = 2; existingCodes.has(code); suffix += 1) {
    code = `${base}_${suffix}`;
  }
  return code;
}

function categoryLabel(value: string) {
  return categoryOptions.find((option) => option.value === value)?.label ?? value;
}

function roleSubtitle(role: RbacRole) {
  const count = role.users?.length ?? 0;
  const parts = [
    `${count} ${count === 1 ? "user" : "users"}${role.organizationType ? ` (${role.organizationType})` : ""}`,
  ];
  if (role.isSystem) parts.push("System");
  if (role.category && role.category !== "system") parts.push(categoryLabel(role.category));
  return parts.join(" · ");
}

function userDisplayName(user: { firstName: string; lastName: string; email: string }) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
}

function errorText(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function NoticeLine({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  return (
    <p className={`text-sm ${notice.tone === "success" ? "text-emerald-700" : "text-red-700"}`}>{notice.text}</p>
  );
}

type RolesManagerProps = {
  roles: RbacRole[];
  accessLevels: AccessLevelOption[];
  onRolesChanged: () => Promise<void>;
};

export function RolesManager({ roles, accessLevels, onRolesChanged }: RolesManagerProps) {
  const [selectedId, setSelectedId] = useState("");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersVersion, setUsersVersion] = useState(0);
  const [listNotice, setListNotice] = useState<Notice | null>(null);

  const customRoles = roles.filter((role) => !role.isSystem);
  const systemRoles = roles.filter((role) => role.isSystem);
  const firstRoleId = customRoles[0]?.id ?? systemRoles[0]?.id ?? NEW_ROLE;
  const activeId =
    selectedId === NEW_ROLE || roles.some((role) => role.id === selectedId) ? selectedId : firstRoleId;
  const activeRole = roles.find((role) => role.id === activeId) ?? null;

  useEffect(() => {
    let cancelled = false;
    api
      .get<AppUser[]>("/rbac/users")
      .then((data) => {
        if (cancelled) return;
        setUsers(data);
        setUsersError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setUsersError(errorText(err, "Unable to load users."));
      });
    return () => {
      cancelled = true;
    };
  }, [usersVersion]);

  const deleteRole = async (role: RbacRole) => {
    if (!window.confirm(`Delete the ${role.name} role? Users will lose any access granted by it.`)) {
      return;
    }

    try {
      setListNotice(null);
      await api.delete(`/rbac/roles/${role.id}`);
      if (activeId === role.id) {
        setSelectedId("");
      }
      await onRolesChanged();
    } catch (err) {
      setListNotice({ tone: "error", text: errorText(err, "Unable to delete role.") });
    }
  };

  const renderRoleItem = (role: RbacRole) => {
    const isActive = role.id === activeId;
    return (
      <li key={role.id}>
        <div
          className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 transition ${
            isActive ? "border-sky-200 bg-sky-50" : "border-transparent hover:bg-slate-50"
          }`}
        >
          <button type="button" onClick={() => setSelectedId(role.id)} className="min-w-0 flex-1 text-left">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-slate-900">{role.name}</span>
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${role.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
                title={role.isActive ? "Active" : "Inactive"}
              />
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">{roleSubtitle(role)}</span>
          </button>
          <button
            type="button"
            disabled={role.isSystem}
            onClick={() => void deleteRole(role)}
            title={role.isSystem ? "System roles cannot be deleted" : `Delete ${role.name}`}
            className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Del
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Roles</h2>
          <Button type="button" size="sm" onClick={() => setSelectedId(NEW_ROLE)}>
            <Plus className="h-4 w-4" />
            New Role
          </Button>
        </div>

        {listNotice ? (
          <div className="mt-3">
            <NoticeLine notice={listNotice} />
          </div>
        ) : null}

        <ul className="mt-4 space-y-1">{customRoles.map(renderRoleItem)}</ul>
        {customRoles.length === 0 ? (
          <p className="px-1 text-sm text-slate-500">No custom roles yet.</p>
        ) : null}

        {systemRoles.length > 0 ? (
          <>
            <p className="mb-2 mt-6 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              System roles
            </p>
            <ul className="space-y-1">{systemRoles.map(renderRoleItem)}</ul>
          </>
        ) : null}
      </aside>

      <RoleDetailsPanel
        key={activeId}
        role={activeRole}
        roles={roles}
        accessLevels={accessLevels}
        users={users}
        usersError={usersError}
        onSaved={async (roleId) => {
          setSelectedId(roleId);
          await onRolesChanged();
        }}
        onDeleted={async () => {
          setSelectedId("");
          await onRolesChanged();
        }}
        onCancelNew={() => setSelectedId("")}
        onUsersChanged={async () => {
          setUsersVersion((current) => current + 1);
          await onRolesChanged();
        }}
      />
    </div>
  );
}

type RoleDetailsPanelProps = {
  role: RbacRole | null;
  roles: RbacRole[];
  accessLevels: AccessLevelOption[];
  users: AppUser[];
  usersError: string | null;
  onSaved: (roleId: string) => Promise<void>;
  onDeleted: () => Promise<void>;
  onCancelNew: () => void;
  onUsersChanged: () => Promise<void>;
};

function RoleDetailsPanel({
  role,
  roles,
  accessLevels,
  users,
  usersError,
  onSaved,
  onDeleted,
  onCancelNew,
  onUsersChanged,
}: RoleDetailsPanelProps) {
  const isNew = !role;
  const [draft, setDraft] = useState<RoleDraft>(() => draftFromRole(role));
  const [isEditing, setIsEditing] = useState(isNew);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [tab, setTab] = useState<"permissions" | "users">("users");

  const existingCodes = useMemo(() => new Set(roles.map((item) => item.code)), [roles]);

  const categoryChoices =
    draft.category && !categoryOptions.some((option) => option.value === draft.category)
      ? [...categoryOptions, { value: draft.category, label: draft.category }]
      : categoryOptions;

  const organizationTypeChoices =
    draft.organizationType && !organizationTypeOptions.some((option) => option.value === draft.organizationType)
      ? [...organizationTypeOptions, { value: draft.organizationType, label: `${draft.organizationType} (unsupported)` }]
      : organizationTypeOptions;

  const updateDraft = <K extends keyof RoleDraft>(key: K, value: RoleDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const saveRole = async () => {
    const name = draft.name.trim();
    if (name.length < 2) {
      setNotice({ tone: "error", text: "Role name must be at least 2 characters." });
      return;
    }

    const payload = {
      name,
      description: draft.description.trim(),
      category: draft.category,
      organizationType: draft.organizationType,
      baselineAccessLevelId: draft.baselineAccessLevelId || undefined,
      isActive: draft.isActive,
    };

    try {
      setBusy(true);
      setNotice(null);
      if (isNew) {
        const created = await api.post<RbacRole>("/rbac/roles", {
          ...payload,
          code: toRoleCode(name, existingCodes),
        });
        await onSaved(created.id);
      } else {
        await api.patch(`/rbac/roles/${role.id}`, payload);
        setIsEditing(false);
        setNotice({ tone: "success", text: "Role updated." });
        await onSaved(role.id);
      }
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Unable to save role.") });
    } finally {
      setBusy(false);
    }
  };

  const cancelEdit = () => {
    if (isNew) {
      onCancelNew();
      return;
    }
    setDraft(draftFromRole(role));
    setIsEditing(false);
    setNotice(null);
  };

  const duplicateRole = async () => {
    if (!role) return;

    try {
      setBusy(true);
      setNotice(null);
      const created = await api.post<RbacRole>("/rbac/roles", {
        name: `${role.name} (copy)`,
        code: toRoleCode(`${role.code}_COPY`, existingCodes),
        description: role.description || undefined,
        category: role.category || undefined,
        organizationType: role.organizationType || undefined,
        baselineAccessLevelId: role.baselineAccessLevel?.id,
        isActive: role.isActive,
      });

      const permissions = await api.get<RolePermissionEntry[]>(`/rbac/roles/${role.id}/permissions`);
      if (permissions.length > 0) {
        await api.put(`/rbac/roles/${created.id}/permissions`, {
          permissions: permissions.map((entry) => ({
            functionalityId: entry.functionalityId,
            accessLevelId: entry.accessLevelId ?? undefined,
            canView: entry.canView ?? null,
            canCreate: entry.canCreate ?? null,
            canEdit: entry.canEdit ?? null,
            canDelete: entry.canDelete ?? null,
            canApprove: entry.canApprove ?? null,
            canConfigure: entry.canConfigure ?? null,
          })),
        });
      }

      await onSaved(created.id);
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Unable to duplicate role.") });
      setBusy(false);
    }
  };

  const deleteRole = async () => {
    if (!role) return;
    if (!window.confirm(`Delete the ${role.name} role? Users will lose any access granted by it.`)) {
      return;
    }

    try {
      setBusy(true);
      await api.delete(`/rbac/roles/${role.id}`);
      await onDeleted();
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Unable to delete role.") });
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">{isNew ? "New role" : "Role details"}</h2>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-start">
        <div className="md:flex-1">
          <input
            value={draft.name}
            onChange={(e) => updateDraft("name", e.target.value)}
            disabled={!isEditing}
            placeholder="Role name"
            className={fieldClass}
          />
          {role ? (
            <p className="mt-1 text-xs text-slate-500">
              Code: {role.code}
              {role.isSystem ? " · System role" : ""}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <Button type="button" onClick={() => void saveRole()} disabled={busy}>
                {busy ? "Saving..." : isNew ? "Create role" : "Save"}
              </Button>
              <Button type="button" variant="outline" onClick={cancelEdit} disabled={busy}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button type="button" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button type="button" variant="outline" onClick={() => void duplicateRole()} disabled={busy}>
                Duplicate
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void deleteRole()}
                disabled={busy || role?.isSystem}
                title={role?.isSystem ? "System roles cannot be deleted" : undefined}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                Delete role
              </Button>
            </>
          )}
        </div>
      </div>

      <textarea
        value={draft.description}
        onChange={(e) => updateDraft("description", e.target.value)}
        disabled={!isEditing}
        rows={3}
        placeholder="Description (optional)"
        className={`${fieldClass} mt-4 resize-y`}
      />

      <div className="mt-4 flex items-center gap-3">
        <select
          value={draft.isActive ? "active" : "inactive"}
          onChange={(e) => updateDraft("isActive", e.target.value === "active")}
          disabled={!isEditing}
          className={`${fieldClass} w-auto`}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="text-sm text-slate-600">Status</span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Role category</span>
          <select
            value={draft.category}
            onChange={(e) => updateDraft("category", e.target.value)}
            disabled={!isEditing}
            className={fieldClass}
          >
            <option value="">Select category...</option>
            {categoryChoices.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Organization type</span>
          <select
            value={draft.organizationType}
            onChange={(e) => updateDraft("organizationType", e.target.value)}
            disabled={!isEditing}
            className={fieldClass}
          >
            <option value="">Global role (not organization scoped)</option>
            {organizationTypeChoices.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Access level baseline</span>
          <select
            value={draft.baselineAccessLevelId}
            onChange={(e) => updateDraft("baselineAccessLevelId", e.target.value)}
            disabled={!isEditing}
            className={fieldClass}
          >
            <option value="">Choose access level</option>
            {accessLevels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
          <span className="mt-1.5 block text-xs text-slate-500">
            New roles can inherit the platform default matrix for this level, then override below.
          </span>
        </label>
      </div>

      {notice ? (
        <div className="mt-4">
          <NoticeLine notice={notice} />
        </div>
      ) : null}

      {role ? (
        <>
          <div className="mt-8 border-b border-slate-200">
            <nav className="-mb-px flex gap-6">
              {(
                [
                  { key: "permissions", label: "Permissions" },
                  { key: "users", label: `Users (${role.users?.length ?? 0})` },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${
                    tab === item.key
                      ? "border-sky-700 text-sky-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-5">
            {tab === "users" ? (
              <RoleUsersTab
                role={role}
                users={users}
                usersError={usersError}
                onAssignmentsSaved={() => onSaved(role.id)}
                onUsersChanged={onUsersChanged}
              />
            ) : (
              <RolePermissionsTab roleId={role.id} />
            )}
          </div>
        </>
      ) : (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          Create the role first, then configure its permissions and assign users.
        </p>
      )}
    </section>
  );
}

type RoleUsersTabProps = {
  role: RbacRole;
  users: AppUser[];
  usersError: string | null;
  onAssignmentsSaved: () => Promise<void>;
  onUsersChanged: () => Promise<void>;
};

function RoleUsersTab({ role, users, usersError, onAssignmentsSaved, onUsersChanged }: RoleUsersTabProps) {
  const assignedIds = useMemo(() => new Set((role.users ?? []).map((user) => user.id)), [role.users]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(assignedIds));
  const [search, setSearch] = useState("");
  const [showAssignedOnly, setShowAssignedOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [newUser, setNewUser] = useState({ email: "", password: "" });
  const [creating, setCreating] = useState(false);
  const [createNotice, setCreateNotice] = useState<Notice | null>(null);

  const isDirty =
    selectedIds.size !== assignedIds.size || [...selectedIds].some((id) => !assignedIds.has(id));

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users
      .filter((user) => !showAssignedOnly || assignedIds.has(user.id))
      .filter(
        (user) =>
          !query ||
          user.email.toLowerCase().includes(query) ||
          userDisplayName(user).toLowerCase().includes(query),
      )
      .sort((a, b) => Number(assignedIds.has(b.id)) - Number(assignedIds.has(a.id)));
  }, [users, search, showAssignedOnly, assignedIds]);

  const toggleUser = (userId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  };

  const saveAssignments = async () => {
    try {
      setSaving(true);
      setNotice(null);
      const result = await api.put<{ added: number; removed: number }>(`/rbac/roles/${role.id}/users`, {
        userIds: [...selectedIds],
      });
      setNotice({
        tone: "success",
        text: `Assignments saved (${result.added} added, ${result.removed} removed).`,
      });
      await onAssignmentsSaved();
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Unable to save assignments.") });
    } finally {
      setSaving(false);
    }
  };

  const createUser = async () => {
    if (!newUser.email || newUser.password.length < 8) {
      setCreateNotice({ tone: "error", text: "Enter an email and a password of at least 8 characters." });
      return;
    }

    try {
      setCreating(true);
      setCreateNotice(null);
      const created = await api.post<{ id: string; email: string }>("/rbac/users", {
        ...newUser,
        roleId: role.id,
      });
      setSelectedIds((current) => new Set(current).add(created.id));
      setNewUser({ email: "", password: "" });
      setCreateNotice({ tone: "success", text: `Created ${created.email} with the ${role.name} role.` });
      await onUsersChanged();
    } catch (err) {
      setCreateNotice({ tone: "error", text: errorText(err, "Unable to create user.") });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Assign users to <span className="font-semibold text-slate-900">{role.name}</span>.{" "}
        {assignedIds.size} currently assigned.
        {role.isSystem ? " Users already in a system role can't be removed from it." : ""}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className={`${fieldClass} pl-9`}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showAssignedOnly}
            onChange={(e) => setShowAssignedOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Assigned only
        </label>
      </div>

      {usersError ? <NoticeLine notice={{ tone: "error", text: usersError }} /> : null}

      <div className="max-h-[420px] overflow-y-auto rounded-xl border border-slate-200">
        {visibleUsers.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {visibleUsers.map((user) => {
              const isAssigned = assignedIds.has(user.id);
              const isLocked = role.isSystem && isAssigned;
              return (
                <li key={user.id}>
                  <label
                    className={`flex items-center gap-3 px-4 py-3 ${
                      isLocked ? "cursor-not-allowed" : "cursor-pointer hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.id)}
                      disabled={isLocked}
                      onChange={(e) => toggleUser(user.id, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {userDisplayName(user)}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{user.email}</span>
                    </span>
                    {user.status !== "ACTIVE" ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
                        {user.status.toLowerCase()}
                      </span>
                    ) : null}
                    {isAssigned ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Assigned
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            {users.length === 0 ? "No users found." : "No users match your filters."}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void saveAssignments()} disabled={saving || !isDirty}>
          {saving ? "Saving..." : "Save assignments"}
        </Button>
        <span className="text-xs text-slate-500">{selectedIds.size} selected</span>
        <NoticeLine notice={notice} />
      </div>

      <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">
          Create a new user with this role
        </summary>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void createUser();
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser((current) => ({ ...current, email: e.target.value }))}
              placeholder="user@company.com"
              autoComplete="off"
              required
              className={fieldClass}
            />
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser((current) => ({ ...current, password: e.target.value }))}
              placeholder="Password (min 8 characters)"
              autoComplete="new-password"
              minLength={8}
              required
              className={fieldClass}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create user"}
            </Button>
            <NoticeLine notice={createNotice} />
          </div>
        </form>
      </details>
    </div>
  );
}

function RolePermissionsTab({ roleId }: { roleId: string }) {
  const [drafts, setDrafts] = useState<PermissionDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get<RolePermissionEntry[]>(`/rbac/roles/${roleId}/permissions`)
      .then((payload) => {
        if (cancelled) return;
        setDrafts(
          payload.map((entry) => ({
            functionalityId: entry.functionalityId,
            functionalityName: entry.functionality?.name ?? "",
            action: entry.functionality?.action ?? "",
            moduleName: entry.functionality?.subModule?.module?.name ?? "",
            subModuleName: entry.functionality?.subModule?.name ?? "",
            accessLevelId: entry.accessLevelId ?? null,
            canView: Boolean(entry.canView),
            canCreate: Boolean(entry.canCreate),
            canEdit: Boolean(entry.canEdit),
            canDelete: Boolean(entry.canDelete),
            canApprove: Boolean(entry.canApprove),
            canConfigure: Boolean(entry.canConfigure),
          })),
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setNotice({ tone: "error", text: errorText(err, "Unable to load role permissions.") });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roleId, version]);

  const toggle = (functionalityId: string, flag: PermissionFlag, value: boolean) => {
    setDrafts((current) =>
      current.map((item) => (item.functionalityId === functionalityId ? { ...item, [flag]: value } : item)),
    );
  };

  const savePermissions = async () => {
    try {
      setSaving(true);
      setNotice(null);
      await api.put(`/rbac/roles/${roleId}/permissions`, {
        permissions: drafts.map((item) => ({
          functionalityId: item.functionalityId,
          accessLevelId: item.accessLevelId ?? undefined,
          canView: item.canView,
          canCreate: item.canCreate,
          canEdit: item.canEdit,
          canDelete: item.canDelete,
          canApprove: item.canApprove,
          canConfigure: item.canConfigure,
        })),
      });
      setNotice({ tone: "success", text: "Role permissions saved." });
      setVersion((current) => current + 1);
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Unable to save role permissions.") });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading permissions...</p>;
  }

  if (drafts.length === 0) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          This role has no permission overrides. It uses its access level baseline as-is.
        </p>
        <NoticeLine notice={notice} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Module</th>
              <th className="px-4 py-3 font-medium">Functionality</th>
              <th className="px-4 py-3 font-medium">Action</th>
              {permissionColumns.map((column) => (
                <th key={column.flag} className="px-4 py-3 text-center font-medium">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {drafts.map((row) => (
              <tr key={row.functionalityId}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{row.moduleName}</div>
                  <div className="text-xs text-slate-500">{row.subModuleName}</div>
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">{row.functionalityName}</td>
                <td className="px-4 py-3 text-slate-600">{row.action}</td>
                {permissionColumns.map((column) => (
                  <td key={column.flag} className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={row[column.flag]}
                      onChange={(e) => toggle(row.functionalityId, column.flag, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <NoticeLine notice={notice} />
        <Button type="button" onClick={() => void savePermissions()} disabled={saving}>
          {saving ? "Saving..." : "Save permissions"}
        </Button>
      </div>
    </div>
  );
}
