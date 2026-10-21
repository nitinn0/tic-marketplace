import { getActiveOrganizationId, setActiveOrganizationId } from "@/lib/api";
import { routes } from "@/lib/constants";
import type { MeResponse } from "@/features/organizations/types";

/** Honour an explicit same-origin `next` param. Otherwise the caller picks a home. */
export function requestedNext() {
  if (typeof window === "undefined") return null;
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

/** Buyer memberships open the carousel dashboard. Provider memberships open the provider dashboard. */
export function homeForMemberships(me: MeResponse) {
  const active = me.organizations.filter((org) => org.membershipStatus === "ACTIVE" && org.status === "ACTIVE");
  const stored = getActiveOrganizationId();
  const organization =
    active.find((item) => item.id === stored) ??
    active.find((item) => item.id === me.activeOrganizationId) ??
    active[0] ??
    null;
  if (organization) setActiveOrganizationId(organization.id);
  return organization?.organizationType === "PROVIDER" ? routes.providerDashboard : routes.dashboard;
}
