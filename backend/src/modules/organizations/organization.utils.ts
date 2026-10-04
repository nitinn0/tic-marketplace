import type { Prisma } from '@prisma/client';

/**
 * Serializes concurrent ownership/membership changes for one organization. Used before any
 * "last active owner" check so two parallel removals cannot both pass the check.
 */
export async function lockOrganization(tx: Prisma.TransactionClient, organizationId: string) {
  await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${organizationId}::uuid FOR UPDATE`;
}

export async function countActiveOwners(
  tx: Prisma.TransactionClient,
  organizationId: string,
  excludeMemberId?: string,
) {
  return tx.organizationUser.count({
    where: {
      organizationId,
      isOwner: true,
      membershipStatus: 'ACTIVE',
      ...(excludeMemberId ? { id: { not: excludeMemberId } } : {}),
    },
  });
}

/** Converts empty strings to null for optional text columns; leaves undefined untouched. */
export function emptyToNull<T extends string | null | undefined>(value: T): T | null {
  if (value === undefined) {
    return undefined as T;
  }
  return value === '' ? null : value;
}

export function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}
