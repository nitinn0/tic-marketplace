export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'configure'] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_FLAGS = [
  'canView',
  'canCreate',
  'canEdit',
  'canDelete',
  'canApprove',
  'canConfigure',
] as const;

export type PermissionFlag = (typeof PERMISSION_FLAGS)[number];

export type PermissionFlags = Record<PermissionFlag, boolean>;

export const ACTION_TO_FLAG: Record<PermissionAction, PermissionFlag> = {
  view: 'canView',
  create: 'canCreate',
  edit: 'canEdit',
  delete: 'canDelete',
  approve: 'canApprove',
  configure: 'canConfigure',
};

/**
 * Functionality codes for organization-scoped capabilities. They are regular Phase 2
 * functionalities (seeded under the "organizations" module); the scope comes from the
 * endpoint being decorated with @OrganizationScoped.
 */
export const ORGANIZATION_FUNCTIONALITIES = {
  profile: 'organizations.profile',
  status: 'organizations.status',
  members: 'organizations.members',
  memberRoles: 'organizations.member_roles',
  ownership: 'organizations.ownership',
  /**
   * Granted only through global roles. Holding `view` on it makes the holder's global grants on
   * organization functionalities apply to every organization (platform operations).
   */
  platformAccess: 'organizations.platform_access',
} as const;

/** Marketplace master data (taxonomy). Granted through global roles only. */
export const MARKETPLACE_FUNCTIONALITIES = {
  categories: 'marketplace.categories',
  services: 'marketplace.services',
  standards: 'marketplace.standards',
  industries: 'marketplace.industries',
  locations: 'marketplace.locations',
} as const;

/**
 * Provider profile and capabilities. Evaluated inside the provider organization
 * (organization roles), or through global roles with platform access.
 */
export const PROVIDER_FUNCTIONALITIES = {
  profile: 'providers.profile',
  services: 'providers.services',
  standards: 'providers.standards',
  industries: 'providers.industries',
  locations: 'providers.locations',
} as const;

/** Professional profile (user-level). Evaluated against the caller's global roles. */
export const PROFESSIONAL_FUNCTIONALITIES = {
  profile: 'professionals.profile',
  experience: 'professionals.experience',
} as const;
