import { Injectable } from '@nestjs/common';
import type { Location, ServiceCategoryType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service.js';
import { locationLabel, locationLevel } from '../utils/location.util.js';
import { ancestorsOf, buildTreeIndex, isEffectivelyActive, orderDepthFirst, type TreeIndex } from '../utils/tree.util.js';

export type CategoryNode = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  active: boolean;
  sortOrder: number;
  categoryType: ServiceCategoryType;
};

export type IndustryNode = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  active: boolean;
  sortOrder: number;
};

export type TaxonomyReferenceKind = 'services' | 'standards' | 'industries' | 'locations';

const nodeSelect = { id: true, parentId: true, name: true, slug: true, active: true, sortOrder: true } as const;

export function toLocationSummary(location: Location) {
  return {
    id: location.id,
    countryCode: location.countryCode,
    state: location.state,
    city: location.city,
    postalCode: location.postalCode,
    level: locationLevel(location),
    label: locationLabel(location),
    active: location.active,
  };
}

/** Read-side helpers shared by taxonomy administration and provider capability management. */
@Injectable()
export class TaxonomyLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async categoryIndex(): Promise<TreeIndex<CategoryNode>> {
    return buildTreeIndex(
      await this.prisma.serviceCategory.findMany({ select: { ...nodeSelect, categoryType: true } }),
    );
  }

  async industryIndex(): Promise<TreeIndex<IndustryNode>> {
    return buildTreeIndex(await this.prisma.industry.findMany({ select: nodeSelect }));
  }

  /** Category names from the root down to and including the category itself. */
  categoryPath(index: TreeIndex<CategoryNode>, categoryId: string) {
    const category = index.byId.get(categoryId);
    return category ? [...ancestorsOf(index, categoryId), category].map((node) => node.name) : [];
  }

  /**
   * Returns the requested ids that cannot be newly assigned to a provider: unknown, inactive, or
   * (for services and industries) under an inactive category/industry.
   */
  async unassignableIds(kind: TaxonomyReferenceKind, ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const usable = new Set<string>();

    if (kind === 'services') {
      const [services, index] = await Promise.all([
        this.prisma.service.findMany({ where: { id: { in: ids } }, select: { id: true, active: true, categoryId: true } }),
        this.categoryIndex(),
      ]);
      for (const service of services) {
        if (service.active && isEffectivelyActive(index, service.categoryId)) usable.add(service.id);
      }
    } else if (kind === 'industries') {
      const index = await this.industryIndex();
      for (const id of ids) {
        if (isEffectivelyActive(index, id)) usable.add(id);
      }
    } else if (kind === 'standards') {
      const rows = await this.prisma.standard.findMany({ where: { id: { in: ids }, active: true }, select: { id: true } });
      rows.forEach((row) => usable.add(row.id));
    } else {
      const rows = await this.prisma.location.findMany({ where: { id: { in: ids }, active: true }, select: { id: true } });
      rows.forEach((row) => usable.add(row.id));
    }

    return ids.filter((id) => !usable.has(id));
  }

  /** Active reference data a provider may choose from. */
  async providerCatalog() {
    const [categoryIndex, industryIndex, services, standards, locations] = await Promise.all([
      this.categoryIndex(),
      this.industryIndex(),
      this.prisma.service.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, slug: true, categoryId: true },
      }),
      this.prisma.standard.findMany({
        where: { active: true },
        orderBy: { code: 'asc' },
        select: { id: true, code: true, name: true, version: true },
      }),
      this.prisma.location.findMany({
        where: { active: true },
        orderBy: [{ countryCode: 'asc' }, { state: { sort: 'asc', nulls: 'first' } }, { city: { sort: 'asc', nulls: 'first' } }],
      }),
    ]);

    const categoryOrder = new Map(orderDepthFirst(categoryIndex).map(({ node }, position) => [node.id, position]));

    return {
      services: services
        .filter((service) => isEffectivelyActive(categoryIndex, service.categoryId))
        .sort((a, b) => (categoryOrder.get(a.categoryId) ?? 0) - (categoryOrder.get(b.categoryId) ?? 0))
        .map((service) => {
          const category = categoryIndex.byId.get(service.categoryId)!;
          return {
            id: service.id,
            name: service.name,
            slug: service.slug,
            category: { id: category.id, name: category.name, categoryType: category.categoryType },
            categoryPath: this.categoryPath(categoryIndex, service.categoryId),
          };
        }),
      standards,
      industries: orderDepthFirst(industryIndex)
        .filter(({ node }) => isEffectivelyActive(industryIndex, node.id))
        .map(({ node, depth }) => ({
          id: node.id,
          parentId: node.parentId,
          name: node.name,
          slug: node.slug,
          depth,
          path: ancestorsOf(industryIndex, node.id).map((ancestor) => ancestor.name),
        })),
      locations: locations.map(toLocationSummary),
    };
  }
}
