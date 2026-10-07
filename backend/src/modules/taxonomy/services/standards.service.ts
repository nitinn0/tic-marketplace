import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Standard } from '@prisma/client';

import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../../../common/audit/audit-actions.js';
import { AuditService } from '../../../common/audit/audit.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { CreateStandardDto, UpdateStandardDto } from '../dto/standard.dto.js';
import { TaxonomyListQueryDto } from '../dto/taxonomy-query.dto.js';
import { deleteOrDeactivate, diffChanges, optionalText, withUniqueConflict } from '../taxonomy.helpers.js';

const ENTITY = AUDIT_ENTITIES.standard;

const toItem = (row: Standard & { _count: { providers: number } }) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  version: row.version,
  description: row.description,
  active: row.active,
  providerCount: row._count.providers,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const include = { _count: { select: { providers: true } } } as const;

/** Standards are independent of services: "ISO 9001" (standard) vs "ISO 9001 Certification" (service). */
@Injectable()
export class StandardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: TaxonomyListQueryDto) {
    const rows = await this.prisma.standard.findMany({
      where: {
        ...(query.active !== undefined ? { active: query.active } : {}),
        ...(query.search
          ? {
              OR: [
                { code: { contains: query.search, mode: 'insensitive' } },
                { name: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { code: 'asc' },
      take: 1000,
      include,
    });
    return rows.map(toItem);
  }

  async get(id: string) {
    const row = await this.prisma.standard.findUnique({ where: { id }, include });
    if (!row) throw new NotFoundException('Standard not found');
    return toItem(row);
  }

  async create(actorId: string, dto: CreateStandardDto) {
    const created = await withUniqueConflict(
      () =>
        this.prisma.$transaction(async (tx) => {
          const standard = await tx.standard.create({
            data: {
              code: dto.code,
              name: dto.name,
              version: optionalText(dto.version) ?? null,
              description: optionalText(dto.description) ?? null,
              active: dto.active ?? true,
            },
          });
          await this.audit.log(
            {
              action: AUDIT_ACTIONS.taxonomyCreated,
              entityType: ENTITY,
              entityId: standard.id,
              actorUserId: actorId,
              metadata: { code: standard.code, name: standard.name },
            },
            tx,
          );
          return standard;
        }),
      () => `Standard "${dto.code}" already exists`,
    );
    return this.get(created.id);
  }

  async update(actorId: string, id: string, dto: UpdateStandardDto) {
    const current = await this.prisma.standard.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Standard not found');

    const { data, changes, changed } = diffChanges(current, {
      code: dto.code,
      name: dto.name,
      version: optionalText(dto.version),
      description: optionalText(dto.description),
      active: dto.active,
    });
    if (!changed) return this.get(id);

    await withUniqueConflict(
      () =>
        this.prisma.$transaction(async (tx) => {
          await tx.standard.update({ where: { id }, data: data as Prisma.StandardUpdateInput });
          await this.audit.log(
            { action: AUDIT_ACTIONS.taxonomyUpdated, entityType: ENTITY, entityId: id, actorUserId: actorId, metadata: { changes } },
            tx,
          );
        }),
      () => `Standard "${dto.code}" already exists`,
    );
    return this.get(id);
  }

  async remove(actorId: string, id: string) {
    const standard = await this.prisma.standard.findUnique({ where: { id } });
    if (!standard) throw new NotFoundException('Standard not found');

    const outcome = await deleteOrDeactivate(
      id,
      () => this.prisma.standard.delete({ where: { id } }),
      () => this.prisma.standard.update({ where: { id }, data: { active: false } }),
    );
    await this.audit.log({
      action: outcome.deleted ? AUDIT_ACTIONS.taxonomyDeleted : AUDIT_ACTIONS.taxonomyDeactivated,
      entityType: ENTITY,
      entityId: id,
      actorUserId: actorId,
      metadata: { code: standard.code },
    });
    return outcome;
  }
}
