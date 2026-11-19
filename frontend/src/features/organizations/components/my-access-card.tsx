"use client";

import type { OrganizationDetails } from "../types";
import { formatDate } from "../utils/labels";
import { MembershipBadge, OwnerBadge } from "./organization-badges";
import { PermissionSummary } from "./permission-summary";

export function MyAccessCard({ organization }: { organization: OrganizationDetails }) {
  const membership = organization.membership;

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
    </section>
  );
}
