import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../../common/audit/audit-actions.js';
import { AuditService } from '../../common/audit/audit.service.js';
import { MailService } from '../../common/mail/mail.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class AdminEmailChangesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  async list(status?: string) {
    const rows = await this.prisma.emailChangeToken.findMany({
      where: status
        ? { status: status as 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'OTP_PENDING' | 'CANCELLED' }
        : { status: { in: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
        reviewedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    return {
      requests: rows.map((row) => ({
        id: row.id,
        status: row.status,
        currentEmail: row.currentEmail,
        newEmail: row.newEmail,
        createdAt: row.createdAt,
        otpVerifiedAt: row.otpVerifiedAt,
        reviewedAt: row.reviewedAt,
        reviewNote: row.reviewNote,
        user: row.user,
        reviewedBy: row.reviewedBy,
      })),
    };
  }

  async approve(actorId: string, requestId: string) {
    const request = await this.prisma.emailChangeToken.findUnique({
      where: { id: requestId },
      include: { user: true },
    });
    if (!request) throw new NotFoundException('Email change request not found');
    if (request.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only pending approval requests can be approved');
    }

    const taken = await this.prisma.user.findUnique({ where: { email: request.newEmail } });
    if (taken && taken.id !== request.userId) {
      throw new BadRequestException('An account with this email already exists');
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const nextUser = await tx.user.update({
        where: { id: request.userId },
        data: { email: request.newEmail, emailVerifiedAt: new Date() },
      });
      await tx.emailChangeToken.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          reviewedByUserId: actorId,
          reviewedAt: new Date(),
        },
      });
      await tx.emailChangeToken.updateMany({
        where: {
          userId: request.userId,
          id: { not: request.id },
          status: { in: ['OTP_PENDING', 'PENDING_APPROVAL'] },
        },
        data: { status: 'CANCELLED', usedAt: new Date() },
      });
      await tx.refreshToken.updateMany({
        where: { userId: request.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return nextUser;
    });

    await this.audit.log({
      action: AUDIT_ACTIONS.emailChangeApproved,
      entityType: AUDIT_ENTITIES.emailChange,
      entityId: request.id,
      actorUserId: actorId,
      targetUserId: request.userId,
      metadata: { currentEmail: request.currentEmail, newEmail: request.newEmail },
    });

    await this.notifications.create({
      userId: request.userId,
      type: 'EMAIL_CHANGE_APPROVED',
      title: 'Email change approved',
      body: `Your sign-in email is now ${request.newEmail}. Sign in again with the new address.`,
      entityType: 'email_change',
      entityId: request.id,
    });

    await this.mail.send({
      to: request.newEmail,
      subject: 'Your TIC Marketplace email was updated',
      text: `A platform administrator approved your email change. Your sign-in email is now ${request.newEmail}.\n`,
      html: `<p>A platform administrator approved your email change.</p><p>Your sign-in email is now <strong>${request.newEmail}</strong>.</p>`,
    });

    return {
      id: request.id,
      status: 'APPROVED' as const,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
      },
    };
  }

  async reject(actorId: string, requestId: string, note?: string) {
    const request = await this.prisma.emailChangeToken.findUnique({
      where: { id: requestId },
      include: { user: true },
    });
    if (!request) throw new NotFoundException('Email change request not found');
    if (request.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only pending approval requests can be rejected');
    }

    await this.prisma.emailChangeToken.update({
      where: { id: request.id },
      data: {
        status: 'REJECTED',
        reviewedByUserId: actorId,
        reviewedAt: new Date(),
        reviewNote: note?.trim() || null,
      },
    });

    await this.audit.log({
      action: AUDIT_ACTIONS.emailChangeRejected,
      entityType: AUDIT_ENTITIES.emailChange,
      entityId: request.id,
      actorUserId: actorId,
      targetUserId: request.userId,
      metadata: { currentEmail: request.currentEmail, newEmail: request.newEmail, note: note?.trim() || null },
    });

    await this.notifications.create({
      userId: request.userId,
      type: 'EMAIL_CHANGE_REJECTED',
      title: 'Email change rejected',
      body: `Your request to change email to ${request.newEmail} was rejected. Your current email remains ${request.currentEmail}.`,
      entityType: 'email_change',
      entityId: request.id,
    });

    await this.mail.send({
      to: request.currentEmail,
      subject: 'Your TIC Marketplace email change was rejected',
      text: `A platform administrator rejected your request to change email to ${request.newEmail}. Your current email remains ${request.currentEmail}.\n`,
      html: `<p>A platform administrator rejected your request to change email to <strong>${request.newEmail}</strong>.</p><p>Your current email remains <strong>${request.currentEmail}</strong>.</p>`,
    });

    return { id: request.id, status: 'REJECTED' as const };
  }
}
