import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Organization, Prisma } from '@prisma/client';

import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../../../common/audit/audit-actions.js';
import { AuditService } from '../../../common/audit/audit.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { ORGANIZATION_FUNCTIONALITIES } from '../../rbac/constants/permission.constants.js';
import {
  OrganizationAccessService,
  type OrganizationAccessContext,
} from '../../rbac/services/organization-access.service.js';
import { PermissionResolverService } from '../../rbac/services/permission-resolver.service.js';
import { isRoleCompatibleWithOrganization } from '../../rbac/utils/role-scope.util.js';
import { CreateOrganizationDto } from '../dto/create-organization.dto.js';
import { ListOrganizationsQueryDto } from '../dto/list-organizations-query.dto.js';
import { UpdateOrganizationDto } from '../dto/update-organization.dto.js';
import { DEFAULT_OWNER_ROLE_CODES } from '../organization.constants.js';
import { countActiveOwners, emptyToNull, lockOrganization } from '../organization.utils.js';

const UPDATABLE_FIELDS = [
  'legalName',
  'displayName',
  'registrationNumber',
  'taxId',
  'website',
  'description',
  'countryCode',
  'status',
] as const;

const membershipInclude = (userId: string) =>
  ({
    members: {
      where: { userId },
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
    },
    _count: { select: { members: { where: { membershipStatus: 'ACTIVE' } } } },
  }) satisfies Prisma.OrganizationInclude;

