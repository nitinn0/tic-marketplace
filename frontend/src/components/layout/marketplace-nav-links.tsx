"use client";

import Link from "next/link";

import { routes } from "@/lib/constants";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import {
  hasPermission,
  MARKETPLACE_FUNCTIONALITIES,
  PROFESSIONAL_FUNCTIONALITIES,
  PROVIDER_FUNCTIONALITIES,
} from "@/features/organizations/utils/permissions";

const linkClass = "transition hover:text-sky-700";

/** Links that depend on the signed-in user's permissions; the pages enforce access themselves. */
export function MarketplaceNavLinks() {
  const { me, activeOrganization, activeContext } = useOrganizations();
  if (!me) return null;

  const canViewTaxonomy = Object.values(MARKETPLACE_FUNCTIONALITIES).some((code) =>
    hasPermission(me.permissions, code, "view"),
  );
  const canViewProvider =
    activeOrganization?.organizationType === "PROVIDER" &&
    hasPermission(activeContext?.permissions, PROVIDER_FUNCTIONALITIES.profile, "view");
  const canViewProfessional = hasPermission(me.permissions, PROFESSIONAL_FUNCTIONALITIES.profile, "view");

  return (
    <>
      {canViewProvider ? (
        <Link href={routes.providerProfile} className={linkClass}>
          Provider profile
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
