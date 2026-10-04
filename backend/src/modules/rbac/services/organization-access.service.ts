import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  OrganizationMembershipStatus,
  OrganizationStatus,
  OrganizationType,
  OrganizationVerificationStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service.js';
import { ORGANIZATION_FUNCTIONALITIES } from '../constants/permission.constants.js';
import { isGlobalRole, isRoleCompatibleWithOrganization } from '../utils/role-scope.util.js';
import { PermissionResolverService, type EffectivePermissions } from './permission-resolver.service.js';

export type RoleSummary = { id: string; code: string; name: string };

export type OrganizationAccessContext = {
  userId: string;
  organization: {
    id: string;
    legalName: string;
    displayName: string;
    organizationType: OrganizationType;
    status: OrganizationStatus;
    verificationStatus: OrganizationVerificationStatus;
  };
  membership: {
    id: string;
    membershipStatus: OrganizationMembershipStatus;
    isOwner: boolean;
    joinedAt: Date | null;
  } | null;
  /** Organization-scoped roles held through an ACTIVE membership. */
  roles: RoleSummary[];
  /** MEMBERSHIP: active member. PLATFORM: global roles grant cross-organization access. */
  accessVia: 'MEMBERSHIP' | 'PLATFORM';
  hasPlatformAccess: boolean;
  permissions: EffectivePermissions;
};

export type ResolveOrganizationOptions = {
  /** Reject platform-level access; the user must hold an ACTIVE membership. */
  requireMembership?: boolean;
};

/**
 * Resolves "within which organization can this user act" on top of the Phase 2 permission engine:
 *
 *   user -> organization membership (ACTIVE only) -> organization roles (compatible + active)
 *        -> role permissions / access levels -> effective permissions for that organization
 *
 * Global roles only contribute inside an organization when they grant
 * `organizations.platform_access` (view), which is how platform operators are modelled.
 */
@Injectable()
export class OrganizationAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: PermissionResolverService,
  ) {}

  async getGlobalRoles(userId: string): Promise<RoleSummary[]> {
    const assignments = await this.prisma.userRole.findMany({
      where: { userId, role: { isActive: true } },
      select: { role: { select: { id: true, code: true, name: true, organizationType: true } } },
    });

    return assignments
      .map(({ role }) => role)
      .filter(isGlobalRole)
      .map(({ id, code, name }) => ({ id, code, name }));
  }

  async getGlobalPermissions(userId: string): Promise<EffectivePermissions> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (!user || user.status !== 'ACTIVE') {
      return new Map();
    }
    const roles = await this.getGlobalRoles(userId);
    return this.resolver.resolveForRoles(roles.map((role) => role.id));
  }

  hasPlatformAccess(globalPermissions: EffectivePermissions) {
    return PermissionResolverService.allows(
      globalPermissions,
      ORGANIZATION_FUNCTIONALITIES.platformAccess,
      'view',
    );
  }

  async resolve(
    userId: string,
    organizationId: string,
    options: ResolveOrganizationOptions = {},
  ): Promise<OrganizationAccessContext> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (!user || user.status !== 'ACTIVE') {
      throw new ForbiddenException('User account is not active');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        legalName: true,
        displayName: true,
        organizationType: true,
        status: true,
        verificationStatus: true,
      },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const membership = await this.prisma.organizationUser.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: {
        id: true,
        membershipStatus: true,
        isOwner: true,
        joinedAt: true,
        roles: {
          select: {
            role: { select: { id: true, code: true, name: true, organizationType: true, isActive: true } },
          },
        },
      },
    });

    const globalPermissions = await this.getGlobalPermissions(userId);
    const hasPlatformAccess = this.hasPlatformAccess(globalPermissions);
    const membershipSummary = membership
      ? {
          id: membership.id,
          membershipStatus: membership.membershipStatus,
          isOwner: membership.isOwner,
          joinedAt: membership.joinedAt,
        }
      : null;

    if (membership?.membershipStatus === 'ACTIVE') {
      const roles = membership.roles
        .map(({ role }) => role)
        .filter((role) => isRoleCompatibleWithOrganization(role, organization.organizationType));
      const organizationPermissions = await this.resolver.resolveForRoles(roles.map((role) => role.id));

      return {
        userId,
        organization,
        membership: membershipSummary,
        roles: roles.map(({ id, code, name }) => ({ id, code, name })),
        accessVia: 'MEMBERSHIP',
        hasPlatformAccess,
        permissions: hasPlatformAccess
          ? PermissionResolverService.merge(organizationPermissions, globalPermissions)
          : organizationPermissions,
      };
    }

    if (hasPlatformAccess && !options.requireMembership) {
      return {
        userId,
        organization,
        membership: membershipSummary,
        roles: [],
        accessVia: 'PLATFORM',
        hasPlatformAccess,
        permissions: globalPermissions,
      };
    }

    if (membership) {
      throw new ForbiddenException(
        `Your membership in this organization is ${membership.membershipStatus.toLowerCase()}`,
      );
    }

    // Same response for "does not exist" and "not a member" so organization ids cannot be probed.
    throw new NotFoundException('Organization not found');
  }

  can(context: OrganizationAccessContext, functionalityCode: string, action: string) {
    if (!PermissionResolverService.allows(context.permissions, functionalityCode, action)) {
      return false;
    }
    if (context.organization.status !== 'ACTIVE' && action.toLowerCase() !== 'view') {
      return context.hasPlatformAccess;
    }
    return true;
  }

  assertCan(context: OrganizationAccessContext, functionalityCode: string, action: string) {
    if (!PermissionResolverService.allows(context.permissions, functionalityCode, action)) {
      throw new ForbiddenException('You do not have permission to perform this action in this organization');
    }
    if (!this.can(context, functionalityCode, action)) {
      throw new ForbiddenException(`Organization is ${context.organization.status.toLowerCase()}`);
    }
  }
}
