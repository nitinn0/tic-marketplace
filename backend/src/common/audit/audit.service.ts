import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';

export type AuditEntry = {
  action: string;
  entityType: string;
  entityId?: string | null;
  actorUserId?: string | null;
  organizationId?: string | null;
  targetUserId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

type AuditClient = Pick<Prisma.TransactionClient, 'auditLog'>;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pass the transaction client when the audited change happens inside a transaction so the
   * audit record commits or rolls back together with the change.
   */
  async log(entry: AuditEntry, client: AuditClient = this.prisma) {
    const record = await client.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        actorUserId: entry.actorUserId ?? null,
        organizationId: entry.organizationId ?? null,
        targetUserId: entry.targetUserId ?? null,
        metadata: entry.metadata,
      },
    });

    this.logger.log(
      `${entry.action} actor=${entry.actorUserId ?? '-'} org=${entry.organizationId ?? '-'} target=${entry.targetUserId ?? '-'}`,
    );

    return record;
  }
}
