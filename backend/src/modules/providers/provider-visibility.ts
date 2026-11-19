import type { OrganizationStatus, OrganizationType, Prisma, ProfileVerificationStatus } from '@prisma/client';

/**
 * Buyer-facing visibility: the provider opted in, the org is active, and a super admin has verified them.
 * Pending / rejected onboardings stay hidden from marketplace listings, RFQ matching and documents.
 */
export const PUBLIC_PROVIDER_PROFILE_WHERE = {
  publicProfile: true,
  verificationStatus: 'VERIFIED',
  organization: { status: 'ACTIVE', organizationType: 'PROVIDER' },
} satisfies Prisma.ProviderProfileWhereInput;

export function isProviderProfilePubliclyVisible(
  profile: { publicProfile: boolean; verificationStatus: ProfileVerificationStatus },
  organization: { status: OrganizationStatus; organizationType: OrganizationType },
) {
  return (
    profile.publicProfile &&
    profile.verificationStatus === 'VERIFIED' &&
    organization.status === 'ACTIVE' &&
    organization.organizationType === 'PROVIDER'
  );
}
