import { OrganizationType } from '@prisma/client';

export const ORGANIZATION_TYPES = Object.values(OrganizationType);

export function normalizeOrganizationType(value: string | null | undefined): OrganizationType | null {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  return ORGANIZATION_TYPES.includes(normalized as OrganizationType)
    ? (normalized as OrganizationType)
    : null;
}

/** Roles without an organization type are global/platform roles assigned through user_roles. */
export function isGlobalRole(role: { organizationType: string | null }) {
  return !role.organizationType?.trim();
}

/** Single source of truth for organization role compatibility. */
export function isRoleCompatibleWithOrganization(
  role: { organizationType: string | null; isActive: boolean },
  organizationType: OrganizationType,
) {
  return role.isActive && normalizeOrganizationType(role.organizationType) === organizationType;
}
