import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../../common/audit/audit-actions.js';
import { AuditService } from '../../common/audit/audit.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class AdminProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(verificationStatus?: string) {
    const rows = await this.prisma.providerProfile.findMany({
      where: verificationStatus
        ? { verificationStatus: verificationStatus as 'PENDING' | 'VERIFIED' | 'REJECTED' }
        : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { id: true, displayName: true, legalName: true, status: true, description: true } },
        services: {
          include: { service: { select: { id: true, name: true, slug: true } } },
          orderBy: { createdAt: 'asc' },
          take: 40,
        },
        _count: { select: { services: true } },
      },
      take: 200,
    });
    const pendingCount = await this.prisma.providerProfile.count({ where: { verificationStatus: 'PENDING' } });
    return {
      pendingCount,
      providers: rows.map((row) => ({
        id: row.id,
        organizationId: row.organizationId,
        organizationName: row.organization.displayName,
        legalName: row.organization.legalName,
        organizationStatus: row.organization.status,
        organizationDescription: row.organization.description,
        providerTypes: row.providerTypes,
        headline: row.headline,
        description: row.description,
        publicProfile: row.publicProfile,
        verificationStatus: row.verificationStatus,
        verifiedAt: row.verifiedAt,
        serviceCount: row._count.services,
        services: row.services.map((link) => ({
          id: link.service.id,
          name: link.service.name,
          slug: link.service.slug,
        })),
        createdAt: row.createdAt,
      })),
    };
  }

  async verify(actorId: string, providerId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
      include: { organization: { select: { displayName: true } } },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');
    if (profile.verificationStatus === 'VERIFIED') {
      throw new BadRequestException('This provider is already verified');
    }

    const updated = await this.prisma.providerProfile.update({
      where: { id: providerId },
      data: { verificationStatus: 'VERIFIED', verifiedAt: new Date(), publicProfile: true },
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.providerVerified,
      entityType: AUDIT_ENTITIES.providerProfile,
      entityId: providerId,
      organizationId: profile.organizationId,
      actorUserId: actorId,
    });
    const users = await this.notifications.userIdsForOrganization(profile.organizationId);
    await this.notifications.createMany(
      users.map((userId) => ({
        userId,
        type: 'PROVIDER_VERIFIED',
        title: 'Provider verified',
        body: `${profile.organization.displayName} is now verified on TIC Marketplace.`,
        entityType: 'provider',
        entityId: providerId,
      })),
    );
    return updated;
  }

  async reject(actorId: string, providerId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
      include: { organization: { select: { displayName: true } } },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    const updated = await this.prisma.providerProfile.update({
      where: { id: providerId },
      data: { verificationStatus: 'REJECTED', verifiedAt: null },
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.providerVerificationRejected,
      entityType: AUDIT_ENTITIES.providerProfile,
      entityId: providerId,
      organizationId: profile.organizationId,
      actorUserId: actorId,
    });
    const users = await this.notifications.userIdsForOrganization(profile.organizationId);
    await this.notifications.createMany(
      users.map((userId) => ({
        userId,
        type: 'PROVIDER_VERIFICATION_REJECTED',
        title: 'Verification rejected',
        body: `Verification for ${profile.organization.displayName} was rejected. Update the profile and request review again.`,
        entityType: 'provider',
        entityId: providerId,
      })),
    );
    return updated;
  }
}
