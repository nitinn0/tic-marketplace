import type { Prisma, UserStatus } from '@prisma/client';

/**
 * Public visibility rule for professional profiles, for the future public directory APIs. Like
 * providers, PUBLIC (opt-in), VERIFIED (platform check) and ACTIVE (account state) are separate.
 */
export const PUBLIC_PROFESSIONAL_PROFILE_WHERE = {
  publicProfile: true,
  user: { status: 'ACTIVE' },
} satisfies Prisma.ProfessionalProfileWhereInput;

export function isProfessionalProfilePubliclyVisible(profile: { publicProfile: boolean }, user: { status: UserStatus }) {
  return profile.publicProfile && user.status === 'ACTIVE';
}
