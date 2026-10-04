import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { OrganizationType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service.js';
import type { OrganizationAccessContext } from '../../rbac/services/organization-access.service.js';
import { PermissionResolverService } from '../../rbac/services/permission-resolver.service.js';
import { isRoleCompatibleWithOrganization } from '../../rbac/utils/role-scope.util.js';

type RoleClient = Pick<Prisma.TransactionClient, 'role'>;

const roleSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  organizationType: true,
  isActive: true,
} as const;

/**
 * Central place for organization role rules:
 *  - compatibility: role.organization_type must match the organization type and the role must be active
 *  - anti-escalation: an actor may only grant/revoke roles whose permissions they already hold in
 *    that organization (platform operators are exempt)
 */
@Injectable()
export class OrganizationRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: PermissionResolverService,
  ) {}

  async getAssignableRole(roleId: string, organizationType: OrganizationType, client: RoleClient = this.prisma) {
    const role = await client.role.findUnique({ where: { id: roleId }, select: roleSelect });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (!role.isActive) {
      throw new BadRequestException(`Role ${role.name} is not active`);
    }
    if (!isRoleCompatibleWithOrganization(role, organizationType)) {
      throw new BadRequestException(
        `Role ${role.name} is not compatible with ${organizationType} organizations`,
      );
    }
    return role;
  }

  async canGrant(context: OrganizationAccessContext, roleId: string) {
    if (context.hasPlatformAccess) {
      return true;
    }
    const rolePermissions = await this.resolver.resolveForRoles([roleId]);
    return PermissionResolverService.isSubset(rolePermissions, context.permissions);
  }

  async assertCanGrant(context: OrganizationAccessContext, role: { id: string; name: string }) {
    if (!(await this.canGrant(context, role.id))) {
      throw new ForbiddenException(
        `You cannot assign or remove the ${role.name} role because it grants permissions you do not have`,
      );
    }
  }

  async listCompatibleRoles(context: OrganizationAccessContext) {
    const roles = await this.prisma.role.findMany({
      where: { isActive: true, organizationType: { not: null } },
      orderBy: { name: 'asc' },
      select: roleSelect,
    });

    const compatible = roles.filter((role) =>
      isRoleCompatibleWithOrganization(role, context.organization.organizationType),
    );

    return Promise.all(
      compatible.map(async (role) => ({
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        organizationType: role.organizationType,
        assignable: await this.canGrant(context, role.id),
      })),
    );
  }
}
