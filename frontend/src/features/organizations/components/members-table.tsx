"use client";

import { Crown, PauseCircle, PlayCircle, ShieldCheck, UserMinus } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { OrganizationDetails, OrganizationMember } from "../types";
import { formatDate, fullName } from "../utils/labels";
import { getMemberActions } from "../utils/member-actions";
import { MembershipBadge, OwnerBadge } from "./organization-badges";

export type MemberActionHandlers = {
  onManageRoles: (member: OrganizationMember) => void;
  onSuspend: (member: OrganizationMember) => void;
  onReactivate: (member: OrganizationMember) => void;
  onRemove: (member: OrganizationMember) => void;
  onTransferOwnership: (member: OrganizationMember) => void;
};

export function MembersTable({
  organization,
  members,
  currentUserId,
  handlers,
}: {
  organization: OrganizationDetails;
  members: OrganizationMember[];
  currentUserId: string | undefined;
  handlers: MemberActionHandlers;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Member
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Roles
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Joined
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.map((member) => {
            const actions = getMemberActions(organization, member, currentUserId);
            const isSelf = member.userId === currentUserId;
            return (
              <tr key={member.id} className={member.membershipStatus === "REMOVED" ? "bg-slate-50/70 text-slate-500" : undefined}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">
                    {fullName(member.user)}
                    {isSelf ? <span className="ml-1.5 text-xs font-normal text-slate-500">(you)</span> : null}
                  </p>
                  <p className="text-xs text-slate-500">{member.user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <MembershipBadge status={member.membershipStatus} />
                    {member.isOwner ? <OwnerBadge /> : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {member.roles.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {member.roles.map((role) => (
                        <span key={role.id} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          {role.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDate(member.joinedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {actions.manageRoles ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handlers.onManageRoles(member)}>
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        Roles
                      </Button>
                    ) : null}
                    {actions.transferOwnership ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handlers.onTransferOwnership(member)}>
                        <Crown className="h-4 w-4" aria-hidden="true" />
                        Make owner
                      </Button>
                    ) : null}
                    {actions.suspend ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handlers.onSuspend(member)}>
                        <PauseCircle className="h-4 w-4" aria-hidden="true" />
                        Suspend
                      </Button>
                    ) : null}
                    {actions.reactivate ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handlers.onReactivate(member)}>
                        <PlayCircle className="h-4 w-4" aria-hidden="true" />
                        Reactivate
                      </Button>
                    ) : null}
                    {actions.remove ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-700 hover:bg-red-50"
                        onClick={() => handlers.onRemove(member)}
                      >
                        <UserMinus className="h-4 w-4" aria-hidden="true" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
