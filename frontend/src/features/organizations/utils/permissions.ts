import type { AccessVia, OrganizationStatus, PermissionAction, PermissionEntry } from "../types";

/** Mirrors backend ORGANIZATION_FUNCTIONALITIES. */
export const ORGANIZATION_FUNCTIONALITIES = {
  profile: "organizations.profile",
  status: "organizations.status",
  members: "organizations.members",
  memberRoles: "organizations.member_roles",
  ownership: "organizations.ownership",
} as const;

const ACTION_TO_FLAG: Record<PermissionAction, keyof Omit<PermissionEntry, "functionalityCode">> = {
  view: "canView",
  create: "canCreate",
  edit: "canEdit",
  delete: "canDelete",
  approve: "canApprove",
  configure: "canConfigure",
};

export function hasPermission(permissions: PermissionEntry[] | undefined, code: string, action: PermissionAction) {
  const entry = permissions?.find((permission) => permission.functionalityCode === code);
  return entry ? entry[ACTION_TO_FLAG[action]] : false;
}

type AccessSnapshot = {
  permissions: PermissionEntry[];
  status: OrganizationStatus;
  accessVia: AccessVia;
  hasPlatformAccess: boolean;
};

/**
 * UI-side mirror of the backend rule: non-active organizations are read-only unless the user has
 * platform access. This only decides what to show; the API enforces it independently.
 */
export function canInOrganization(access: AccessSnapshot | null | undefined, code: string, action: PermissionAction) {
  if (!access || !hasPermission(access.permissions, code, action)) {
    return false;
  }
  return access.status === "ACTIVE" || action === "view" || access.hasPlatformAccess;
}
