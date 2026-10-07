import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Industry, Prisma } from '@prisma/client';

import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../../../common/audit/audit-actions.js';
import { AuditService } from '../../../common/audit/audit.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { CreateIndustryDto, UpdateIndustryDto } from '../dto/industry.dto.js';
import { HierarchyListQueryDto } from '../dto/taxonomy-query.dto.js';
import { deleteOrDeactivate, diffChanges, matchesSearch, optionalText, withUniqueConflict } from '../taxonomy.helpers.js';
import { slugify } from '../utils/slug.util.js';
import {
  ancestorsOf,
  buildTreeIndex,
  isEffectivelyActive,
  nestTree,
  orderDepthFirst,
  wouldCreateCycle,
  type TreeIndex,
} from '../utils/tree.util.js';

type IndustryRow = Industry & { _count: { children: number; providers: number } };

const ENTITY = AUDIT_ENTITIES.industry;

@Injectable()
export class IndustriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: HierarchyListQueryDto) {
    const index = await this.loadIndex();
    const matches = (node: IndustryRow) =>
      (query.active === undefined || node.active === query.active) &&
      matchesSearch(query.search, node.name, node.slug, node.description);

    if (query.format === 'tree') {
      const filtered = query.active !== undefined || query.search;
      return nestTree(index, (node, depth) => this.toItem(index, node, depth), filtered ? matches : undefined);
    }

    return orderDepthFirst(index)
      .filter(({ node }) => matches(node) && (!query.parentId || node.parentId === query.parentId))
      .map(({ node, depth }) => this.toItem(index, node, depth));
  }

  async get(id: string) {
    const index = await this.loadIndex();
    const node = index.byId.get(id);
    if (!node) throw new NotFoundException('Industry not found');
    const parent = node.parentId ? index.byId.get(node.parentId) : undefined;

    return {
      ...this.toItem(index, node, ancestorsOf(index, id).length),
      parent: parent ? { id: parent.id, name: parent.name, slug: parent.slug } : null,
      children: (index.childrenOf.get(id) ?? []).map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        active: child.active,
        sortOrder: child.sortOrder,
      })),
    };
  }

  async create(actorId: string, dto: CreateIndustryDto) {
    if (dto.parentId && !(await this.prisma.industry.findUnique({ where: { id: dto.parentId } }))) {
      throw new BadRequestException('Parent industry not found');
    }
    const slug = dto.slug ?? slugify(dto.name);
    if (!slug) throw new BadRequestException('A slug could not be derived from the name; provide one');

    const created = await withUniqueConflict(
      () =>
        this.prisma.$transaction(async (tx) => {
          const industry = await tx.industry.create({
            data: {
              name: dto.name,
              slug,
              description: optionalText(dto.description) ?? null,
              parentId: dto.parentId ?? null,
              active: dto.active ?? true,
              sortOrder: dto.sortOrder ?? 0,
            },
          });
          await this.audit.log(
            {
              action: AUDIT_ACTIONS.taxonomyCreated,
              entityType: ENTITY,
              entityId: industry.id,
              actorUserId: actorId,
              metadata: { name: industry.name, slug, parentId: industry.parentId },
            },
            tx,
          );
          return industry;
        }),
      () => `Industry slug "${slug}" is already in use`,
    );

    return this.get(created.id);
  }

  async update(actorId: string, id: string, dto: UpdateIndustryDto) {
    const index = await this.loadIndex();
    const current = index.byId.get(id);
    if (!current) throw new NotFoundException('Industry not found');

    const parentId = dto.parentId !== undefined ? dto.parentId : current.parentId;
    if (parentId && !index.byId.has(parentId)) throw new BadRequestException('Parent industry not found');
    if (wouldCreateCycle(index, id, parentId)) {
      throw new BadRequestException('An industry cannot be moved under itself or one of its descendants');
    }

    const { data, changes, changed } = diffChanges(current as Industry, {
      name: dto.name,
      slug: dto.slug,
      description: optionalText(dto.description),
      parentId,
      active: dto.active,
      sortOrder: dto.sortOrder,
    });
    if (!changed) return this.get(id);

    await withUniqueConflict(
      () =>
        this.prisma.$transaction(async (tx) => {
          await tx.industry.update({ where: { id }, data: data as Prisma.IndustryUncheckedUpdateInput });
          await this.audit.log(
            { action: AUDIT_ACTIONS.taxonomyUpdated, entityType: ENTITY, entityId: id, actorUserId: actorId, metadata: { changes } },
            tx,
          );
        }),
      () => `Industry slug "${dto.slug}" is already in use`,
    );

    return this.get(id);
  }

  async remove(actorId: string, id: string) {
    const industry = await this.prisma.industry.findUnique({ where: { id } });
    if (!industry) throw new NotFoundException('Industry not found');

    const outcome = await deleteOrDeactivate(
      id,
      () => this.prisma.industry.delete({ where: { id } }),
      () => this.prisma.industry.update({ where: { id }, data: { active: false } }),
    );
    await this.audit.log({
      action: outcome.deleted ? AUDIT_ACTIONS.taxonomyDeleted : AUDIT_ACTIONS.taxonomyDeactivated,
      entityType: ENTITY,
      entityId: id,
      actorUserId: actorId,
      metadata: { name: industry.name, slug: industry.slug },
    });
    return outcome;
  }

  private async loadIndex(): Promise<TreeIndex<IndustryRow>> {
    const rows = await this.prisma.industry.findMany({
      include: { _count: { select: { children: true, providers: true } } },
    });
    return buildTreeIndex(rows);
  }

  private toItem(index: TreeIndex<IndustryRow>, node: IndustryRow, depth: number) {
    return {
      id: node.id,
      parentId: node.parentId,
      name: node.name,
      slug: node.slug,
      description: node.description,
      active: node.active,
      effectiveActive: isEffectivelyActive(index, node.id),
      sortOrder: node.sortOrder,
      depth,
      path: ancestorsOf(index, node.id).map((ancestor) => ({ id: ancestor.id, name: ancestor.name })),
      childCount: node._count.children,
      providerCount: node._count.providers,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    };
  }
}
