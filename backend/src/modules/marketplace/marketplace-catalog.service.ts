import { Injectable, NotFoundException } from '@nestjs/common';
import type { ProviderProfile, Service, ServiceCategory } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';
import { PUBLIC_PROVIDER_PROFILE_WHERE } from '../providers/provider-visibility.js';
import { locationLabel } from '../taxonomy/utils/location.util.js';
import { ancestorsOf, buildTreeIndex, descendantIdsOf, isEffectivelyActive } from '../taxonomy/utils/tree.util.js';
import { MarketplaceServicesQueryDto } from './dto/marketplace-query.dto.js';

const POPULAR_SLUGS = [
  'water-chemical-testing',
  'iso-9001-certification',
  'ghg-verification',
  'factory-inspection',
  'iso-27001-certification',
  'water-microbiological-testing',
  'iso-14001-certification',
  'supplier-audit',
];

const CATEGORY_TAGLINE: Record<string, string> = {
  testing: 'Labs for product, material and environmental testing.',
  inspection: 'On-site inspection of goods, plants and shipments.',
  certification: 'Accredited certification of systems, products and people.',
  'experts-consulting': 'Auditors, verifiers and sustainability consultants.',
};

type CategoryRow = ServiceCategory;
type ServiceRow = Service & {
  category: ServiceCategory;
  providers: { providerId: string }[];
};

type PublicProvider = ProviderProfile & {
  organization: { displayName: string; status: string; organizationType: string };
  services: { service: { id: string; name: string; slug: string } }[];
  locations: { location: { countryCode: string; state: string | null; city: string | null; postalCode: string | null } }[];
};

@Injectable()
export class MarketplaceCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async home() {
    const [categories, services, providers, industries] = await Promise.all([
      this.prisma.serviceCategory.findMany(),
      this.activeServices(),
      this.publicProviders(),
      this.prisma.industry.findMany({ where: { active: true, parentId: null }, orderBy: { sortOrder: 'asc' } }),
    ]);
    const index = buildTreeIndex(categories);
    const roots = (index.childrenOf.get(null) ?? []).filter((category) => category.active);

