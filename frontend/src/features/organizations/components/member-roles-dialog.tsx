"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/input";

import { organizationsService } from "../services/organizations.service";
import type { CompatibleRole, OrganizationMember } from "../types";
import { fullName } from "../utils/labels";

export function MemberRolesDialog({
  organizationId,
  member,
  roles,
  canAssign,
  canRemove,
  onClose,
  onChanged,
}: {
  organizationId: string;
  member: OrganizationMember | null;
  roles: CompatibleRole[];
  canAssign: boolean;
  canRemove: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [heldRoles, setHeldRoles] = useState(member?.roles ?? []);
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!member) return null;

  const assignableById = new Map(roles.map((role) => [role.id, role]));
  const available = roles.filter((role) => role.assignable && !heldRoles.some((held) => held.id === role.id));
  const roleToAdd = selected || available[0]?.id || "";

  const run = async (operation: () => Promise<Array<{ id: string; code: string; name: string }>>) => {
    setPending(true);
    setError(null);
    try {
      const next = await operation();
      setHeldRoles(next.map((role) => ({ ...role, assignedAt: "" })));
      setSelected("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update roles");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Manage roles"
      description={`${fullName(member.user)} · ${member.user.email}`}
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current roles</p>
          {heldRoles.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {heldRoles.map((role) => {
                const removable = canRemove && assignableById.get(role.id)?.assignable;
                return (
                  <li
                    key={role.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-800">{role.name}</span>
                    {removable ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        aria-label={`Remove ${role.name}`}
                        onClick={() => void run(() => organizationsService.removeRole(organizationId, member.id, role.id))}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No roles assigned.</p>
          )}
        </div>

        {canAssign ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Assign role</p>
            {available.length > 0 ? (
              <div className="mt-2 flex gap-2">
                <Select
                  aria-label="Role to assign"
                  value={roleToAdd}
                  onChange={(event) => setSelected(event.target.value)}
                  disabled={pending}
                >
                  {available.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  disabled={pending || !roleToAdd}
                  onClick={() => void run(() => organizationsService.assignRole(organizationId, member.id, roleToAdd))}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Assign
                </Button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No other roles you are allowed to grant.</p>
            )}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
