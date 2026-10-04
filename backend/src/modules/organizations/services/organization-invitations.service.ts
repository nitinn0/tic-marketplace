import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';

import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../../../common/audit/audit-actions.js';
import { AuditService } from '../../../common/audit/audit.service.js';
import { MailService } from '../../../common/mail/mail.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import type { OrganizationAccessContext } from '../../rbac/services/organization-access.service.js';
import { isRoleCompatibleWithOrganization } from '../../rbac/utils/role-scope.util.js';
import { DEFAULT_INVITATION_TTL_HOURS } from '../organization.constants.js';
import { OrganizationRolesService } from './organization-roles.service.js';

export function hashInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class OrganizationInvitationsService {
  private readonly logger = new Logger(OrganizationInvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly organizationRoles: OrganizationRolesService,
  ) {}

  async invite(actorId: string, context: OrganizationAccessContext, input: { email: string; roleId: string }) {
    const email = input.email.trim().toLowerCase();
    const organizationId = context.organization.id;

    const role = await this.organizationRoles.getAssignableRole(input.roleId, context.organization.organizationType);
    await this.organizationRoles.assertCanGrant(context, role);

    const [actor, invitee] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: actorId }, select: { email: true, firstName: true, lastName: true } }),
      this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
    ]);

    if (actor.email.toLowerCase() === email) {
      throw new BadRequestException('You cannot invite yourself');
    }

    if (invitee) {
      const existing = await this.prisma.organizationUser.findUnique({
        where: { organizationId_userId: { organizationId, userId: invitee.id } },
        select: { membershipStatus: true },
      });
      if (existing?.membershipStatus === 'ACTIVE') {
        throw new ConflictException('This user is already an active member of the organization');
      }
      if (existing?.membershipStatus === 'SUSPENDED') {
        throw new ConflictException('This user is suspended in the organization; reactivate the membership instead');
      }
    }

    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.invitationTtlHours() * 60 * 60 * 1000);

    const invitation = await this.prisma.$transaction(async (tx) => {
      // One pending invitation per email and organization: re-inviting supersedes the old link.
      await tx.organizationInvitation.updateMany({
        where: { organizationId, email, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });

      const created = await tx.organizationInvitation.create({
        data: {
          organizationId,
          email,
          invitedByUserId: actorId,
          roleId: role.id,
          tokenHash: hashInvitationToken(token),
          expiresAt,
        },
      });

      if (invitee) {
        await tx.organizationUser.upsert({
          where: { organizationId_userId: { organizationId, userId: invitee.id } },
          create: { organizationId, userId: invitee.id, membershipStatus: 'INVITED', invitedAt: now },
          update: { membershipStatus: 'INVITED', invitedAt: now, isOwner: false },
        });
      }

      await this.audit.log(
        {
          action: AUDIT_ACTIONS.memberInvited,
          entityType: AUDIT_ENTITIES.organizationInvitation,
          entityId: created.id,
          actorUserId: actorId,
          organizationId,
          targetUserId: invitee?.id ?? null,
          metadata: { email, roleId: role.id, roleCode: role.code, expiresAt: expiresAt.toISOString() },
        },
        tx,
      );

      return created;
    });

    const acceptUrl = this.buildAcceptUrl(token);
    let emailDelivered = true;
    try {
      await this.mail.send({
        to: email,
        subject: `You're invited to join ${context.organization.displayName} on TIC Marketplace`,
        text: [
          `${actor.firstName} ${actor.lastName}`.trim() + ` invited you to join ${context.organization.displayName} as ${role.name}.`,
          '',
          `Accept the invitation: ${acceptUrl}`,
          '',
          `This link expires on ${expiresAt.toUTCString()}.`,
        ].join('\n'),
      });
    } catch (error) {
      emailDelivered = false;
      this.logger.error(`Failed to send invitation ${invitation.id}`, error as Error);
    }

    return {
      invitation: this.toResponse({ ...invitation, role }),
      emailDelivered,
      ...(this.exposeTokens() ? { devAcceptUrl: acceptUrl, devToken: token } : {}),
    };
  }

  async listPending(context: OrganizationAccessContext) {
    await this.expireStale(context.organization.id);
    const invitations = await this.prisma.organizationInvitation.findMany({
      where: { organizationId: context.organization.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        role: { select: { id: true, code: true, name: true } },
        invitedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    return invitations.map((invitation) => this.toResponse(invitation));
  }

  async cancel(actorId: string, context: OrganizationAccessContext, invitationId: string) {
    const organizationId = context.organization.id;
    const invitation = await this.prisma.organizationInvitation.findFirst({
      where: { id: invitationId, organizationId, status: 'PENDING' },
    });
    if (!invitation) {
      throw new NotFoundException('Pending invitation not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.organizationInvitation.update({ where: { id: invitation.id }, data: { status: 'CANCELLED' } });

      const invitee = await tx.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
      if (invitee) {
        await tx.organizationUser.updateMany({
          where: { organizationId, userId: invitee.id, membershipStatus: 'INVITED' },
          data: { membershipStatus: 'REMOVED' },
        });
      }

      await this.audit.log(
        {
          action: AUDIT_ACTIONS.invitationCancelled,
          entityType: AUDIT_ENTITIES.organizationInvitation,
          entityId: invitation.id,
          actorUserId: actorId,
          organizationId,
          targetUserId: invitee?.id ?? null,
          metadata: { email: invitation.email },
        },
        tx,
      );
    });

    return { success: true };
  }

  async preview(token: string) {
    const invitation = await this.findByToken(token);
    return {
      email: invitation.email,
      status: this.effectiveStatus(invitation),
      expiresAt: invitation.expiresAt,
      organization: {
        displayName: invitation.organization.displayName,
        organizationType: invitation.organization.organizationType,
      },
      role: { name: invitation.role.name },
      invitedBy: invitation.invitedBy
        ? { firstName: invitation.invitedBy.firstName, lastName: invitation.invitedBy.lastName }
        : null,
    };
  }

  async accept(actorId: string, token: string) {
    const invitation = await this.findByToken(token);
    const status = this.effectiveStatus(invitation);

    if (status === 'EXPIRED' && invitation.status === 'PENDING') {
      await this.prisma.organizationInvitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
    }
    if (status !== 'PENDING') {
      throw new GoneException(`This invitation is ${status.toLowerCase()}`);
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actorId }, select: { email: true, status: true } });
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('User account is not active');
    }
    if (user.email.toLowerCase() !== invitation.email) {
      throw new ForbiddenException('This invitation was issued to a different email address');
    }
    if (invitation.organization.status !== 'ACTIVE') {
      throw new BadRequestException('This organization is not accepting new members');
    }
    if (!isRoleCompatibleWithOrganization(invitation.role, invitation.organization.organizationType)) {
      throw new BadRequestException('The role on this invitation is no longer available');
    }

    const organizationId = invitation.organizationId;
    const now = new Date();

    const membership = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.organizationInvitation.updateMany({
        where: { id: invitation.id, status: 'PENDING' },
        data: { status: 'ACCEPTED', acceptedAt: now, acceptedByUserId: actorId },
      });
      if (claimed.count === 0) {
        throw new ConflictException('This invitation has already been used');
      }

      const existing = await tx.organizationUser.findUnique({
        where: { organizationId_userId: { organizationId, userId: actorId } },
      });
      if (existing?.membershipStatus === 'SUSPENDED') {
        throw new ForbiddenException('Your membership in this organization is suspended');
      }
      if (existing?.membershipStatus === 'ACTIVE') {
        throw new ConflictException('You are already an active member of this organization');
      }

      const member = existing
        ? await tx.organizationUser.update({
            where: { id: existing.id },
            data: { membershipStatus: 'ACTIVE', joinedAt: now, isOwner: false, invitedAt: existing.invitedAt ?? invitation.createdAt },
          })
        : await tx.organizationUser.create({
            data: {
              organizationId,
              userId: actorId,
              membershipStatus: 'ACTIVE',
              joinedAt: now,
              invitedAt: invitation.createdAt,
            },
          });

      await tx.organizationUserRole.createMany({
        data: [{ organizationUserId: member.id, roleId: invitation.roleId }],
        skipDuplicates: true,
      });

      await this.audit.log(
        {
          action: AUDIT_ACTIONS.memberAccepted,
          entityType: AUDIT_ENTITIES.organizationInvitation,
          entityId: invitation.id,
          actorUserId: actorId,
          organizationId,
          targetUserId: actorId,
          metadata: { memberId: member.id, invitedBy: invitation.invitedByUserId },
        },
        tx,
      );
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.roleAssigned,
          entityType: AUDIT_ENTITIES.organizationMemberRole,
          entityId: member.id,
          actorUserId: invitation.invitedByUserId,
          organizationId,
          targetUserId: actorId,
          metadata: { memberId: member.id, roleId: invitation.roleId, roleCode: invitation.role.code, via: 'invitation' },
        },
        tx,
      );

      return member;
    });

    return {
      organization: {
        id: invitation.organization.id,
        displayName: invitation.organization.displayName,
        organizationType: invitation.organization.organizationType,
      },
      membership: {
        id: membership.id,
        membershipStatus: membership.membershipStatus,
        isOwner: membership.isOwner,
        joinedAt: membership.joinedAt,
      },
      role: { id: invitation.role.id, code: invitation.role.code, name: invitation.role.name },
    };
  }

  private async findByToken(token: string) {
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { tokenHash: hashInvitationToken(token) },
      include: {
        organization: { select: { id: true, displayName: true, organizationType: true, status: true } },
        role: { select: { id: true, code: true, name: true, organizationType: true, isActive: true } },
        invitedBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    return invitation;
  }

  private effectiveStatus(invitation: { status: string; expiresAt: Date }) {
    return invitation.status === 'PENDING' && invitation.expiresAt <= new Date() ? 'EXPIRED' : invitation.status;
  }

  private async expireStale(organizationId: string) {
    await this.prisma.organizationInvitation.updateMany({
      where: { organizationId, status: 'PENDING', expiresAt: { lte: new Date() } },
      data: { status: 'EXPIRED' },
    });
  }

  private invitationTtlHours() {
    const configured = Number(this.config.get<string>('ORG_INVITATION_TTL_HOURS'));
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_INVITATION_TTL_HOURS;
  }

  /** Lets local development and tests complete the flow without an email provider. */
  private exposeTokens() {
    const configured = this.config.get<string>('ORG_INVITATION_EXPOSE_TOKEN');
    if (configured !== undefined) {
      return configured === 'true';
    }
    return (this.config.get<string>('app.nodeEnv') ?? 'development') !== 'production';
  }

  private buildAcceptUrl(token: string) {
    const frontendUrl = (this.config.get<string>('app.frontendUrl') ?? 'http://localhost:3000').replace(/\/$/, '');
    return `${frontendUrl}/invitations/accept?token=${encodeURIComponent(token)}`;
  }

  private toResponse(invitation: {
    id: string;
    organizationId: string;
    email: string;
    status: string;
    expiresAt: Date;
    createdAt: Date;
    acceptedAt: Date | null;
    role: { id: string; code: string; name: string };
    invitedBy?: { id: string; email: string; firstName: string; lastName: string } | null;
  }) {
    return {
      id: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      acceptedAt: invitation.acceptedAt,
      role: { id: invitation.role.id, code: invitation.role.code, name: invitation.role.name },
      invitedBy: invitation.invitedBy ?? null,
    };
  }
}
