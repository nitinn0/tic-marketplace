"use client";

import Link from "next/link";
import { Building2, Loader2 } from "lucide-react";

import { routes } from "@/lib/constants";

import { useOrganizations } from "../hooks/use-organizations";
import { organizationTypeLabels } from "../utils/labels";
import { OrganizationStatusBadge, OwnerBadge } from "./organization-badges";
import { PermissionSummary } from "./permission-summary";

/** Shows the active organization context; re-renders in place when the user switches organization. */
export function ActiveOrganizationCard() {
  const { status, activeOrganization, activeContext, activeMemberships, switching } = useOrganizations();

  if (status !== "ready") return null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Organization context</p>
          {activeOrganization ? (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                {switching ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Building2 className="h-5 w-5" aria-hidden="true" />}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{activeOrganization.displayName}</p>
                <p className="text-sm text-slate-500">
                  {organizationTypeLabels[activeOrganization.organizationType]}
                  {activeOrganization.roles.length > 0 ? ` · ${activeOrganization.roles.map((role) => role.name).join(", ")}` : ""}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              You are not working in an organization. Independent professionals can use the platform without one.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeOrganization ? <OrganizationStatusBadge status={activeOrganization.status} /> : null}
          {activeOrganization?.isOwner ? <OwnerBadge /> : null}
          <Link href={routes.organizations} className="text-sm font-medium text-sky-700 hover:underline">
            {activeMemberships.length > 0 ? "Manage organizations" : "Create an organization"}
          </Link>
        </div>
      </div>

      {activeContext ? (
        <div className="mt-5">
          <PermissionSummary permissions={activeContext.permissions} filterPrefix="organizations." />
        </div>
      ) : null}
    </section>
  );
}
