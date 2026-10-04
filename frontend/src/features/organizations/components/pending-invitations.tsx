"use client";

import { Button } from "@/components/ui/button";

import type { OrganizationInvitation } from "../types";
import { formatDate } from "../utils/labels";

export function PendingInvitations({
  invitations,
  canCancel,
  onCancel,
}: {
  invitations: OrganizationInvitation[];
  canCancel: boolean;
  onCancel: (invitation: OrganizationInvitation) => void;
}) {
  if (invitations.length === 0) {
    return <p className="text-sm text-slate-500">No pending invitations.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
      {invitations.map((invitation) => (
        <li key={invitation.id} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-slate-900">{invitation.email}</p>
            <p className="text-xs text-slate-500">
              {invitation.role.name} · expires {formatDate(invitation.expiresAt)}
              {invitation.invitedBy ? ` · invited by ${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}` : ""}
            </p>
          </div>
          {canCancel ? (
            <Button type="button" variant="ghost" size="sm" className="text-red-700 hover:bg-red-50" onClick={() => onCancel(invitation)}>
              Cancel invitation
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
