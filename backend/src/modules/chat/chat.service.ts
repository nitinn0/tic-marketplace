import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Conversation, Prisma } from '@prisma/client';

import {
  CONTACT_INFO_BLOCKED_MESSAGE,
  containsContactInfo,
} from '../../common/moderation/contact-info.js';
import { PrismaService } from '../../database/prisma.service.js';
import { RFQ_FUNCTIONALITIES as R } from '../rbac/constants/permission.constants.js';
import {
  OrganizationAccessService,
  type OrganizationAccessContext,
} from '../rbac/services/organization-access.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const conversationInclude = {
  rfq: { select: { id: true, title: true, status: true } },
  buyerOrganization: { select: { id: true, displayName: true } },
  providerOrganization: { select: { id: true, displayName: true } },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    include: {
      sender: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.ConversationInclude;

type ConversationRow = Prisma.ConversationGetPayload<{ include: typeof conversationInclude }>;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationAccess: OrganizationAccessService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Open a thread after a quote is awarded. Idempotent. */
  async createForAwardedQuote(
    tx: Prisma.TransactionClient,
    input: {
      rfqId: string;
      buyerOrganizationId: string;
      providerId: string;
    },
  ) {
    const provider = await tx.providerProfile.findUnique({
      where: { id: input.providerId },
      select: { id: true, organizationId: true },
    });
    if (!provider) throw new NotFoundException('Provider not found');

    return tx.conversation.upsert({
      where: { rfqId: input.rfqId },
      update: {},
      create: {
        rfqId: input.rfqId,
        buyerOrganizationId: input.buyerOrganizationId,
        providerOrganizationId: provider.organizationId,
        providerId: provider.id,
      },
    });
  }

  async list(context: OrganizationAccessContext, userId: string) {
    this.assertChatAccess(context, 'view');
    const orgId = context.organization.id;
    const rows = await this.prisma.conversation.findMany({
      where: {
        OR: [{ buyerOrganizationId: orgId }, { providerOrganizationId: orgId }],
      },
      include: conversationInclude,
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    });

    const reads = await this.prisma.conversationRead.findMany({
      where: { userId, conversationId: { in: rows.map((row) => row.id) } },
    });
    const readMap = new Map(reads.map((row) => [row.conversationId, row.lastReadAt]));

    const unreadCounts = await Promise.all(
      rows.map(async (row) => {
        const lastReadAt = readMap.get(row.id);
        const count = await this.prisma.message.count({
          where: {
            conversationId: row.id,
            senderUserId: { not: userId },
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
          },
        });
        return [row.id, count] as const;
      }),
    );
    const unreadMap = new Map(unreadCounts);

    return {
      conversations: rows.map((row) => this.toListItem(row, context, unreadMap.get(row.id) ?? 0)),
    };
  }

  async get(context: OrganizationAccessContext, userId: string, conversationId: string) {
    const conversation = await this.requireAccess(context, conversationId, 'view');
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
    await this.markReadInternal(conversationId, userId);
    return {
      conversation: this.toDetail(conversation, context),
      messages: messages.map((message) => this.toMessage(message)),
    };
  }

  async listMessages(
    context: OrganizationAccessContext,
    userId: string,
    conversationId: string,
    query: { after?: string; before?: string },
  ) {
    await this.requireAccess(context, conversationId, 'view');

    let cursorCreatedAt: Date | undefined;
    if (query.after) {
      const after = await this.prisma.message.findFirst({
        where: { id: query.after, conversationId },
      });
      if (!after) throw new BadRequestException('Unknown after cursor');
      cursorCreatedAt = after.createdAt;
    }
    if (query.before) {
      const before = await this.prisma.message.findFirst({
        where: { id: query.before, conversationId },
      });
      if (!before) throw new BadRequestException('Unknown before cursor');
      cursorCreatedAt = before.createdAt;
    }

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(query.after && cursorCreatedAt ? { createdAt: { gt: cursorCreatedAt } } : {}),
        ...(query.before && cursorCreatedAt ? { createdAt: { lt: cursorCreatedAt } } : {}),
      },
      orderBy: { createdAt: query.before ? 'desc' : 'asc' },
      take: 100,
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });

    const ordered = query.before ? [...messages].reverse() : messages;
    if (!query.before) {
      await this.markReadInternal(conversationId, userId);
    }
    return { messages: ordered.map((message) => this.toMessage(message)) };
  }

  async send(
    context: OrganizationAccessContext,
    userId: string,
    conversationId: string,
    body: string,
  ) {
    const conversation = await this.requireAccess(context, conversationId, 'create');
    const trimmed = body.trim();
    if (!trimmed) throw new BadRequestException('Message cannot be empty');
    if (containsContactInfo(trimmed)) {
      throw new BadRequestException({
        status: 'contact_info_blocked',
        message: CONTACT_INFO_BLOCKED_MESSAGE,
      });
    }

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderUserId: userId,
          body: trimmed,
        },
        include: { sender: { select: { id: true, firstName: true, lastName: true } } },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: created.createdAt },
      });
      await tx.conversationRead.upsert({
        where: { conversationId_userId: { conversationId, userId } },
        update: { lastReadAt: created.createdAt },
        create: { conversationId, userId, lastReadAt: created.createdAt },
      });
      return created;
    });

    await this.notifyCounterpart(conversation, userId, trimmed);
    return this.toMessage(message);
  }

  async markRead(context: OrganizationAccessContext, userId: string, conversationId: string) {
    await this.requireAccess(context, conversationId, 'view');
    await this.markReadInternal(conversationId, userId);
    return { ok: true };
  }

  async getForRfq(context: OrganizationAccessContext, rfqId: string) {
    this.assertChatAccess(context, 'view');
    const orgId = context.organization.id;
    const existing = await this.prisma.conversation.findFirst({
      where: {
        rfqId,
        OR: [{ buyerOrganizationId: orgId }, { providerOrganizationId: orgId }],
      },
    });
    if (existing) return { id: existing.id, rfqId: existing.rfqId };

    // Lazy-open for awards created before chat shipped.
    const awarded = await this.prisma.rfqQuote.findFirst({
      where: { rfqId, status: 'ACCEPTED' },
      include: {
        rfq: { select: { buyerOrganizationId: true } },
        provider: { select: { id: true, organizationId: true } },
      },
    });
    if (!awarded) throw new NotFoundException('Conversation not found for this RFQ');

    const canAccess =
      awarded.rfq.buyerOrganizationId === orgId || awarded.provider.organizationId === orgId;
    if (!canAccess) throw new ForbiddenException('You cannot access this conversation');

    const conversation = await this.prisma.conversation.upsert({
      where: { rfqId },
      update: {},
      create: {
        rfqId,
        buyerOrganizationId: awarded.rfq.buyerOrganizationId,
        providerOrganizationId: awarded.provider.organizationId,
        providerId: awarded.provider.id,
      },
    });
    return { id: conversation.id, rfqId: conversation.rfqId };
  }

  private async requireAccess(
    context: OrganizationAccessContext,
    conversationId: string,
    action: 'view' | 'create',
  ) {
    this.assertChatAccess(context, action);
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        rfq: { select: { id: true, title: true, status: true } },
        buyerOrganization: { select: { id: true, displayName: true } },
        providerOrganization: { select: { id: true, displayName: true } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    const orgId = context.organization.id;
    if (
      conversation.buyerOrganizationId !== orgId &&
      conversation.providerOrganizationId !== orgId
    ) {
      throw new ForbiddenException('You cannot access this conversation');
    }
    return conversation;
  }

  private assertChatAccess(context: OrganizationAccessContext, action: 'view' | 'create') {
    const functionality =
      context.organization.organizationType === 'BUYER' ? R.buyer : R.provider;
    this.organizationAccess.assertCan(context, functionality, action);
  }

  private markReadInternal(conversationId: string, userId: string) {
    const now = new Date();
    return this.prisma.conversationRead.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      update: { lastReadAt: now },
      create: { conversationId, userId, lastReadAt: now },
    });
  }

  private async notifyCounterpart(
    conversation: Pick<
      Conversation,
      'id' | 'buyerOrganizationId' | 'providerOrganizationId' | 'rfqId'
    > & { rfq: { title: string } },
    senderUserId: string,
    body: string,
  ) {
    const senderOnBuyerSide = await this.prisma.organizationUser.findFirst({
      where: {
        userId: senderUserId,
        organizationId: conversation.buyerOrganizationId,
        membershipStatus: 'ACTIVE',
      },
    });
    const targetOrgId = senderOnBuyerSide
      ? conversation.providerOrganizationId
      : conversation.buyerOrganizationId;

    const userIds = (await this.notifications.userIdsForOrganization(targetOrgId)).filter(
      (id) => id !== senderUserId,
    );
    const preview = body.length > 120 ? `${body.slice(0, 117)}…` : body;
    await this.notifications.createMany(
      userIds.map((userId) => ({
        userId,
        type: 'CHAT_MESSAGE',
        title: `New message on “${conversation.rfq.title}”`,
        body: preview,
        entityType: 'conversation',
        entityId: conversation.id,
      })),
    );
  }

  private toListItem(row: ConversationRow, context: OrganizationAccessContext, unreadCount: number) {
    const isBuyer = context.organization.id === row.buyerOrganizationId;
    const counterpart = isBuyer ? row.providerOrganization : row.buyerOrganization;
    const last = row.messages[0] ?? null;
    return {
      id: row.id,
      rfqId: row.rfq.id,
      rfqTitle: row.rfq.title,
      counterpartName: counterpart.displayName,
      lastMessage: last
        ? {
            id: last.id,
            body: last.body,
            createdAt: last.createdAt,
            senderName: `${last.sender.firstName} ${last.sender.lastName}`.trim(),
          }
        : null,
      lastMessageAt: row.lastMessageAt,
      unreadCount,
      createdAt: row.createdAt,
    };
  }

  private toDetail(
    conversation: {
      id: string;
      rfqId: string;
      buyerOrganizationId: string;
      providerOrganizationId: string;
      lastMessageAt: Date | null;
      createdAt: Date;
      rfq: { id: string; title: string; status: string };
      buyerOrganization: { id: string; displayName: string };
      providerOrganization: { id: string; displayName: string };
    },
    context: OrganizationAccessContext,
  ) {
    const isBuyer = context.organization.id === conversation.buyerOrganizationId;
    return {
      id: conversation.id,
      rfqId: conversation.rfq.id,
      rfqTitle: conversation.rfq.title,
      rfqStatus: conversation.rfq.status,
      counterpartName: isBuyer
        ? conversation.providerOrganization.displayName
        : conversation.buyerOrganization.displayName,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
    };
  }

  private toMessage(message: {
    id: string;
    body: string;
    createdAt: Date;
    senderUserId: string;
    sender: { id: string; firstName: string; lastName: string };
  }) {
    return {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      senderUserId: message.senderUserId,
      senderName: `${message.sender.firstName} ${message.sender.lastName}`.trim(),
    };
  }
}
