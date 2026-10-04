"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

import { organizationsService } from "../services/organizations.service";
import type { OrganizationDetails } from "../types";
import { formatDate } from "../utils/labels";
import { MembershipBadge, OwnerBadge } from "./organization-badges";
import { PermissionSummary } from "./permission-summary";

export function MyAccessCard({ organization, onLeft }: { organization: OrganizationDetails; onLeft: () => void }) {
  const membership = organization.membership;
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leave = async () => {
    setLeaving(true);
    setError(null);
    try {
      await organizationsService.leave(organization.id);
      setConfirming(false);
      onLeft();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to leave organization");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Your access</h2>

      {membership ? (
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <MembershipBadge status={membership.membershipStatus} />
            {membership.isOwner ? <OwnerBadge /> : null}
          </div>
          <p className="text-slate-600">Member since {formatDate(membership.joinedAt)}</p>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Roles</p>
            {membership.roles.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {membership.roles.map((role) => (
                  <li key={role.id} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-800">
                    {role.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-slate-500">No roles assigned.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">You are not a member; access comes from your platform role.</p>
      )}

      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Organization permissions</p>
        <PermissionSummary permissions={organization.permissions} filterPrefix="organizations." />
      </div>

      {membership?.membershipStatus === "ACTIVE" ? (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <Button type="button" variant="ghost" size="sm" className="text-red-700 hover:bg-red-50" onClick={() => setConfirming(true)}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Leave organization
          </Button>
        </div>
      ) : null}

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Leave ${organization.displayName}?`}
        description={
          membership?.isOwner
            ? "Owners must transfer ownership before leaving if they are the last active owner."
            : "You will lose access to this organization until you are invited again."
        }
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={leaving}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void leave()} disabled={leaving}>
              {leaving ? "Leaving..." : "Leave organization"}
            </Button>
          </>
        }
      >
        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </Dialog>
    </section>
  );
}
