import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Location, Prisma } from '@prisma/client';

import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../../../common/audit/audit-actions.js';
import { AuditService } from '../../../common/audit/audit.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { CreateLocationDto, UpdateLocationDto } from '../dto/location.dto.js';
import { LocationListQueryDto } from '../dto/taxonomy-query.dto.js';
import { deleteOrDeactivate, diffChanges, matchesSearch, optionalText, withUniqueConflict } from '../taxonomy.helpers.js';
import { buildLocationKey, countryName, locationLabel } from '../utils/location.util.js';
import { toLocationSummary } from './taxonomy-lookup.service.js';

const ENTITY = AUDIT_ENTITIES.location;

const include = { _count: { select: { providers: true } } } as const;

const toItem = (row: Location & { _count: { providers: number } }) => ({
  ...toLocationSummary(row),
  latitude: row.latitude,
  longitude: row.longitude,
  providerCount: row._count.providers,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

function assertHierarchy(parts: { state: string | null; city: string | null; postalCode: string | null }) {
  if (parts.city && !parts.state) {
    throw new BadRequestException('A city location requires a state');
  }
  if (parts.postalCode && !parts.city) {
    throw new BadRequestException('A postal code requires a city');
  }
}

/**
 * Reusable locations. A row with only a country represents nationwide coverage, a row with a
 * state represents state-wide coverage. Geographic search is out of scope for this phase.
 */
@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: LocationListQueryDto) {
    const rows = await this.prisma.location.findMany({
      where: {
        ...(query.active !== undefined ? { active: query.active } : {}),
        ...(query.countryCode ? { countryCode: query.countryCode } : {}),
      },
      orderBy: [{ countryCode: 'asc' }, { state: { sort: 'asc', nulls: 'first' } }, { city: { sort: 'asc', nulls: 'first' } }],
      take: 2000,
      include,
    });
    return rows
      .filter((row) =>
        matchesSearch(query.search, row.countryCode, countryName(row.countryCode), row.state, row.city, row.postalCode, locationLabel(row)),
      )
      .map(toItem);
  }

  async get(id: string) {
    const row = await this.prisma.location.findUnique({ where: { id }, include });
    if (!row) throw new NotFoundException('Location not found');
    return toItem(row);
  }

  async create(actorId: string, dto: CreateLocationDto) {
    const parts = {
      countryCode: dto.countryCode,
      state: optionalText(dto.state) ?? null,
      city: optionalText(dto.city) ?? null,
      postalCode: optionalText(dto.postalCode) ?? null,
    };
    assertHierarchy(parts);
    const locationKey = buildLocationKey(parts);

    const created = await withUniqueConflict(
      () =>
        this.prisma.$transaction(async (tx) => {
          const location = await tx.location.create({
            data: {
              ...parts,
              latitude: dto.latitude ?? null,
              longitude: dto.longitude ?? null,
              locationKey,
              active: dto.active ?? true,
            },
          });
          await this.audit.log(
            {
              action: AUDIT_ACTIONS.taxonomyCreated,
              entityType: ENTITY,
              entityId: location.id,
              actorUserId: actorId,
              metadata: { label: locationLabel(location) },
            },
            tx,
          );
          return location;
        }),
      () => `Location "${locationLabel(parts)}" already exists`,
    );
    return this.get(created.id);
  }

  async update(actorId: string, id: string, dto: UpdateLocationDto) {
    const current = await this.prisma.location.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Location not found');

    const pick = <K extends 'state' | 'city' | 'postalCode'>(key: K) => {
      const value = optionalText(dto[key]);
      return value === undefined ? current[key] : value;
    };
    const parts = {
      countryCode: dto.countryCode ?? current.countryCode,
      state: pick('state'),
      city: pick('city'),
      postalCode: pick('postalCode'),
    };
    assertHierarchy(parts);

    const { data, changes, changed } = diffChanges(current, {
      ...parts,
      locationKey: buildLocationKey(parts),
      latitude: dto.latitude,
      longitude: dto.longitude,
      active: dto.active,
    });
    if (!changed) return this.get(id);

    await withUniqueConflict(
      () =>
        this.prisma.$transaction(async (tx) => {
          await tx.location.update({ where: { id }, data: data as Prisma.LocationUpdateInput });
          await this.audit.log(
            { action: AUDIT_ACTIONS.taxonomyUpdated, entityType: ENTITY, entityId: id, actorUserId: actorId, metadata: { changes } },
            tx,
          );
        }),
      () => `Location "${locationLabel(parts)}" already exists`,
    );
    return this.get(id);
  }

  async remove(actorId: string, id: string) {
    const location = await this.prisma.location.findUnique({ where: { id } });
    if (!location) throw new NotFoundException('Location not found');

    const outcome = await deleteOrDeactivate(
      id,
      () => this.prisma.location.delete({ where: { id } }),
      () => this.prisma.location.update({ where: { id }, data: { active: false } }),
    );
    await this.audit.log({
      action: outcome.deleted ? AUDIT_ACTIONS.taxonomyDeleted : AUDIT_ACTIONS.taxonomyDeactivated,
      entityType: ENTITY,
      entityId: id,
      actorUserId: actorId,
      metadata: { label: locationLabel(location) },
    });
    return outcome;
  }
}
