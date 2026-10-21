"use client";

import Link from "next/link";
import { ClipboardList, FlaskConical, Tags, UserRound } from "lucide-react";

import { routes } from "@/lib/constants";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import {
  hasPermission,
  MARKETPLACE_FUNCTIONALITIES,
  PROFESSIONAL_FUNCTIONALITIES,
  PROVIDER_FUNCTIONALITIES,
} from "@/features/organizations/utils/permissions";

const linkClass = "transition hover:text-sky-700";
const menuClass =
  "flex items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 hover:bg-slate-50";

/** Links that depend on the signed-in user's permissions; the pages enforce access themselves. */
export function MarketplaceNavLinks({ menu = false, onNavigate }: { menu?: boolean; onNavigate?: () => void }) {
  const { me, activeOrganization, activeContext } = useOrganizations();
  if (!me) return null;

  const canViewTaxonomy = Object.values(MARKETPLACE_FUNCTIONALITIES).some((code) =>
    hasPermission(me.permissions, code, "view"),
  );
  const canViewProvider =
    activeOrganization?.organizationType === "PROVIDER" &&
    hasPermission(activeContext?.permissions, PROVIDER_FUNCTIONALITIES.profile, "view");
  const canViewProfessional = hasPermission(me.permissions, PROFESSIONAL_FUNCTIONALITIES.profile, "view");

  if (menu) {
    return (
      <>
        {canViewProvider ? (
          <Link href={routes.providerProfile} role="menuitem" className={menuClass} onClick={onNavigate}>
            <UserRound className="h-4 w-4 text-slate-500" />
            Provider profile
          </Link>
        ) : null}
        {canViewProvider ? (
          <Link href={routes.providerRfqs} role="menuitem" className={menuClass} onClick={onNavigate}>
            <ClipboardList className="h-4 w-4 text-slate-500" />
            Incoming RFQs
          </Link>
        ) : null}
        {canViewProfessional ? (
          <Link href={routes.professionalProfile} role="menuitem" className={menuClass} onClick={onNavigate}>
            <FlaskConical className="h-4 w-4 text-slate-500" />
            My expert profile
          </Link>
        ) : null}
        {canViewTaxonomy ? (
          <Link href={routes.adminTaxonomy} role="menuitem" className={menuClass} onClick={onNavigate}>
            <Tags className="h-4 w-4 text-slate-500" />
            Taxonomy
          </Link>
        ) : null}
      </>
    );
  }

  return (
    <>
      {canViewProvider ? (
        <Link href={routes.providerProfile} className={linkClass}>
          Provider profile
        </Link>
      ) : null}
      {canViewProvider ? (
        <Link href={routes.providerRfqs} className={linkClass}>
          Incoming RFQs
        </Link>
      ) : null}
      {canViewProfessional ? (
        <Link href={routes.professionalProfile} className={linkClass}>
          My expert profile
        </Link>
      ) : null}
      {canViewTaxonomy ? (
        <Link href={routes.adminTaxonomy} className={linkClass}>
          Taxonomy
        </Link>
      ) : null}
    </>
  );
}