type OrganizationWithMembership = Prisma.OrganizationGetPayload<{
  include: ReturnType<typeof membershipInclude>;
}>;

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  async create(actorId: string, dto: CreateOrganizationDto) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { status: true } });
    if (!actor || actor.status !== 'ACTIVE') {
      throw new ForbiddenException('User account is not active');
    }

    const ownerRoleCode = DEFAULT_OWNER_ROLE_CODES[dto.organizationType];
    const ownerRole = await this.prisma.role.findUnique({ where: { code: ownerRoleCode } });
    if (!ownerRole || !isRoleCompatibleWithOrganization(ownerRole, dto.organizationType)) {
      throw new InternalServerErrorException(
        `Default owner role ${ownerRoleCode} is not configured for ${dto.organizationType} organizations`,
      );
    }

    const now = new Date();
    const organization = await this.prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          legalName: dto.legalName,
          displayName: dto.displayName,
          organizationType: dto.organizationType,
          registrationNumber: emptyToNull(dto.registrationNumber) ?? null,
          taxId: emptyToNull(dto.taxId) ?? null,
          website: emptyToNull(dto.website) ?? null,
          description: emptyToNull(dto.description) ?? null,
          countryCode: emptyToNull(dto.countryCode) ?? null,
        },
      });

      const membership = await tx.organizationUser.create({
        data: {
          organizationId: created.id,
          userId: actorId,
          membershipStatus: 'ACTIVE',
          isOwner: true,
          joinedAt: now,
          lastAccessedAt: now,
        },
      });

      await tx.organizationUserRole.create({
        data: { organizationUserId: membership.id, roleId: ownerRole.id },
      });

      await this.audit.log(
        {
          action: AUDIT_ACTIONS.organizationCreated,
          entityType: AUDIT_ENTITIES.organization,
          entityId: created.id,
          actorUserId: actorId,
          organizationId: created.id,
          targetUserId: actorId,
          metadata: {
            organizationType: created.organizationType,
            displayName: created.displayName,
            ownerMemberId: membership.id,
            ownerRole: ownerRole.code,
          },
        },
        tx,
      );

      return created;
    });

    return this.getDetails(await this.organizationAccess.resolve(actorId, organization.id));
  }

  async listForUser(actorId: string, query: ListOrganizationsQueryDto) {
    const filters: Prisma.OrganizationWhereInput = {
      ...(query.organizationType ? { organizationType: query.organizationType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { displayName: { contains: query.search, mode: 'insensitive' } },
              { legalName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    if (query.scope === 'all') {
      const globalPermissions = await this.organizationAccess.getGlobalPermissions(actorId);
      const allowed =
        this.organizationAccess.hasPlatformAccess(globalPermissions) &&
        PermissionResolverService.allows(globalPermissions, ORGANIZATION_FUNCTIONALITIES.profile, 'view');
      if (!allowed) {
        throw new ForbiddenException('Listing all organizations requires platform organization access');
      }
    } else {
      filters.members = { some: { userId: actorId, membershipStatus: 'ACTIVE' } };
    }

    const organizations = await this.prisma.organization.findMany({
      where: filters,
      orderBy: { displayName: 'asc' },
      take: 200,
      include: membershipInclude(actorId),
    });

    return organizations.map((organization) => this.toSummary(organization));
  }

  async getDetails(context: OrganizationAccessContext) {
    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: context.organization.id },
      include: { _count: { select: { members: { where: { membershipStatus: 'ACTIVE' } } } } },
    });

    return {
      ...this.toProfile(organization),
      memberCount: organization._count.members,
      membership: context.membership ? { ...context.membership, roles: context.roles } : null,
      accessVia: context.accessVia,
      hasPlatformAccess: context.hasPlatformAccess,
      permissions: PermissionResolverService.toList(context.permissions),
    };
  }

  async update(actorId: string, context: OrganizationAccessContext, dto: UpdateOrganizationDto) {
    if (dto.status !== undefined) {
      this.organizationAccess.assertCan(context, ORGANIZATION_FUNCTIONALITIES.status, 'edit');
    }

    const organizationId = context.organization.id;

    await this.prisma.$transaction(async (tx) => {
      await lockOrganization(tx, organizationId);
      const current = await tx.organization.findUniqueOrThrow({ where: { id: organizationId } });

      const data: Prisma.OrganizationUpdateInput = {};
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const field of UPDATABLE_FIELDS) {
        if (dto[field] === undefined) {
          continue;
        }
        const next = field === 'legalName' || field === 'displayName' || field === 'status'
          ? dto[field]
          : emptyToNull(dto[field]);
        if (next !== current[field]) {
          (data as Record<string, unknown>)[field] = next;
          changes[field] = { from: current[field], to: next };
        }
      }

      if (Object.keys(changes).length === 0) {
        return;
      }

      if (changes.status && data.status === 'ACTIVE' && (await countActiveOwners(tx, organizationId)) === 0) {
        throw new BadRequestException('An active organization requires at least one active owner');
      }

      await tx.organization.update({ where: { id: organizationId }, data });

      await this.audit.log(
        {
          action: AUDIT_ACTIONS.organizationUpdated,
          entityType: AUDIT_ENTITIES.organization,
          entityId: organizationId,
          actorUserId: actorId,
          organizationId,
          metadata: { changes, accessVia: context.accessVia } as Prisma.InputJsonValue,
        },
        tx,
      );

      if (changes.status) {
        await this.audit.log(
          {
            action: AUDIT_ACTIONS.organizationStatusChanged,
            entityType: AUDIT_ENTITIES.organization,
            entityId: organizationId,
            actorUserId: actorId,
            organizationId,
            metadata: changes.status as Prisma.InputJsonValue,
          },
          tx,
        );
      }
    });

    return this.getDetails(await this.organizationAccess.resolve(actorId, organizationId));
  }

  async switchContext(actorId: string, context: OrganizationAccessContext) {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.organizationUser.update({
        where: { id: context.membership!.id },
        data: { lastAccessedAt: now },
      });
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.organizationContextSwitched,
          entityType: AUDIT_ENTITIES.organizationMember,
          entityId: context.membership!.id,
          actorUserId: actorId,
          organizationId: context.organization.id,
          targetUserId: actorId,
        },
        tx,
      );
    });

    return this.getContext(context);
  }

  getContext(context: OrganizationAccessContext) {
    return {
      organization: {
        id: context.organization.id,
        displayName: context.organization.displayName,
        organizationType: context.organization.organizationType,
        status: context.organization.status,
      },
      membership: context.membership,
      roles: context.roles,
      accessVia: context.accessVia,
      hasPlatformAccess: context.hasPlatformAccess,
      permissions: PermissionResolverService.toList(context.permissions),
    };
  }

  private toProfile(organization: Organization) {
    return {
      id: organization.id,
      legalName: organization.legalName,
      displayName: organization.displayName,
      organizationType: organization.organizationType,
      registrationNumber: organization.registrationNumber,
      taxId: organization.taxId,
      website: organization.website,
      description: organization.description,
      countryCode: organization.countryCode,
      status: organization.status,
      verificationStatus: organization.verificationStatus,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  private toSummary(organization: OrganizationWithMembership) {
    const membership = organization.members[0];
    return {
      id: organization.id,
      legalName: organization.legalName,
      displayName: organization.displayName,
      organizationType: organization.organizationType,
      status: organization.status,
      verificationStatus: organization.verificationStatus,
      countryCode: organization.countryCode,
      website: organization.website,
      createdAt: organization.createdAt,
      memberCount: organization._count.members,
      membership: membership
        ? {
            id: membership.id,
            membershipStatus: membership.membershipStatus,
            isOwner: membership.isOwner,
            joinedAt: membership.joinedAt,
            roles: membership.roles
              .map(({ role }) => role)
              .filter((role) => isRoleCompatibleWithOrganization(role, organization.organizationType))
              .map(({ id, code, name }) => ({ id, code, name })),
          }
        : null,
    };
  }
}
