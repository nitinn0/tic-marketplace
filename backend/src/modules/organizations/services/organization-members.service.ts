import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrganizationMembershipStatus, Prisma } from '@prisma/client';

import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../../../common/audit/audit-actions.js';
import { AuditService } from '../../../common/audit/audit.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import type { OrganizationAccessContext } from '../../rbac/services/organization-access.service.js';
import { isRoleCompatibleWithOrganization } from '../../rbac/utils/role-scope.util.js';
import { countActiveOwners, isUniqueViolation, lockOrganization } from '../organization.utils.js';
import { OrganizationRolesService } from './organization-roles.service.js';

const memberSelect = {
  id: true,
  organizationId: true,
  userId: true,
  membershipStatus: true,
  isOwner: true,
  joinedAt: true,
  invitedAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
  roles: {
    orderBy: { createdAt: 'asc' },
    select: {
      createdAt: true,
      role: { select: { id: true, code: true, name: true, organizationType: true, isActive: true } },
    },
  },
} satisfies Prisma.OrganizationUserSelect;

type MemberRecord = Prisma.OrganizationUserGetPayload<{ select: typeof memberSelect }>;

@Injectable()
export class OrganizationMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly organizationRoles: OrganizationRolesService,
  ) {}

  async list(context: OrganizationAccessContext, includeRemoved = false) {
    const members = await this.prisma.organizationUser.findMany({
      where: {
        organizationId: context.organization.id,
        ...(includeRemoved ? {} : { membershipStatus: { not: 'REMOVED' } }),
      },
      orderBy: [{ isOwner: 'desc' }, { joinedAt: 'asc' }, { createdAt: 'asc' }],
      select: memberSelect,
    });
    return members.map((member) => this.toResponse(member, context));
  }

  async getMember(context: OrganizationAccessContext, memberId: string) {
    return this.toResponse(await this.findMember(context, memberId), context);
  }

  async listRoles(context: OrganizationAccessContext, memberId: string) {
    const member = await this.findMember(context, memberId);
    return this.toResponse(member, context).roles;
  }

  async updateStatus(
    actorId: string,
    context: OrganizationAccessContext,
    memberId: string,
    nextStatus: 'ACTIVE' | 'SUSPENDED',
  ) {
    const organizationId = context.organization.id;

    await this.prisma.$transaction(async (tx) => {
      await lockOrganization(tx, organizationId);
      const member = await this.findMember(context, memberId, tx);

      if (member.userId === actorId) {
        throw new BadRequestException('You cannot change your own membership status');
      }
      if (member.membershipStatus === nextStatus) {
        return;
      }

      const allowed: Partial<Record<OrganizationMembershipStatus, OrganizationMembershipStatus>> = {
        ACTIVE: 'SUSPENDED',
        SUSPENDED: 'ACTIVE',
      };
      if (allowed[member.membershipStatus] !== nextStatus) {
        throw new BadRequestException(
          `Cannot change membership from ${member.membershipStatus} to ${nextStatus}`,
        );
      }

      this.assertCanManageOwner(context, member);

      if (nextStatus === 'SUSPENDED' && member.isOwner && (await countActiveOwners(tx, organizationId, member.id)) === 0) {
        throw new ConflictException('Cannot suspend the last active owner. Transfer ownership first.');
      }

      await tx.organizationUser.update({ where: { id: member.id }, data: { membershipStatus: nextStatus } });

      await this.audit.log(
        {
          action: nextStatus === 'SUSPENDED' ? AUDIT_ACTIONS.memberSuspended : AUDIT_ACTIONS.memberReactivated,
          entityType: AUDIT_ENTITIES.organizationMember,
          entityId: member.id,
          actorUserId: actorId,
          organizationId,
          targetUserId: member.userId,
          metadata: { from: member.membershipStatus, to: nextStatus, accessVia: context.accessVia },
        },
        tx,
      );
    });

    return this.getMember(context, memberId);
  }

  async remove(actorId: string, context: OrganizationAccessContext, memberId: string) {
    return this.removeMembership(actorId, context, memberId, AUDIT_ACTIONS.memberRemoved);
  }

  async leave(actorId: string, context: OrganizationAccessContext) {
    return this.removeMembership(actorId, context, context.membership!.id, AUDIT_ACTIONS.memberLeft);
  }

  async transferOwnership(actorId: string, context: OrganizationAccessContext, memberId: string) {
    const organizationId = context.organization.id;

    await this.prisma.$transaction(async (tx) => {
      await lockOrganization(tx, organizationId);
      const target = await this.findMember(context, memberId, tx);

      if (target.userId === actorId) {
        throw new BadRequestException('You cannot transfer ownership to yourself');
      }
      if (target.membershipStatus !== 'ACTIVE') {
        throw new BadRequestException('Ownership can only be transferred to an active member');
      }

      const actorMembership = await tx.organizationUser.findUnique({
        where: { organizationId_userId: { organizationId, userId: actorId } },
        select: { id: true, isOwner: true, membershipStatus: true },
      });
      const actorIsActiveOwner = actorMembership?.isOwner && actorMembership.membershipStatus === 'ACTIVE';
      if (!actorIsActiveOwner && !context.hasPlatformAccess) {
        throw new ForbiddenException('Only an active owner can transfer ownership');
      }

      const previousOwners = await tx.organizationUser.findMany({
        where: { organizationId, isOwner: true, id: { not: target.id } },
        select: { id: true, userId: true },
      });

      // An owner hands over their own ownership; a platform operator replaces all current owners.
      const demote = actorIsActiveOwner ? previousOwners.filter((owner) => owner.userId === actorId) : previousOwners;

      await tx.organizationUser.update({ where: { id: target.id }, data: { isOwner: true } });
      if (demote.length > 0) {
        await tx.organizationUser.updateMany({
          where: { id: { in: demote.map((owner) => owner.id) } },
          data: { isOwner: false },
        });
      }

      if ((await countActiveOwners(tx, organizationId)) === 0) {
        throw new ConflictException('Ownership transfer would leave the organization without an active owner');
      }

      await this.audit.log(
        {
          action: AUDIT_ACTIONS.ownershipTransferred,
          entityType: AUDIT_ENTITIES.organizationMember,
          entityId: target.id,
          actorUserId: actorId,
          organizationId,
          targetUserId: target.userId,
          metadata: {
            toMemberId: target.id,
            toUserId: target.userId,
            fromUserIds: demote.map((owner) => owner.userId),
            accessVia: context.accessVia,
          },
        },
        tx,
      );
    });

    return this.list(context);
  }

  async assignRole(actorId: string, context: OrganizationAccessContext, memberId: string, roleId: string) {
    const member = await this.findMember(context, memberId);
    if (member.userId === actorId) {
      throw new ForbiddenException('You cannot change your own organization roles');
    }
    if (member.membershipStatus !== 'ACTIVE') {
      throw new BadRequestException('Roles can only be assigned to active members');
    }

    const role = await this.organizationRoles.getAssignableRole(roleId, context.organization.organizationType);
    await this.organizationRoles.assertCanGrant(context, role);

    try {
      await this.prisma.$transaction(async (tx) => {
        const assignment = await tx.organizationUserRole.create({
          data: { organizationUserId: member.id, roleId: role.id },
        });
        await this.audit.log(
          {
            action: AUDIT_ACTIONS.roleAssigned,
            entityType: AUDIT_ENTITIES.organizationMemberRole,
            entityId: assignment.id,
            actorUserId: actorId,
            organizationId: context.organization.id,
            targetUserId: member.userId,
            metadata: { memberId: member.id, roleId: role.id, roleCode: role.code, accessVia: context.accessVia },
          },
          tx,
        );
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Member already has this role');
      }
      throw error;
    }

    return this.listRoles(context, memberId);
  }

  async removeRole(actorId: string, context: OrganizationAccessContext, memberId: string, roleId: string) {
    const member = await this.findMember(context, memberId);
    if (member.userId === actorId) {
      throw new ForbiddenException('You cannot change your own organization roles');
    }

    const assignment = member.roles.find(({ role }) => role.id === roleId);
    if (!assignment) {
      throw new NotFoundException('Member does not have this role');
    }
    await this.organizationRoles.assertCanGrant(context, assignment.role);

    await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.organizationUserRole.deleteMany({
        where: { organizationUserId: member.id, roleId },
      });
      if (deleted.count === 0) {
        throw new NotFoundException('Member does not have this role');
      }
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.roleRemoved,
          entityType: AUDIT_ENTITIES.organizationMemberRole,
          entityId: member.id,
          actorUserId: actorId,
          organizationId: context.organization.id,
          targetUserId: member.userId,
          metadata: { memberId: member.id, roleId, roleCode: assignment.role.code, accessVia: context.accessVia },
        },
        tx,
      );
    });

    return this.listRoles(context, memberId);
  }

  private async removeMembership(
    actorId: string,
    context: OrganizationAccessContext,
    memberId: string,
    action: typeof AUDIT_ACTIONS.memberRemoved | typeof AUDIT_ACTIONS.memberLeft,
  ) {
    const organizationId = context.organization.id;

    await this.prisma.$transaction(async (tx) => {
      await lockOrganization(tx, organizationId);
      const member = await this.findMember(context, memberId, tx);

      if (member.membershipStatus === 'REMOVED') {
        throw new BadRequestException('Member has already been removed');
      }
      if (member.userId !== actorId) {
        this.assertCanManageOwner(context, member);
      }
      if (
        member.isOwner &&
        member.membershipStatus === 'ACTIVE' &&
        (await countActiveOwners(tx, organizationId, member.id)) === 0
      ) {
        throw new ConflictException('Cannot remove the last active owner. Transfer ownership first.');
      }

      // Role assignments are dropped so a later re-invitation starts from a clean slate;
      // the audit record keeps what the member held.
      const removedRoles = member.roles.map(({ role }) => role.code);
      await tx.organizationUserRole.deleteMany({ where: { organizationUserId: member.id } });
      await tx.organizationUser.update({
        where: { id: member.id },
        data: { membershipStatus: 'REMOVED', isOwner: false },
      });
      // Otherwise a removed (still INVITED) member could rejoin with an outstanding link.
      const cancelledInvitations = await tx.organizationInvitation.updateMany({
        where: { organizationId, status: 'PENDING', email: { equals: member.user.email, mode: 'insensitive' } },
        data: { status: 'CANCELLED' },
      });

      await this.audit.log(
        {
          action,
          entityType: AUDIT_ENTITIES.organizationMember,
          entityId: member.id,
          actorUserId: actorId,
          organizationId,
          targetUserId: member.userId,
          metadata: {
            previousStatus: member.membershipStatus,
            wasOwner: member.isOwner,
            removedRoles,
            cancelledInvitations: cancelledInvitations.count,
            accessVia: context.accessVia,
          },
        },
        tx,
      );
    });

    return { success: true };
  }

  /** Non-owners may not suspend or remove owners; platform operators may. */
  private assertCanManageOwner(context: OrganizationAccessContext, member: { isOwner: boolean }) {
    if (member.isOwner && !context.membership?.isOwner && !context.hasPlatformAccess) {
      throw new ForbiddenException("Only an owner can change another owner's membership");
    }
  }

  private async findMember(
    context: OrganizationAccessContext,
    memberId: string,
    client: Pick<Prisma.TransactionClient, 'organizationUser'> = this.prisma,
  ): Promise<MemberRecord> {
    // Scoping by organization id prevents acting on another organization's members.
    const member = await client.organizationUser.findFirst({
      where: { id: memberId, organizationId: context.organization.id },
      select: memberSelect,
    });
    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }
    return member;
  }

  private toResponse(member: MemberRecord, context: OrganizationAccessContext) {
    return {
      id: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      user: member.user,
      membershipStatus: member.membershipStatus,
      isOwner: member.isOwner,
      joinedAt: member.joinedAt,
      invitedAt: member.invitedAt,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      roles: member.roles
        .filter(({ role }) => isRoleCompatibleWithOrganization(role, context.organization.organizationType))
        .map(({ role, createdAt }) => ({ id: role.id, code: role.code, name: role.name, assignedAt: createdAt })),
    };
  }
}
