import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Service } from '@prisma/client';

import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../../../common/audit/audit-actions.js';
import { AuditService } from '../../../common/audit/audit.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { CreateServiceDto, UpdateServiceDto } from '../dto/service.dto.js';
import { ServiceListQueryDto } from '../dto/taxonomy-query.dto.js';
import { deleteOrDeactivate, diffChanges, optionalText, withUniqueConflict } from '../taxonomy.helpers.js';
import { slugify } from '../utils/slug.util.js';
import { descendantIdsOf, isEffectivelyActive, type TreeIndex } from '../utils/tree.util.js';
import { TaxonomyLookupService, type CategoryNode } from './taxonomy-lookup.service.js';

type ServiceRow = Service & { _count: { providers: number } };

const ENTITY = AUDIT_ENTITIES.service;

/** Marketplace services (the offering catalogue). Named to avoid clashing with Nest "services". */
@Injectable()
export class TaxonomyServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly lookup: TaxonomyLookupService,
  ) {}

  async list(query: ServiceListQueryDto) {
    const index = await this.lookup.categoryIndex();
    if (query.categoryId && !index.byId.has(query.categoryId)) {
      throw new NotFoundException('Category not found');
    }

    const rows = await this.prisma.service.findMany({
      where: {
        ...(query.active !== undefined ? { active: query.active } : {}),
        ...(query.categoryId ? { categoryId: { in: [query.categoryId, ...descendantIdsOf(index, query.categoryId)] } } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { slug: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: 1000,
      include: { _count: { select: { providers: true } } },
    });

    return rows.map((row) => this.toItem(index, row));
  }

  async get(id: string) {
    const row = await this.prisma.service.findUnique({ where: { id }, include: { _count: { select: { providers: true } } } });
    if (!row) throw new NotFoundException('Service not found');
    return this.toItem(await this.lookup.categoryIndex(), row);
  }

  async create(actorId: string, dto: CreateServiceDto) {
    await this.assertCategoryExists(dto.categoryId);
    await this.assertNameAvailable(dto.categoryId, dto.name);
    const slug = dto.slug ?? slugify(dto.name);
    if (!slug) throw new BadRequestException('A slug could not be derived from the name; provide one');

    const created = await withUniqueConflict(
      () =>
        this.prisma.$transaction(async (tx) => {
          const service = await tx.service.create({
            data: {
              categoryId: dto.categoryId,
              name: dto.name,
              slug,
              description: optionalText(dto.description) ?? null,
              active: dto.active ?? true,
              sortOrder: dto.sortOrder ?? 0,
            },
          });
          await this.audit.log(
            {
              action: AUDIT_ACTIONS.taxonomyCreated,
              entityType: ENTITY,
              entityId: service.id,
              actorUserId: actorId,
              metadata: { name: service.name, slug, categoryId: service.categoryId },
            },
            tx,
          );
          return service;
        }),
      (target) =>
        target.includes('slug')
          ? `Service slug "${slug}" is already in use`
          : `A service named "${dto.name}" already exists in this category`,
    );

    return this.get(created.id);
  }

  async update(actorId: string, id: string, dto: UpdateServiceDto) {
    const current = await this.prisma.service.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Service not found');

    const categoryId = dto.categoryId ?? current.categoryId;
    const name = dto.name ?? current.name;
    if (dto.categoryId && dto.categoryId !== current.categoryId) await this.assertCategoryExists(dto.categoryId);
    if (categoryId !== current.categoryId || name.toLowerCase() !== current.name.toLowerCase()) {
      await this.assertNameAvailable(categoryId, name, id);
    }

    const { data, changes, changed } = diffChanges(current, {
      categoryId,
      name: dto.name,
      slug: dto.slug,
      description: optionalText(dto.description),
      active: dto.active,
      sortOrder: dto.sortOrder,
    });
    if (!changed) return this.get(id);

    await withUniqueConflict(
      () =>
        this.prisma.$transaction(async (tx) => {
          await tx.service.update({ where: { id }, data: data as Prisma.ServiceUncheckedUpdateInput });
          await this.audit.log(
            { action: AUDIT_ACTIONS.taxonomyUpdated, entityType: ENTITY, entityId: id, actorUserId: actorId, metadata: { changes } },
            tx,
          );
        }),
      (target) =>
        target.includes('slug')
          ? `Service slug "${dto.slug}" is already in use`
          : `A service named "${name}" already exists in this category`,
    );

    return this.get(id);
  }

  async remove(actorId: string, id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Service not found');

    const outcome = await deleteOrDeactivate(
      id,
      () => this.prisma.service.delete({ where: { id } }),
      () => this.prisma.service.update({ where: { id }, data: { active: false } }),
    );
    await this.audit.log({
      action: outcome.deleted ? AUDIT_ACTIONS.taxonomyDeleted : AUDIT_ACTIONS.taxonomyDeactivated,
      entityType: ENTITY,
      entityId: id,
      actorUserId: actorId,
      metadata: { name: service.name, slug: service.slug },
    });
    return outcome;
  }

  private async assertCategoryExists(categoryId: string) {
    if (!(await this.prisma.serviceCategory.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
      throw new BadRequestException('Category not found');
    }
  }

  /** Case-insensitive; the (category_id, name) unique index is the database-level backstop. */
  private async assertNameAvailable(categoryId: string, name: string, excludeId?: string) {
    const duplicate = await this.prisma.service.findFirst({
      where: { categoryId, name: { equals: name, mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException(`A service named "${name}" already exists in this category`);
  }

  private toItem(index: TreeIndex<CategoryNode>, row: ServiceRow) {
    const category = index.byId.get(row.categoryId);
    return {
      id: row.id,
      categoryId: row.categoryId,
      category: category
        ? { id: category.id, name: category.name, slug: category.slug, categoryType: category.categoryType, active: category.active }
        : null,
      categoryPath: this.lookup.categoryPath(index, row.categoryId),
      name: row.name,
      slug: row.slug,
      description: row.description,
      active: row.active,
      /** False when the service or any category above it is inactive. */
      effectiveActive: row.active && isEffectivelyActive(index, row.categoryId),
      sortOrder: row.sortOrder,
      providerCount: row._count.providers,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
