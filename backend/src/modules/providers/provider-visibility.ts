import type { OrganizationStatus, OrganizationType, Prisma } from '@prisma/client';

/**
 * Public visibility rule for provider profiles, for the future public directory/search APIs.
 * Visibility is independent of verification: VERIFIED says the platform checked the provider,
 * PUBLIC says the provider opted in, ACTIVE says the organization is operating.
 */
export const PUBLIC_PROVIDER_PROFILE_WHERE = {
  publicProfile: true,
  organization: { status: 'ACTIVE', organizationType: 'PROVIDER' },
} satisfies Prisma.ProviderProfileWhereInput;

export function isProviderProfilePubliclyVisible(
  profile: { publicProfile: boolean },
  organization: { status: OrganizationStatus; organizationType: OrganizationType },
) {
  return profile.publicProfile && organization.status === 'ACTIVE' && organization.organizationType === 'PROVIDER';
}
