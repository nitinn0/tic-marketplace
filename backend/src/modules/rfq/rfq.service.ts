import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../../common/audit/audit-actions.js';
import { AuditService } from '../../common/audit/audit.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PUBLIC_PROVIDER_PROFILE_WHERE } from '../providers/provider-visibility.js';
import type { OrganizationAccessContext } from '../rbac/services/organization-access.service.js';
import { locationLabel } from '../taxonomy/utils/location.util.js';
import { ancestorsOf, buildTreeIndex } from '../taxonomy/utils/tree.util.js';
import { CreateRfqDto, SubmitQuoteDto } from './dto/rfq.dto.js';
import { asReasonList, locationMatches, rankProviders, scrubBuyerIdentity } from './rfq-matching.js';

const buyerInclude = {
  service: { select: { id: true, name: true, slug: true, categoryId: true } },
  dispatches: {
    orderBy: { matchScore: 'desc' as const },
    include: {
      provider: {
        include: { organization: { select: { displayName: true } } },
      },
    },
  },
  quotes: {
    where: { status: { not: 'WITHDRAWN' as const } },
    orderBy: [{ status: 'asc' as const }, { amount: 'asc' as const }],
    include: {
      provider: { include: { organization: { select: { id: true, displayName: true } } } },
    },
  },
} satisfies Prisma.RfqInclude;

