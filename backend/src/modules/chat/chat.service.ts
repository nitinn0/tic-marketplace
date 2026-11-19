import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

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
import { PUBLIC_PROFESSIONAL_PROFILE_WHERE } from '../professionals/professional-visibility.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const conversationInclude = {
  rfq: { select: { id: true, title: true, status: true } },
  buyerOrganization: { select: { id: true, displayName: true } },
  providerOrganization: { select: { id: true, displayName: true } },
  professionalProfile: {
    select: {
      id: true,
      userId: true,
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  },
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

    const unreadMap = await this.unreadCounts(userId, rows);

    return {
      conversations: rows.map((row) => this.toListItem(row, context, unreadMap.get(row.id) ?? 0, userId)),
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
      conversation: this.toDetail(conversation, context, userId),
      messages: messages.map((message) => this.toMessage(message)),
    };
  }

  async listMessages(
    context: OrganizationAccessContext | null,
    userId: string,
    conversationId: string,
    query: { after?: string; before?: string },
  ) {
    if (context) await this.requireAccess(context, conversationId, 'view');

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
    return this.writeMessage(conversation, userId, body);
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

  /** Open or reuse a hire inquiry between the active provider organization and an independent. */
  async openHire(context: OrganizationAccessContext, userId: string, professionalId: string) {
    if (context.organization.organizationType !== 'PROVIDER') {
      throw new ForbiddenException('Only a provider organization can message an independent');
    }
    const isAdmin =
      context.membership?.isOwner === true || context.roles.some((role) => role.code === 'PROVIDER_ADMIN');
    if (!isAdmin && !context.hasPlatformAccess) {
      throw new ForbiddenException('Only a provider administrator can message independents');
    }

    const professional = await this.prisma.professionalProfile.findFirst({
      where: { id: professionalId, ...PUBLIC_PROFESSIONAL_PROFILE_WHERE },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!professional) throw new NotFoundException('Professional not found');
    if (professional.userId === userId) {
      throw new BadRequestException('You cannot message yourself');
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        providerOrganizationId: context.organization.id,
        professionalProfileId: professional.id,
      },
    });
    const name = `${professional.user.firstName} ${professional.user.lastName}`.trim();
    if (existing) return { id: existing.id, counterpartName: name };

    const conversation = await this.prisma.conversation.create({
      data: {
        providerOrganizationId: context.organization.id,
        professionalProfileId: professional.id,
      },
    });

    await this.notifications.create({
      userId: professional.userId,
      type: 'CHAT_MESSAGE',
      title: `${context.organization.displayName} wants to talk`,
      body: `Open messages to respond to a hire inquiry from ${context.organization.displayName}.`,
      entityType: 'conversation',
      entityId: conversation.id,
    });

    return { id: conversation.id, counterpartName: name };
  }

  async listForProfessional(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({ where: { userId } });
    if (!profile) return { conversations: [] };
    const rows = await this.prisma.conversation.findMany({
      where: { professionalProfileId: profile.id },
      include: conversationInclude,
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    });
    const unreadMap = await this.unreadCounts(userId, rows);
    return {
      conversations: rows.map((row) => this.toListItem(row, null, unreadMap.get(row.id) ?? 0, userId)),
    };
  }

  async getForProfessional(userId: string, conversationId: string) {
    const conversation = await this.requireProfessional(userId, conversationId);
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
    await this.markReadInternal(conversationId, userId);
    return {
      conversation: this.toDetail(conversation, null, userId),
      messages: messages.map((message) => this.toMessage(message)),
    };
  }

  async listMessagesForProfessional(
    userId: string,
    conversationId: string,
    query: { after?: string; before?: string },
  ) {
    await this.requireProfessional(userId, conversationId);
    return this.listMessages(null, userId, conversationId, query);
  }

  async sendForProfessional(userId: string, conversationId: string, body: string) {
    const conversation = await this.requireProfessional(userId, conversationId);
    return this.writeMessage(conversation, userId, body);
  }

  async markReadForProfessional(userId: string, conversationId: string) {
    await this.requireProfessional(userId, conversationId);
    await this.markReadInternal(conversationId, userId);
    return { ok: true };
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
        professionalProfile: {
          select: {
            id: true,
            userId: true,
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
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

  private async requireProfessional(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        rfq: { select: { id: true, title: true, status: true } },
        buyerOrganization: { select: { id: true, displayName: true } },
        providerOrganization: { select: { id: true, displayName: true } },
        professionalProfile: {
          select: {
            id: true,
            userId: true,
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!conversation?.professionalProfile || conversation.professionalProfile.userId !== userId) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  private async unreadCounts(userId: string, rows: { id: string }[]) {
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
    return new Map(unreadCounts);
  }

  private async writeMessage(
    conversation: {
      id: string;
      buyerOrganizationId: string | null;
      providerOrganizationId: string | null;
      rfqId: string | null;
      professionalProfile: {
        userId: string;
        user: { firstName: string; lastName: string };
      } | null;
      rfq: { title: string } | null;
      providerOrganization: { displayName: string } | null;
    },
    userId: string,
    body: string,
  ) {
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
          conversationId: conversation.id,
          senderUserId: userId,
          body: trimmed,
        },
        include: { sender: { select: { id: true, firstName: true, lastName: true } } },
      });
      await tx.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: created.createdAt },
      });
      await tx.conversationRead.upsert({
        where: { conversationId_userId: { conversationId: conversation.id, userId } },
        update: { lastReadAt: created.createdAt },
        create: { conversationId: conversation.id, userId, lastReadAt: created.createdAt },
      });
      return created;
    });

    await this.notifyCounterpart(conversation, userId, trimmed);
    return this.toMessage(message);
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
    conversation: {
      id: string;
      buyerOrganizationId: string | null;
      providerOrganizationId: string | null;
      professionalProfile: {
        userId: string;
        user: { firstName: string; lastName: string };
      } | null;
      rfq: { title: string } | null;
      providerOrganization: { displayName: string } | null;
    },
    senderUserId: string,
    body: string,
  ) {
    const preview = body.length > 120 ? `${body.slice(0, 117)}…` : body;
    const professional = conversation.professionalProfile;
    if (professional) {
      const senderIsProfessional = professional.userId === senderUserId;
      if (senderIsProfessional && conversation.providerOrganizationId) {
        const userIds = (await this.notifications.userIdsForOrganization(conversation.providerOrganizationId)).filter(
          (id) => id !== senderUserId,
        );
        const name = `${professional.user.firstName} ${professional.user.lastName}`.trim();
        await this.notifications.createMany(
          userIds.map((userId) => ({
            userId,
            type: 'CHAT_MESSAGE',
            title: `New message from ${name}`,
            body: preview,
            entityType: 'conversation',
            entityId: conversation.id,
          })),
        );
        return;
      }
      await this.notifications.create({
        userId: professional.userId,
        type: 'CHAT_MESSAGE',
        title: `New message from ${conversation.providerOrganization?.displayName ?? 'a company'}`,
        body: preview,
        entityType: 'conversation',
        entityId: conversation.id,
      });
      return;
    }

    if (!conversation.rfq || !conversation.buyerOrganizationId || !conversation.providerOrganizationId) return;
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
    await this.notifications.createMany(
      userIds.map((userId) => ({
        userId,
        type: 'CHAT_MESSAGE',
        title: `New message on “${conversation.rfq?.title ?? 'a request'}”`,
        body: preview,
        entityType: 'conversation',
        entityId: conversation.id,
      })),
    );
  }

  private displayName(user: { firstName: string; lastName: string }) {
    return `${user.firstName} ${user.lastName}`.trim();
  }

  private toListItem(
    row: ConversationRow,
    context: OrganizationAccessContext | null,
    unreadCount: number,
    viewerUserId: string,
  ) {
    const last = row.messages[0] ?? null;
    const lastMessage = last
      ? {
          id: last.id,
          body: last.body,
          createdAt: last.createdAt,
          senderName: this.displayName(last.sender),
        }
      : null;
    if (row.professionalProfile) {
      const viewingAsProfessional = row.professionalProfile.userId === viewerUserId;
      return {
        id: row.id,
        rfqId: null,
        rfqTitle: 'Hire inquiry',
        counterpartName: viewingAsProfessional
          ? (row.providerOrganization?.displayName ?? 'Company')
          : this.displayName(row.professionalProfile.user),
        lastMessage,
        lastMessageAt: row.lastMessageAt,
        unreadCount,
        createdAt: row.createdAt,
      };
    }
    const isBuyer = context?.organization.id === row.buyerOrganizationId;
    const counterpart = isBuyer ? row.providerOrganization : row.buyerOrganization;
    return {
      id: row.id,
      rfqId: row.rfq?.id ?? null,
      rfqTitle: row.rfq?.title ?? 'Conversation',
      counterpartName: counterpart?.displayName ?? 'Conversation',
      lastMessage,
      lastMessageAt: row.lastMessageAt,
      unreadCount,
      createdAt: row.createdAt,
    };
  }

  private toDetail(
    conversation: {
      id: string;
      lastMessageAt: Date | null;
      createdAt: Date;
      buyerOrganizationId: string | null;
      rfq: { id: string; title: string; status: string } | null;
      buyerOrganization: { displayName: string } | null;
      providerOrganization: { displayName: string } | null;
      professionalProfile: {
        userId: string;
        user: { firstName: string; lastName: string };
      } | null;
    },
    context: OrganizationAccessContext | null,
    viewerUserId: string,
  ) {
    if (conversation.professionalProfile) {
      const viewingAsProfessional = conversation.professionalProfile.userId === viewerUserId;
      return {
        id: conversation.id,
        rfqId: null,
        rfqTitle: 'Hire inquiry',
        rfqStatus: null,
        counterpartName: viewingAsProfessional
          ? (conversation.providerOrganization?.displayName ?? 'Company')
          : this.displayName(conversation.professionalProfile.user),
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
      };
    }
    const isBuyer = context?.organization.id === conversation.buyerOrganizationId;
    return {
      id: conversation.id,
      rfqId: conversation.rfq?.id ?? null,
      rfqTitle: conversation.rfq?.title ?? 'Conversation',
      rfqStatus: conversation.rfq?.status ?? null,
      counterpartName: isBuyer
        ? (conversation.providerOrganization?.displayName ?? 'Provider')
        : (conversation.buyerOrganization?.displayName ?? 'Buyer'),
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