    return {
      counts: {
        verifiedProviders: providers.filter((provider) => provider.verificationStatus === 'VERIFIED').length,
        providers: providers.length,
        services: services.length,
      },
      categories: roots.map((root) => ({
        id: root.slug,
        slug: root.slug,
        name: root.name,
        categoryType: root.categoryType,
        tagline: root.description || CATEGORY_TAGLINE[root.slug] || '',
        serviceCount: services.filter((service) => this.rootId(index, service.categoryId) === root.id).length,
      })),
      popular: this.popular(services),
      providers: providers.slice(0, 6).map((provider) => this.toProviderCard(provider)),
      industries: industries.map((industry) => industry.name),
    };
  }

  async listServices(query: MarketplaceServicesQueryDto) {
    const [categories, services] = await Promise.all([
      this.prisma.serviceCategory.findMany(),
      this.activeServices(),
    ]);
    const index = buildTreeIndex(categories);
    const category = query.category
      ? categories.find((row) => row.slug === query.category && isEffectivelyActive(index, row.id))
      : undefined;
    if (query.category && !category) {
      throw new NotFoundException('Category not found');
    }
    const allowed = category ? new Set([category.id, ...descendantIdsOf(index, category.id)]) : null;
    const keywords = (query.q ?? '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 0);
    const filtered = services.filter((service) => {
      if (allowed && !allowed.has(service.categoryId)) return false;
      if (keywords.length === 0) return true;
      const path = ancestorsOf(index, service.categoryId).map((node) => node.name).join(' ');
      const haystack = `${service.name} ${service.slug.replaceAll('-', ' ')} ${service.description ?? ''} ${service.category.name} ${path}`.toLowerCase();
      return keywords.every((word) => haystack.includes(word));
    });
    return {
      services: filtered.map((service) => this.toServiceCard(service, index)),
      category: category ? { slug: category.slug, name: category.name } : null,
    };
  }

  async serviceBySlug(slug: string) {
    const [categories, services, providers] = await Promise.all([
      this.prisma.serviceCategory.findMany(),
      this.activeServices(),
      this.publicProviders(),
    ]);
    const index = buildTreeIndex(categories);
    const service = services.find((row) => row.slug === slug);
    if (!service || !isEffectivelyActive(index, service.categoryId)) {
      throw new NotFoundException('Service not found');
    }
    const offering = providers.filter((provider) => provider.services.some((row) => row.service.id === service.id));
    return {
      ...this.toServiceCard(service, index),
      description: service.description,
      providers: offering.map((provider) => this.toProviderCard(provider)),
    };
  }

  async listProviders() {
    const providers = await this.publicProviders();
    return { providers: providers.map((provider) => this.toProviderCard(provider)) };
  }

  async providerById(id: string) {
    const provider = await this.prisma.providerProfile.findFirst({
      where: { id, ...PUBLIC_PROVIDER_PROFILE_WHERE },
      include: this.providerInclude(),
    });
    if (!provider) throw new NotFoundException('Provider not found');
    return {
      ...this.toProviderCard(provider),
      description: provider.description,
      yearsInBusiness: provider.yearsInBusiness,
      standards: [],
    };
  }

  private popular(services: ServiceRow[]) {
    const bySlug = new Map(services.map((service) => [service.slug, service]));
    const picked = POPULAR_SLUGS.map((slug) => bySlug.get(slug)).filter((service): service is ServiceRow => Boolean(service));
    const rest = services.filter((service) => !POPULAR_SLUGS.includes(service.slug));
    return [...picked, ...rest].slice(0, 8).map((service) => this.toServiceCard(service));
  }

  private toServiceCard(service: ServiceRow, index?: ReturnType<typeof buildTreeIndex<CategoryRow>>) {
    const path = index ? ancestorsOf(index, service.categoryId).map((node) => node.name) : [];
    return {
      id: service.id,
      slug: service.slug,
      name: service.name,
      description: service.description,
      categoryName: service.category.name,
      categorySlug: service.category.slug,
      categoryType: service.category.categoryType,
      categoryPath: [...path, service.category.name],
      providerCount: service.providers.length,
    };
  }

  private toProviderCard(provider: PublicProvider) {
    return {
      id: provider.id,
      name: provider.organization.displayName,
      headline: provider.headline,
      providerType: provider.providerType,
      verified: provider.verificationStatus === 'VERIFIED',
      yearsInBusiness: provider.yearsInBusiness,
      services: provider.services.map((row) => ({ slug: row.service.slug, name: row.service.name })),
      locations: provider.locations.map((row) => locationLabel(row.location)),
    };
  }

  private rootId(index: ReturnType<typeof buildTreeIndex<CategoryRow>>, categoryId: string) {
    const ancestors = ancestorsOf(index, categoryId);
    return ancestors[0]?.id ?? categoryId;
  }

  private activeServices() {
    return this.prisma.service.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        category: true,
        providers: {
          where: { provider: PUBLIC_PROVIDER_PROFILE_WHERE },
          select: { providerId: true },
        },
      },
    });
  }

  private async publicProviders() {
    const providers = await this.prisma.providerProfile.findMany({
      where: PUBLIC_PROVIDER_PROFILE_WHERE,
      orderBy: { createdAt: 'asc' },
      include: this.providerInclude(),
    });
    return providers.sort(
      (a, b) => Number(b.verificationStatus === 'VERIFIED') - Number(a.verificationStatus === 'VERIFIED'),
    );
  }

  private providerInclude() {
    return {
      organization: { select: { displayName: true, status: true, organizationType: true } },
      services: {
        where: { service: { active: true } },
        include: { service: { select: { id: true, name: true, slug: true } } },
      },
      locations: { include: { location: true } },
    } as const;
  }
}
