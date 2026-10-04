import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";

import { routes } from "@/lib/constants";

import type { OrganizationSummary } from "../types";
import { OrganizationStatusBadge, OrganizationTypeBadge, OwnerBadge, VerificationBadge } from "./organization-badges";

export function OrganizationList({
  organizations,
  activeOrganizationId,
}: {
  organizations: OrganizationSummary[];
  activeOrganizationId: string | null;
}) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {organizations.map((organization) => (
        <li key={organization.id}>
          <Link
            href={routes.organization(organization.id)}
            className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-900">{organization.displayName}</h3>
                <p className="truncate text-sm text-slate-500">{organization.legalName}</p>
              </div>
              {organization.id === activeOrganizationId ? (
                <span className="shrink-0 rounded-full bg-sky-700 px-2 py-0.5 text-xs font-medium text-white">Active</span>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <OrganizationTypeBadge type={organization.organizationType} />
              <OrganizationStatusBadge status={organization.status} />
              <VerificationBadge status={organization.verificationStatus} />
              {organization.membership?.isOwner ? <OwnerBadge /> : null}
            </div>

            <div className="mt-4 flex-1 text-sm text-slate-600">
              {organization.membership?.roles.length ? (
                <p>
                  <span className="text-slate-500">Your roles: </span>
                  {organization.membership.roles.map((role) => role.name).join(", ")}
                </p>
              ) : (
                <p className="text-slate-500">No organization roles assigned.</p>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Users className="h-4 w-4" aria-hidden="true" />
                {organization.memberCount} active {organization.memberCount === 1 ? "member" : "members"}
              </span>
              <span className="flex items-center gap-1 font-medium text-sky-700">
                Open
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
