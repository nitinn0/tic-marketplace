import type { OrganizationDetails, OrganizationMember } from "../types";
import { canInOrganization, ORGANIZATION_FUNCTIONALITIES as F } from "./permissions";

export type MemberActions = {
  suspend: boolean;
  reactivate: boolean;
  remove: boolean;
  manageRoles: boolean;
  transferOwnership: boolean;
};

/**
 * Decides which member actions to offer. Mirrors the backend rules so users are not shown
 * actions that will be rejected; the API remains the authority.
 */
export function getMemberActions(
  organization: OrganizationDetails,
  member: OrganizationMember,
  currentUserId: string | undefined,
): MemberActions {
  const access = {
    permissions: organization.permissions,
    status: organization.status,
    accessVia: organization.accessVia,
    hasPlatformAccess: organization.hasPlatformAccess,
  };
  const isSelf = member.userId === currentUserId;
  const viewerIsActiveOwner =
    organization.membership?.isOwner === true && organization.membership.membershipStatus === "ACTIVE";
  const canManageThisMember = !member.isOwner || viewerIsActiveOwner || organization.hasPlatformAccess;
  const isActive = member.membershipStatus === "ACTIVE";

  return {
    suspend: !isSelf && isActive && canManageThisMember && canInOrganization(access, F.members, "edit"),
    reactivate:
      !isSelf &&
      member.membershipStatus === "SUSPENDED" &&
      canManageThisMember &&
      canInOrganization(access, F.members, "edit"),
    remove:
      !isSelf &&
      member.membershipStatus !== "REMOVED" &&
      canManageThisMember &&
      canInOrganization(access, F.members, "delete"),
    manageRoles:
      !isSelf &&
      isActive &&
      (canInOrganization(access, F.memberRoles, "create") || canInOrganization(access, F.memberRoles, "delete")),
    transferOwnership:
      !isSelf &&
      isActive &&
      !member.isOwner &&
      (viewerIsActiveOwner || organization.hasPlatformAccess) &&
      canInOrganization(access, F.ownership, "edit"),
  };
}
