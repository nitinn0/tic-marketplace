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
            className="group flex h-full flex-col rounded-3xl border border-[#EADFCF] bg-white p-5 shadow-[0_12px_30px_-22px_rgba(18,48,58,0.45)] transition hover:-translate-y-0.5 hover:border-[#7CC0C8]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-base font-semibold text-[#12303A]">{organization.displayName}</h3>
                <p className="truncate text-sm text-[#5A6A6F]">{organization.legalName}</p>
              </div>
              {organization.id === activeOrganizationId ? (
                <span className="shrink-0 rounded-full bg-[#E36F47] px-2 py-0.5 text-xs font-semibold text-[#0B2530]">Active</span>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <OrganizationTypeBadge type={organization.organizationType} />
              <OrganizationStatusBadge status={organization.status} />
              <VerificationBadge status={organization.verificationStatus} />
              {organization.membership?.isOwner ? <OwnerBadge /> : null}
            </div>

            <div className="mt-4 flex-1 text-sm text-[#3E5258]">
              {organization.membership?.roles.length ? (
                <p>
                  <span className="text-[#5A6A6F]">Your roles: </span>
                  {organization.membership.roles.map((role) => role.name).join(", ")}
                </p>
              ) : organization.membership ? (
                <p className="text-[#5A6A6F]">No organization roles assigned.</p>
              ) : (
                <p className="text-[#5A6A6F]">Opened with platform access.</p>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-[#EADFCF] pt-4 text-sm">
              <span className="flex items-center gap-1.5 text-[#5A6A6F]">
                <Users className="h-4 w-4" aria-hidden="true" />
                {organization.memberCount} active {organization.memberCount === 1 ? "member" : "members"}
              </span>
              <span className="flex items-center gap-1 font-semibold text-[#0F4C5C] transition group-hover:text-[#E36F47]">
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
