"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { routes } from "@/lib/constants";
import { cn } from "@/lib/utils";

import type { OrganizationDetails } from "../types";
import { OrganizationStatusBadge, OrganizationTypeBadge, OwnerBadge, VerificationBadge } from "./organization-badges";

export function OrganizationPageHeader({ organization }: { organization: OrganizationDetails }) {
  const pathname = usePathname();
  const tabs = [
    { href: routes.organization(organization.id), label: "Overview" },
    { href: routes.organizationMembers(organization.id), label: "Members" },
  ];

  return (
    <div>
      <Link href={routes.organizations} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-sky-700">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        All organizations
      </Link>
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold text-slate-900">{organization.displayName}</h1>
          <p className="mt-1 text-sm text-slate-500">{organization.legalName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OrganizationTypeBadge type={organization.organizationType} />
          <OrganizationStatusBadge status={organization.status} />
          <VerificationBadge status={organization.verificationStatus} />
          {organization.membership?.isOwner ? <OwnerBadge /> : null}
        </div>
      </div>

      {organization.accessVia === "PLATFORM" ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You are viewing this organization through platform-level access, not as a member.
        </p>
      ) : null}

      <nav className="mt-6 flex gap-1 border-b border-slate-200" aria-label="Organization sections">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition",
                active ? "border-sky-700 text-sky-700" : "border-transparent text-slate-500 hover:text-slate-900",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function OrganizationAccessError({ status, message }: { status: number | null; message: string }) {
  const notFound = status === 404;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">
        {notFound ? "Organization not found" : status === 403 ? "Access denied" : "Unable to load organization"}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {notFound ? "It does not exist, or you are not a member of it." : message}
      </p>
      <Link href={routes.organizations} className="mt-6 inline-block text-sm font-medium text-sky-700 hover:underline">
        Back to your organizations
      </Link>
    </div>
  );
}