@Injectable()
export class RfqService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(context: OrganizationAccessContext, userId: string, dto: CreateRfqDto) {
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, active: true },
      include: { category: true },
    });
    if (!service) throw new NotFoundException('Service not found');

    const matches = await this.matchProviders(service.id, service.categoryId, dto.location);
    const rfq = await this.prisma.rfq.create({
      data: {
        buyerOrganizationId: context.organization.id,
        createdByUserId: userId,
        serviceId: service.id,
        title: dto.title,
        description: dto.description,
        locationLabel: dto.location,
        siteCount: dto.siteCount,
        employeeCount: dto.employeeCount,
        timeline: dto.timeline?.trim() || null,
        dispatches: {
          create: matches.map((match) => ({
            providerId: match.providerId,
            matchScore: match.score,
            matchReasons: match.reasons,
          })),
        },
      },
      include: buyerInclude,
    });
    return this.toBuyerView(rfq);
  }

  async listForBuyer(context: OrganizationAccessContext) {
    const rows = await this.prisma.rfq.findMany({
      where: { buyerOrganizationId: context.organization.id },
      orderBy: { createdAt: 'desc' },
      include: buyerInclude,
    });
    return { rfqs: rows.map((row) => this.toBuyerView(row)) };
  }

  async getForBuyer(context: OrganizationAccessContext, rfqId: string) {
    const rfq = await this.prisma.rfq.findFirst({
      where: { id: rfqId, buyerOrganizationId: context.organization.id },
      include: buyerInclude,
    });
    if (!rfq) throw new NotFoundException('RFQ not found');
    return this.toBuyerView(rfq);
  }

  async acceptQuote(context: OrganizationAccessContext, actorId: string, rfqId: string, quoteId: string) {
    const rfq = await this.prisma.rfq.findFirst({
      where: { id: rfqId, buyerOrganizationId: context.organization.id },
      include: { quotes: true },
    });
    if (!rfq) throw new NotFoundException('RFQ not found');
    if (rfq.status !== 'OPEN') throw new BadRequestException('This RFQ is already closed');

    const quote = rfq.quotes.find((row) => row.id === quoteId);
    if (!quote || quote.status !== 'SUBMITTED') {
      throw new BadRequestException('Only a submitted quote can be accepted');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rfqQuote.update({ where: { id: quote.id }, data: { status: 'ACCEPTED' } });
      await tx.rfqQuote.updateMany({
        where: { rfqId, id: { not: quote.id }, status: 'SUBMITTED' },
        data: { status: 'REJECTED' },
      });
      await tx.rfq.update({ where: { id: rfqId }, data: { status: 'CLOSED' } });
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.rfqQuoteAccepted,
          entityType: AUDIT_ENTITIES.rfqQuote,
          entityId: quote.id,
          organizationId: context.organization.id,
          actorUserId: actorId,
          metadata: { rfqId, providerId: quote.providerId },
        },
        tx,
      );
    });

    const rejected = rfq.quotes.filter((row) => row.id !== quote.id && row.status === 'SUBMITTED');
    await this.notifyProviders(
      quote.providerId,
      {
        type: 'QUOTE_ACCEPTED',
        title: 'Your quote was accepted',
        body: `A buyer accepted your quote on “${rfq.title}”.`,
        entityType: 'rfq',
        entityId: rfqId,
      },
      rejected.map((row) => row.providerId),
      {
        type: 'QUOTE_REJECTED',
        title: 'RFQ awarded to another provider',
        body: `The buyer closed “${rfq.title}” with another quote.`,
        entityType: 'rfq',
        entityId: rfqId,
      },
    );

    return this.getForBuyer(context, rfqId);
  }

  async closeRfq(context: OrganizationAccessContext, actorId: string, rfqId: string) {
    const rfq = await this.prisma.rfq.findFirst({
      where: { id: rfqId, buyerOrganizationId: context.organization.id },
      include: { quotes: { where: { status: 'SUBMITTED' } } },
    });
    if (!rfq) throw new NotFoundException('RFQ not found');
    if (rfq.status !== 'OPEN') throw new BadRequestException('This RFQ is already closed');

    await this.prisma.$transaction(async (tx) => {
      await tx.rfqQuote.updateMany({
        where: { rfqId, status: 'SUBMITTED' },
        data: { status: 'REJECTED' },
      });
      await tx.rfq.update({ where: { id: rfqId }, data: { status: 'CLOSED' } });
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.rfqClosed,
          entityType: AUDIT_ENTITIES.rfq,
          entityId: rfqId,
          organizationId: context.organization.id,
          actorUserId: actorId,
          metadata: { reason: 'buyer_closed_without_award' },
        },
        tx,
      );
    });

    await this.notifyProviders(
      null,
      null,
      rfq.quotes.map((row) => row.providerId),
      {
        type: 'RFQ_CLOSED',
        title: 'RFQ closed',
        body: `The buyer closed “${rfq.title}” without accepting a quote.`,
        entityType: 'rfq',
        entityId: rfqId,
      },
    );

    return this.getForBuyer(context, rfqId);
  }

  async listForProvider(context: OrganizationAccessContext) {
    const profile = await this.profileFor(context.organization.id);
    if (!profile) return { rfqs: [] };
    const dispatches = await this.prisma.rfqDispatch.findMany({
      where: { providerId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: { rfq: { include: this.providerRfqInclude(profile.id) } },
    });
    return {
      rfqs: dispatches.map((dispatch) => this.toProviderView(dispatch.rfq, dispatch.matchReasons)),
    };
  }

  async getForProvider(context: OrganizationAccessContext, rfqId: string) {
    const profile = await this.requireProfile(context.organization.id);
    const dispatch = await this.prisma.rfqDispatch.findUnique({
      where: { rfqId_providerId: { rfqId, providerId: profile.id } },
      include: { rfq: { include: this.providerRfqInclude(profile.id) } },
    });
    if (!dispatch) throw new NotFoundException('RFQ not found');
    return this.toProviderView(dispatch.rfq, dispatch.matchReasons);
  }

  async submitQuote(context: OrganizationAccessContext, userId: string, rfqId: string, dto: SubmitQuoteDto) {
    const profile = await this.requireProfile(context.organization.id);
    const dispatch = await this.prisma.rfqDispatch.findUnique({
      where: { rfqId_providerId: { rfqId, providerId: profile.id } },
      include: { rfq: true },
    });
    if (!dispatch) throw new NotFoundException('RFQ not found');
    if (dispatch.rfq.status !== 'OPEN') throw new BadRequestException('This RFQ is closed');

    const existing = await this.prisma.rfqQuote.findUnique({
      where: { rfqId_providerId: { rfqId, providerId: profile.id } },
    });
    if (existing && (existing.status === 'ACCEPTED' || existing.status === 'REJECTED')) {
      throw new BadRequestException('This quote can no longer be changed');
    }

    await this.prisma.rfqQuote.upsert({
      where: { rfqId_providerId: { rfqId, providerId: profile.id } },
      create: {
        rfqId,
        providerId: profile.id,
        submittedByUserId: userId,
        amount: dto.amount,
        currency: (dto.currency || 'INR').toUpperCase(),
        scopeNotes: dto.scopeNotes,
        exclusions: dto.exclusions?.trim() || null,
        timelineDays: dto.timelineDays ?? null,
      },
      update: {
        submittedByUserId: userId,
        amount: dto.amount,
        currency: (dto.currency || 'INR').toUpperCase(),
        scopeNotes: dto.scopeNotes,
        exclusions: dto.exclusions?.trim() || null,
        timelineDays: dto.timelineDays ?? null,
        status: 'SUBMITTED',
      },
    });

    const buyerUsers = await this.notifications.userIdsForOrganization(dispatch.rfq.buyerOrganizationId);
    await this.notifications.createMany(
      buyerUsers.map((buyerUserId) => ({
        userId: buyerUserId,
        type: 'QUOTE_SUBMITTED',
        title: 'New quote received',
        body: `A provider quoted on “${dispatch.rfq.title}”.`,
        entityType: 'rfq',
        entityId: rfqId,
      })),
    );

    return this.getForProvider(context, rfqId);
  }

  async withdrawQuote(context: OrganizationAccessContext, actorId: string, rfqId: string) {
    const profile = await this.requireProfile(context.organization.id);
    const quote = await this.prisma.rfqQuote.findUnique({
      where: { rfqId_providerId: { rfqId, providerId: profile.id } },
      include: { rfq: true },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.rfq.status !== 'OPEN') throw new BadRequestException('This RFQ is closed');
    if (quote.status !== 'SUBMITTED') throw new BadRequestException('Only a submitted quote can be withdrawn');

    await this.prisma.$transaction(async (tx) => {
      await tx.rfqQuote.update({ where: { id: quote.id }, data: { status: 'WITHDRAWN' } });
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.rfqQuoteWithdrawn,
          entityType: AUDIT_ENTITIES.rfqQuote,
          entityId: quote.id,
          organizationId: context.organization.id,
          actorUserId: actorId,
          metadata: { rfqId },
        },
        tx,
      );
    });

    return this.getForProvider(context, rfqId);
  }

  private async notifyProviders(
    awardedProviderId: string | null,
    awarded: Omit<Parameters<NotificationsService['create']>[0], 'userId'> | null,
    otherProviderIds: string[],
    other: Omit<Parameters<NotificationsService['create']>[0], 'userId'>,
  ) {
    const payloads: Parameters<NotificationsService['createMany']>[0] = [];
    if (awardedProviderId && awarded) {
      const org = await this.prisma.providerProfile.findUnique({
        where: { id: awardedProviderId },
        select: { organizationId: true },
      });
      if (org) {
        const users = await this.notifications.userIdsForOrganization(org.organizationId);
        payloads.push(...users.map((userId) => ({ userId, ...awarded })));
      }
    }
    for (const providerId of otherProviderIds) {
      const org = await this.prisma.providerProfile.findUnique({
        where: { id: providerId },
        select: { organizationId: true },
      });
      if (!org) continue;
      const users = await this.notifications.userIdsForOrganization(org.organizationId);
      payloads.push(...users.map((userId) => ({ userId, ...other })));
    }
    await this.notifications.createMany(payloads);
  }

  private async matchProviders(serviceId: string, categoryId: string, location: string) {
    const [categories, providers] = await Promise.all([
      this.prisma.serviceCategory.findMany(),
      this.prisma.providerProfile.findMany({
        where: PUBLIC_PROVIDER_PROFILE_WHERE,
        include: {
          services: { include: { service: { select: { id: true, categoryId: true } } } },
          locations: { include: { location: true } },
        },
      }),
    ]);
    const index = buildTreeIndex(categories);
    const requestedRoot = ancestorsOf(index, categoryId)[0]?.id ?? categoryId;

    return rankProviders(
      providers.map((provider) => {
        const offersService = provider.services.some((row) => row.service.id === serviceId);
        const sameCategory = provider.services.some((row) => {
          const root = ancestorsOf(index, row.service.categoryId)[0]?.id ?? row.service.categoryId;
          return root === requestedRoot;
        });
        const labels = provider.locations.map((row) => locationLabel(row.location));
        return {
          providerId: provider.id,
          offersService,
          sameCategory,
          verified: provider.verificationStatus === 'VERIFIED',
          locationMatch: locationMatches(location, labels),
          yearsInBusiness: provider.yearsInBusiness,
        };
      }),
    );
  }

  private toBuyerView(rfq: Prisma.RfqGetPayload<{ include: typeof buyerInclude }>) {
    const accepted = rfq.quotes.find((quote) => quote.status === 'ACCEPTED') ?? null;
    return {
      id: rfq.id,
      title: rfq.title,
      description: rfq.description,
      location: rfq.locationLabel,
      siteCount: rfq.siteCount,
      employeeCount: rfq.employeeCount,
      timeline: rfq.timeline,
      status: rfq.status,
      createdAt: rfq.createdAt,
      service: { id: rfq.service.id, name: rfq.service.name, slug: rfq.service.slug },
      matches: rfq.dispatches.map((dispatch) => ({
        providerId: dispatch.providerId,
        name: dispatch.provider.organization.displayName,
        score: dispatch.matchScore,
        reasons: asReasonList(dispatch.matchReasons),
      })),
      awardedQuoteId: accepted?.id ?? null,
      quotes: rfq.quotes.map((quote) => ({
        id: quote.id,
        providerId: quote.providerId,
        providerName: quote.provider.organization.displayName,
        amount: quote.amount,
        currency: quote.currency,
        scopeNotes: quote.scopeNotes,
        exclusions: quote.exclusions,
        timelineDays: quote.timelineDays,
        status: quote.status,
        createdAt: quote.createdAt,
      })),
    };
  }

  private toProviderView(
    rfq: Prisma.RfqGetPayload<{ include: ReturnType<RfqService['providerRfqInclude']> }>,
    reasons: Prisma.JsonValue,
  ) {
    const quote = rfq.quotes[0] ?? null;
    return {
      id: rfq.id,
      title: rfq.title,
      description: scrubBuyerIdentity(rfq.description),
      location: rfq.locationLabel,
      siteCount: rfq.siteCount,
      employeeCount: rfq.employeeCount,
      timeline: rfq.timeline,
      status: rfq.status,
      createdAt: rfq.createdAt,
      service: { name: rfq.service.name, slug: rfq.service.slug },
      matchReasons: asReasonList(reasons),
      masked: ['companyName', 'email', 'personalDetails'],
      visible: ['location', 'sites', 'employeeCount', 'service', 'timeline'],
      quote: quote
        ? {
            id: quote.id,
            amount: quote.amount,
            currency: quote.currency,
            scopeNotes: quote.scopeNotes,
            exclusions: quote.exclusions,
            timelineDays: quote.timelineDays,
            status: quote.status,
            createdAt: quote.createdAt,
          }
        : null,
    };
  }

  private providerRfqInclude(providerId: string) {
    return {
      service: { select: { name: true, slug: true } },
      quotes: { where: { providerId }, orderBy: { updatedAt: 'desc' as const }, take: 1 },
    } satisfies Prisma.RfqInclude;
  }

  private profileFor(organizationId: string) {
    return this.prisma.providerProfile.findUnique({ where: { organizationId } });
  }

  private async requireProfile(organizationId: string) {
    const profile = await this.profileFor(organizationId);
    if (!profile) throw new NotFoundException('Create a provider profile before responding to RFQs');
    return profile;
  }
}
