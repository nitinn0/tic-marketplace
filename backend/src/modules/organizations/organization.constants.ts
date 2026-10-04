import type { OrganizationType } from '@prisma/client';

/**
 * Role automatically granted to the user who creates an organization, per organization type.
 * The creator also becomes the owner; permissions still come from the role's configuration.
 */
export const DEFAULT_OWNER_ROLE_CODES: Record<OrganizationType, string> = {
  BUYER: 'BUYER_ADMIN',
  PROVIDER: 'PROVIDER_ADMIN',
};

export const DEFAULT_INVITATION_TTL_HOURS = 168;
