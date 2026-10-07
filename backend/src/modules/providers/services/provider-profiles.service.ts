import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ProviderProfile } from '@prisma/client';

import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../../../common/audit/audit-actions.js';
import { AuditService } from '../../../common/audit/audit.service.js';
import { isUniqueViolation } from '../../../common/utils/prisma-errors.js';
import { diffChanges, optionalText } from '../../../common/utils/record-changes.js';
import { PrismaService } from '../../../database/prisma.service.js';
import type { OrganizationAccessContext } from '../../rbac/services/organization-access.service.js';
import { CreateProviderProfileDto, UpdateProviderProfileDto } from '../dto/provider-profile.dto.js';
import { isProviderProfilePubliclyVisible, PUBLIC_PROVIDER_PROFILE_WHERE } from '../provider-visibility.js';
import { ProviderCapabilitiesService } from './provider-capabilities.service.js';

type Organization = OrganizationAccessContext['organization'];

/**
 * One provider profile per PROVIDER organization. The organization is always taken from the
 * resolved organization context, never from the request body, so a user cannot address another
 * organization's profile.
 */
@Injectable()
export class ProviderProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly capabilities: ProviderCapabilitiesService,
  ) {}

  async get(context: OrganizationAccessContext) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { organizationId: context.organization.id } });
    if (!profile) throw new NotFoundException('Provider profile not found');
    return {
      ...this.toProfile(profile, context.organization),
      capabilities: await this.capabilities.summary(profile.id),
    };
  }

  async create(context: OrganizationAccessContext, actorId: string, dto: CreateProviderProfileDto) {
    const organization = context.organization;
    this.assertProviderOrganization(organization);

    if (await this.prisma.providerProfile.findUnique({ where: { organizationId: organization.id }, select: { id: true } })) {
      throw new ConflictException('This organization already has a provider profile');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const profile = await tx.providerProfile.create({
          data: {
            organizationId: organization.id,
            providerType: dto.providerType,
            headline: optionalText(dto.headline) ?? null,
            description: optionalText(dto.description) ?? null,
            yearsInBusiness: dto.yearsInBusiness ?? null,
            publicProfile: dto.publicProfile ?? false,
          },
        });
        await this.audit.log(
          {
            action: AUDIT_ACTIONS.providerProfileCreated,
            entityType: AUDIT_ENTITIES.providerProfile,
            entityId: profile.id,
            organizationId: organization.id,
            actorUserId: actorId,
            metadata: { providerType: profile.providerType, publicProfile: profile.publicProfile },
          },
          tx,
        );
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('This organization already has a provider profile');
      throw error;
    }

    return this.get(context);
  }

  async update(context: OrganizationAccessContext, actorId: string, dto: UpdateProviderProfileDto) {
    this.assertProviderOrganization(context.organization);
    const current = await this.prisma.providerProfile.findUnique({ where: { organizationId: context.organization.id } });
    if (!current) throw new NotFoundException('Provider profile not found');

    const { data, changes, changed } = diffChanges(current, {
      providerType: dto.providerType,
      headline: optionalText(dto.headline),
      description: optionalText(dto.description),
      yearsInBusiness: dto.yearsInBusiness,
      publicProfile: dto.publicProfile,
    });

    if (changed) {
      await this.prisma.$transaction(async (tx) => {
        await tx.providerProfile.update({ where: { id: current.id }, data: data as Prisma.ProviderProfileUpdateInput });
        await this.audit.log(
          {
            action: AUDIT_ACTIONS.providerProfileUpdated,
            entityType: AUDIT_ENTITIES.providerProfile,
            entityId: current.id,
            organizationId: context.organization.id,
            actorUserId: actorId,
            metadata: { changes },
          },
          tx,
        );
      });
    }

    return this.get(context);
  }

  /**
   * Service-layer entry point for future public APIs: returns null unless the profile satisfies
   * the public visibility rule, and only exposes public fields.
   */
  async findPublicProfile(organizationId: string) {
    const profile = await this.prisma.providerProfile.findFirst({
      where: { organizationId, ...PUBLIC_PROVIDER_PROFILE_WHERE },
      include: { organization: { select: { id: true, displayName: true, verificationStatus: true } } },
    });
    if (!profile) return null;

    const capabilities = await this.capabilities.summary(profile.id);
    const activeOnly = <T extends { effectiveActive: boolean }>(items: T[]) =>
      items.filter((item) => item.effectiveActive).map(({ effectiveActive: _active, ...item }) => item);

    return {
      organization: { id: profile.organization.id, displayName: profile.organization.displayName },
      providerType: profile.providerType,
      headline: profile.headline,
      description: profile.description,
      yearsInBusiness: profile.yearsInBusiness,
      verificationStatus: profile.verificationStatus,
      services: activeOnly(capabilities.services),
      standards: activeOnly(capabilities.standards),
      industries: activeOnly(capabilities.industries),
      locations: activeOnly(capabilities.locations),
    };
  }

  private assertProviderOrganization(organization: Organization) {
    if (organization.organizationType !== 'PROVIDER') {
      throw new ForbiddenException('Only provider organizations can have a provider profile');
    }
  }

  private toProfile(profile: ProviderProfile, organization: Organization) {
    return {
      id: profile.id,
      organizationId: profile.organizationId,
      organization: {
        id: organization.id,
        legalName: organization.legalName,
        displayName: organization.displayName,
        organizationType: organization.organizationType,
        status: organization.status,
      },
      providerType: profile.providerType,
      headline: profile.headline,
      description: profile.description,
      yearsInBusiness: profile.yearsInBusiness,
      verificationStatus: profile.verificationStatus,
      verifiedAt: profile.verifiedAt,
      publicProfile: profile.publicProfile,
      /** Whether the public visibility rule currently lets this profile be shown publicly. */
      publiclyVisible: isProviderProfilePubliclyVisible(profile, organization),
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
