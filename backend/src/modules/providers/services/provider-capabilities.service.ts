import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CoverageType, Prisma } from '@prisma/client';

import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../../../common/audit/audit-actions.js';
import { AuditService } from '../../../common/audit/audit.service.js';
import { isUniqueViolation } from '../../../common/utils/prisma-errors.js';
import { PrismaService } from '../../../database/prisma.service.js';
import {
  TaxonomyLookupService,
  toLocationSummary,
  type TaxonomyReferenceKind,
} from '../../taxonomy/services/taxonomy-lookup.service.js';
import { ancestorsOf, isEffectivelyActive } from '../../taxonomy/utils/tree.util.js';

export type CapabilityKind = TaxonomyReferenceKind;
export type CapabilityEntry = { id: string; coverageType?: CoverageType | null };

type Db = Prisma.TransactionClient;

type CapabilityRepository = {
  /** Assigned reference id -> coverage type (always null except for locations). */
  current(providerId: string): Promise<Map<string, CoverageType | null>>;
  add(providerId: string, entries: CapabilityEntry[]): Promise<unknown>;
  remove(providerId: string, ids: string[]): Promise<number>;
  setCoverage(providerId: string, id: string, coverageType: CoverageType | null): Promise<unknown>;
};

const SINGULAR: Record<CapabilityKind, string> = {
  services: 'service',
  standards: 'standard',
  industries: 'industry',
  locations: 'location',
};

/**
 * Provider capabilities link a provider profile to taxonomy master data. Uniqueness is enforced by
 * the composite primary keys and checked up front so callers get a clear 409 instead of a 500.
 * Newly added references must be effectively active; existing ones stay when they are deactivated
 * later so a provider's history is not silently rewritten.
 */
