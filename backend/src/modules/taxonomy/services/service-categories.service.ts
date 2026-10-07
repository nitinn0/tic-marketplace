import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ServiceCategory, ServiceCategoryType } from '@prisma/client';

import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../../../common/audit/audit-actions.js';
import { AuditService } from '../../../common/audit/audit.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto.js';
import { CategoryListQueryDto } from '../dto/taxonomy-query.dto.js';
import { deleteOrDeactivate, diffChanges, matchesSearch, optionalText, withUniqueConflict } from '../taxonomy.helpers.js';
import { slugify } from '../utils/slug.util.js';
import {
  ancestorsOf,
  buildTreeIndex,
  descendantIdsOf,
  isEffectivelyActive,
  nestTree,
  orderDepthFirst,
  wouldCreateCycle,
  type TreeIndex,
} from '../utils/tree.util.js';

type CategoryRow = ServiceCategory & { _count: { children: number; services: number } };

const ENTITY = AUDIT_ENTITIES.serviceCategory;

@Injectable()
export class ServiceCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: CategoryListQueryDto) {
    const index = await this.loadIndex();
    const matches = (node: CategoryRow) =>
      (query.active === undefined || node.active === query.active) &&
      (!query.categoryType || node.categoryType === query.categoryType) &&
      matchesSearch(query.search, node.name, node.slug, node.description);

    if (query.format === 'tree') {
      const filtered = query.active !== undefined || query.categoryType || query.search;
      return nestTree(index, (node, depth) => this.toItem(index, node, depth), filtered ? matches : undefined);
    }

    return orderDepthFirst(index)
      .filter(({ node }) => matches(node) && (!query.parentId || node.parentId === query.parentId))
      .map(({ node, depth }) => this.toItem(index, node, depth));
  }

  async get(id: string) {
    const index = await this.loadIndex();
    const node = index.byId.get(id);
    if (!node) throw new NotFoundException('Category not found');

    const services = await this.prisma.service.findMany({
      where: { categoryId: id },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, active: true, sortOrder: true },
    });
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
      services,
    };
  }

  async create(actorId: string, dto: CreateCategoryDto) {
    const parent = dto.parentId ? await this.prisma.serviceCategory.findUnique({ where: { id: dto.parentId } }) : null;
    if (dto.parentId && !parent) {
      throw new BadRequestException('Parent category not found');
    }
    const categoryType = this.resolveType(parent, dto.categoryType, undefined);
    const slug = dto.slug ?? slugify(dto.name);
    if (!slug) throw new BadRequestException('A slug could not be derived from the name; provide one');

    const created = await withUniqueConflict(
      () =>
        this.prisma.$transaction(async (tx) => {
          const category = await tx.serviceCategory.create({
            data: {
              name: dto.name,
              slug,
              description: optionalText(dto.description) ?? null,
              categoryType,
              parentId: parent?.id ?? null,
              active: dto.active ?? true,
              sortOrder: dto.sortOrder ?? 0,
            },
          });
          await this.audit.log(
            {
              action: AUDIT_ACTIONS.taxonomyCreated,
              entityType: ENTITY,
              entityId: category.id,
              actorUserId: actorId,
              metadata: { name: category.name, slug, parentId: category.parentId, categoryType },
            },
            tx,
          );
          return category;
        }),
      () => `Category slug "${slug}" is already in use`,
    );

    return this.get(created.id);
  }

  async update(actorId: string, id: string, dto: UpdateCategoryDto) {
    const index = await this.loadIndex();
    const current = index.byId.get(id);
    if (!current) throw new NotFoundException('Category not found');

    const parentId = dto.parentId !== undefined ? dto.parentId : current.parentId;
    const parent = parentId ? index.byId.get(parentId) : null;
    if (parentId && !parent) throw new BadRequestException('Parent category not found');
    if (wouldCreateCycle(index, id, parentId)) {
      throw new BadRequestException('A category cannot be moved under itself or one of its descendants');
    }
    const categoryType = this.resolveType(parent ?? null, dto.categoryType, current);

    const { data, changes, changed } = diffChanges(current as ServiceCategory, {
      name: dto.name,
      slug: dto.slug,
      description: optionalText(dto.description),
      parentId,
      categoryType,
      active: dto.active,
      sortOrder: dto.sortOrder,
    });
    if (!changed) return this.get(id);

    await withUniqueConflict(
      () =>
        this.prisma.$transaction(async (tx) => {
          await tx.serviceCategory.update({ where: { id }, data: data as Prisma.ServiceCategoryUncheckedUpdateInput });
          if (data.categoryType) {
            // The whole subtree shares the root's service line.
            await tx.serviceCategory.updateMany({
              where: { id: { in: descendantIdsOf(index, id) } },
              data: { categoryType: data.categoryType },
            });
          }
          await this.audit.log(
            { action: AUDIT_ACTIONS.taxonomyUpdated, entityType: ENTITY, entityId: id, actorUserId: actorId, metadata: { changes } },
            tx,
          );
        }),
      () => `Category slug "${dto.slug}" is already in use`,
    );

    return this.get(id);
  }

  async remove(actorId: string, id: string) {
    const category = await this.prisma.serviceCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    const outcome = await deleteOrDeactivate(
      id,
      () => this.prisma.serviceCategory.delete({ where: { id } }),
      () => this.prisma.serviceCategory.update({ where: { id }, data: { active: false } }),
    );
    await this.audit.log({
      action: outcome.deleted ? AUDIT_ACTIONS.taxonomyDeleted : AUDIT_ACTIONS.taxonomyDeactivated,
      entityType: ENTITY,
      entityId: id,
      actorUserId: actorId,
      metadata: { name: category.name, slug: category.slug },
    });
    return outcome;
  }

  private async loadIndex(): Promise<TreeIndex<CategoryRow>> {
    const rows = await this.prisma.serviceCategory.findMany({
      include: { _count: { select: { children: true, services: true } } },
    });
    return buildTreeIndex(rows);
  }

  /**
   * Child categories always inherit the parent's type. A type can only be chosen for a top-level
   * category, and changing it is applied to the whole subtree.
   */
  private resolveType(
    parent: Pick<ServiceCategory, 'categoryType'> | null,
    requested: ServiceCategoryType | undefined,
    current: Pick<ServiceCategory, 'categoryType'> | undefined,
  ): ServiceCategoryType {
    if (parent) {
      if (requested && requested !== parent.categoryType) {
        throw new BadRequestException(
          `Sub-categories inherit their parent's type (${parent.categoryType}); categoryType can only be set on top-level categories`,
        );
      }
      return parent.categoryType;
    }
    const type = requested ?? current?.categoryType;
    if (!type) throw new BadRequestException('categoryType is required for top-level categories');
    return type;
  }

  private toItem(index: TreeIndex<CategoryRow>, node: CategoryRow, depth: number) {
    return {
      id: node.id,
      parentId: node.parentId,
      name: node.name,
      slug: node.slug,
      description: node.description,
      categoryType: node.categoryType,
      active: node.active,
      /** False when the category or any ancestor is inactive. */
      effectiveActive: isEffectivelyActive(index, node.id),
      sortOrder: node.sortOrder,
      depth,
      path: ancestorsOf(index, node.id).map((ancestor) => ({ id: ancestor.id, name: ancestor.name })),
      childCount: node._count.children,
      serviceCount: node._count.services,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    };
  }
}