@Injectable()
export class ProviderCapabilitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly lookup: TaxonomyLookupService,
  ) {}

  async requireProfileId(organizationId: string) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { organizationId }, select: { id: true } });
    if (!profile) throw new NotFoundException('Provider profile not found. Create the profile first.');
    return profile.id;
  }

  async summary(providerId: string) {
    const [services, standards, industries, locations] = await Promise.all([
      this.listServices(providerId),
      this.listStandards(providerId),
      this.listIndustries(providerId),
      this.listLocations(providerId),
    ]);
    return { services, standards, industries, locations };
  }

  async listForOrganization(organizationId: string, kind: CapabilityKind) {
    return this.list(await this.requireProfileId(organizationId), kind);
  }

  async replace(organizationId: string, actorId: string, kind: CapabilityKind, entries: CapabilityEntry[]) {
    const providerId = await this.requireProfileId(organizationId);
    const requested = new Map(entries.map((entry) => [entry.id, entry.coverageType ?? null]));

    await this.prisma.$transaction(async (tx) => {
      // Serialises concurrent replacements of the same profile.
      await tx.$queryRaw`SELECT id FROM provider_profiles WHERE id = ${providerId}::uuid FOR UPDATE`;
      const repository = this.repository(tx, kind);
      const existing = await repository.current(providerId);

      const added = [...requested.keys()].filter((id) => !existing.has(id));
      const removed = [...existing.keys()].filter((id) => !requested.has(id));
      const updated = [...requested].filter(([id, coverage]) => existing.has(id) && existing.get(id) !== coverage);

      await this.assertAssignable(kind, added);
      if (added.length === 0 && removed.length === 0 && updated.length === 0) return;

      await repository.remove(providerId, removed);
      await repository.add(
        providerId,
        added.map((id) => ({ id, coverageType: requested.get(id) })),
      );
      for (const [id, coverageType] of updated) {
        await repository.setCoverage(providerId, id, coverageType);
      }

      await this.logChange(tx, organizationId, providerId, actorId, {
        kind,
        added,
        removed,
        ...(kind === 'locations' ? { coverageChanged: updated.map(([id]) => id) } : {}),
      });
    });

    return this.list(providerId, kind);
  }

  async add(organizationId: string, actorId: string, kind: CapabilityKind, entry: CapabilityEntry) {
    const providerId = await this.requireProfileId(organizationId);
    const repository = this.repository(this.prisma, kind);

    if ((await repository.current(providerId)).has(entry.id)) {
      throw new ConflictException(`This ${SINGULAR[kind]} is already on the provider profile`);
    }
    await this.assertAssignable(kind, [entry.id]);

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.repository(tx, kind).add(providerId, [entry]);
        await this.logChange(tx, organizationId, providerId, actorId, { kind, added: [entry.id], removed: [] });
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`This ${SINGULAR[kind]} is already on the provider profile`);
      }
      throw error;
    }

    return this.list(providerId, kind);
  }

  async remove(organizationId: string, actorId: string, kind: CapabilityKind, refId: string) {
    const providerId = await this.requireProfileId(organizationId);

    await this.prisma.$transaction(async (tx) => {
      const removed = await this.repository(tx, kind).remove(providerId, [refId]);
      if (removed === 0) {
        throw new NotFoundException(`This ${SINGULAR[kind]} is not on the provider profile`);
      }
      await this.logChange(tx, organizationId, providerId, actorId, { kind, added: [], removed: [refId] });
    });

    return this.list(providerId, kind);
  }

  list(providerId: string, kind: CapabilityKind) {
    switch (kind) {
      case 'services':
        return this.listServices(providerId);
      case 'standards':
        return this.listStandards(providerId);
      case 'industries':
        return this.listIndustries(providerId);
      case 'locations':
        return this.listLocations(providerId);
    }
  }

  async listServices(providerId: string) {
    const [rows, index] = await Promise.all([
      this.prisma.providerService.findMany({ where: { providerId }, include: { service: true } }),
      this.lookup.categoryIndex(),
    ]);
    return rows
      .map(({ service, createdAt }) => {
        const category = index.byId.get(service.categoryId);
        return {
          id: service.id,
          name: service.name,
          slug: service.slug,
          active: service.active,
          effectiveActive: service.active && isEffectivelyActive(index, service.categoryId),
          category: category ? { id: category.id, name: category.name, categoryType: category.categoryType } : null,
          categoryPath: this.lookup.categoryPath(index, service.categoryId),
          assignedAt: createdAt,
        };
      })
      .sort((a, b) => a.categoryPath.join('/').localeCompare(b.categoryPath.join('/')) || a.name.localeCompare(b.name));
  }

  async listStandards(providerId: string) {
    const rows = await this.prisma.providerStandard.findMany({
      where: { providerId },
      include: { standard: true },
      orderBy: { standard: { code: 'asc' } },
    });
    return rows.map(({ standard, createdAt }) => ({
      id: standard.id,
      code: standard.code,
      name: standard.name,
      version: standard.version,
      active: standard.active,
      effectiveActive: standard.active,
      assignedAt: createdAt,
    }));
  }

  async listIndustries(providerId: string) {
    const [rows, index] = await Promise.all([
      this.prisma.providerIndustry.findMany({ where: { providerId }, include: { industry: true } }),
      this.lookup.industryIndex(),
    ]);
    return rows
      .map(({ industry, createdAt }) => ({
        id: industry.id,
        name: industry.name,
        slug: industry.slug,
        active: industry.active,
        effectiveActive: isEffectivelyActive(index, industry.id),
        path: ancestorsOf(index, industry.id).map((ancestor) => ancestor.name),
        assignedAt: createdAt,
      }))
      .sort((a, b) => [...a.path, a.name].join('/').localeCompare([...b.path, b.name].join('/')));
  }

  async listLocations(providerId: string) {
    const rows = await this.prisma.providerLocation.findMany({ where: { providerId }, include: { location: true } });
    return rows
      .map(({ location, coverageType, createdAt }) => ({
        ...toLocationSummary(location),
        effectiveActive: location.active,
        coverageType,
        assignedAt: createdAt,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  private async assertAssignable(kind: CapabilityKind, ids: string[]) {
    const invalid = await this.lookup.unassignableIds(kind, ids);
    if (invalid.length > 0) {
      throw new BadRequestException(
        `${invalid.length === 1 ? `A ${SINGULAR[kind]} does` : `${invalid.length} ${kind} do`} not exist or are inactive: ${invalid.join(', ')}`,
      );
    }
  }

  private logChange(
    tx: Db,
    organizationId: string,
    providerId: string,
    actorId: string,
    metadata: Prisma.InputJsonObject,
  ) {
    return this.audit.log(
      {
        action: AUDIT_ACTIONS.providerCapabilitiesChanged,
        entityType: AUDIT_ENTITIES.providerProfile,
        entityId: providerId,
        organizationId,
        actorUserId: actorId,
        metadata,
      },
      tx,
    );
  }

  private repository(db: Db, kind: CapabilityKind): CapabilityRepository {
    const noCoverage = async () => undefined;
    switch (kind) {
      case 'services':
        return {
          current: async (providerId) =>
            new Map(
              (await db.providerService.findMany({ where: { providerId }, select: { serviceId: true } })).map((row) => [
                row.serviceId,
                null,
              ]),
            ),
          add: (providerId, entries) =>
            db.providerService.createMany({ data: entries.map((entry) => ({ providerId, serviceId: entry.id })) }),
          remove: async (providerId, ids) =>
            ids.length ? (await db.providerService.deleteMany({ where: { providerId, serviceId: { in: ids } } })).count : 0,
          setCoverage: noCoverage,
        };
      case 'standards':
        return {
          current: async (providerId) =>
            new Map(
              (await db.providerStandard.findMany({ where: { providerId }, select: { standardId: true } })).map((row) => [
                row.standardId,
                null,
              ]),
            ),
          add: (providerId, entries) =>
            db.providerStandard.createMany({ data: entries.map((entry) => ({ providerId, standardId: entry.id })) }),
          remove: async (providerId, ids) =>
            ids.length ? (await db.providerStandard.deleteMany({ where: { providerId, standardId: { in: ids } } })).count : 0,
          setCoverage: noCoverage,
        };
      case 'industries':
        return {
          current: async (providerId) =>
            new Map(
              (await db.providerIndustry.findMany({ where: { providerId }, select: { industryId: true } })).map((row) => [
                row.industryId,
                null,
              ]),
            ),
          add: (providerId, entries) =>
            db.providerIndustry.createMany({ data: entries.map((entry) => ({ providerId, industryId: entry.id })) }),
          remove: async (providerId, ids) =>
            ids.length ? (await db.providerIndustry.deleteMany({ where: { providerId, industryId: { in: ids } } })).count : 0,
          setCoverage: noCoverage,
        };
      case 'locations':
        return {
          current: async (providerId) =>
            new Map(
              (
                await db.providerLocation.findMany({ where: { providerId }, select: { locationId: true, coverageType: true } })
              ).map((row) => [row.locationId, row.coverageType]),
            ),
          add: (providerId, entries) =>
            db.providerLocation.createMany({
              data: entries.map((entry) => ({ providerId, locationId: entry.id, coverageType: entry.coverageType ?? null })),
            }),
          remove: async (providerId, ids) =>
            ids.length ? (await db.providerLocation.deleteMany({ where: { providerId, locationId: { in: ids } } })).count : 0,
          setCoverage: (providerId, locationId, coverageType) =>
            db.providerLocation.update({
              where: { providerId_locationId: { providerId, locationId } },
              data: { coverageType },
            }),
        };
    }
  }
}
