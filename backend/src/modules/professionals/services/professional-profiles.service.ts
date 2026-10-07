import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ProfessionalExperience, ProfessionalProfile } from '@prisma/client';

import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../../../common/audit/audit-actions.js';
import { AuditService } from '../../../common/audit/audit.service.js';
import { isUniqueViolation } from '../../../common/utils/prisma-errors.js';
import { diffChanges, optionalText } from '../../../common/utils/record-changes.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { CreateExperienceDto, UpdateExperienceDto } from '../dto/professional-experience.dto.js';
import { CreateProfessionalProfileDto, UpdateProfessionalProfileDto } from '../dto/professional-profile.dto.js';
import { isProfessionalProfilePubliclyVisible, PUBLIC_PROFESSIONAL_PROFILE_WHERE } from '../professional-visibility.js';

const EXPERIENCE_ORDER: Prisma.ProfessionalExperienceOrderByWithRelationInput[] = [
  { startDate: 'desc' },
  { endDate: { sort: 'desc', nulls: 'first' } },
  { createdAt: 'desc' },
];

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const formatDate = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);
const todayUtc = () => new Date().toISOString().slice(0, 10);

function toExperience(row: ProfessionalExperience) {
  return {
    id: row.id,
    organizationName: row.organizationName,
    jobTitle: row.jobTitle,
    startDate: formatDate(row.startDate),
    endDate: formatDate(row.endDate),
    current: row.endDate === null,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function assertDateRange(startDate: string, endDate: string | null) {
  if (startDate > todayUtc()) throw new BadRequestException('startDate cannot be in the future');
  if (endDate && endDate < startDate) throw new BadRequestException('endDate cannot be before startDate');
}

/**
 * Professional profiles belong to an individual user; every operation is keyed by the
 * authenticated user's id, so one user can never read or change another user's profile.
 */
@Injectable()
export class ProfessionalProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { status: true } },
        experience: { orderBy: EXPERIENCE_ORDER },
      },
    });
    if (!profile) throw new NotFoundException('Professional profile not found');

    return {
      ...this.toProfile(profile),
      publiclyVisible: isProfessionalProfilePubliclyVisible(profile, profile.user),
      experience: profile.experience.map(toExperience),
    };
  }

  async create(userId: string, dto: CreateProfessionalProfileDto) {
    if (await this.prisma.professionalProfile.findUnique({ where: { userId }, select: { id: true } })) {
      throw new ConflictException('You already have a professional profile');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const profile = await tx.professionalProfile.create({
          data: {
            userId,
            professionalType: dto.professionalType,
            headline: optionalText(dto.headline) ?? null,
            bio: optionalText(dto.bio) ?? null,
            yearsExperience: dto.yearsExperience ?? null,
            availabilityStatus: dto.availabilityStatus ?? 'AVAILABLE',
            publicProfile: dto.publicProfile ?? false,
          },
        });
        await this.audit.log(
          {
            action: AUDIT_ACTIONS.professionalProfileCreated,
            entityType: AUDIT_ENTITIES.professionalProfile,
            entityId: profile.id,
            actorUserId: userId,
            targetUserId: userId,
            metadata: { professionalType: profile.professionalType, publicProfile: profile.publicProfile },
          },
          tx,
        );
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('You already have a professional profile');
      throw error;
    }

    return this.get(userId);
  }

  async update(userId: string, dto: UpdateProfessionalProfileDto) {
    const current = await this.requireProfile(userId);

    const { data, changes, changed } = diffChanges(current, {
      professionalType: dto.professionalType,
      headline: optionalText(dto.headline),
      bio: optionalText(dto.bio),
      yearsExperience: dto.yearsExperience,
      availabilityStatus: dto.availabilityStatus,
      publicProfile: dto.publicProfile,
    });

    if (changed) {
      await this.prisma.$transaction(async (tx) => {
        await tx.professionalProfile.update({
          where: { id: current.id },
          data: data as Prisma.ProfessionalProfileUpdateInput,
        });
        await this.audit.log(
          {
            action: AUDIT_ACTIONS.professionalProfileUpdated,
            entityType: AUDIT_ENTITIES.professionalProfile,
            entityId: current.id,
            actorUserId: userId,
            targetUserId: userId,
            metadata: { changes },
          },
          tx,
        );
      });
    }

    return this.get(userId);
  }

  async listExperience(userId: string) {
    const profile = await this.requireProfile(userId);
    const rows = await this.prisma.professionalExperience.findMany({
      where: { professionalId: profile.id },
      orderBy: EXPERIENCE_ORDER,
    });
    return rows.map(toExperience);
  }

  async createExperience(userId: string, dto: CreateExperienceDto) {
    const profile = await this.requireProfile(userId);
    const endDate = optionalText(dto.endDate) ?? null;
    assertDateRange(dto.startDate, endDate);

    const created = await this.prisma.$transaction(async (tx) => {
      const experience = await tx.professionalExperience.create({
        data: {
          professionalId: profile.id,
          organizationName: dto.organizationName,
          jobTitle: dto.jobTitle,
          startDate: toDate(dto.startDate),
          endDate: endDate ? toDate(endDate) : null,
          description: optionalText(dto.description) ?? null,
        },
      });
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.professionalExperienceCreated,
          entityType: AUDIT_ENTITIES.professionalExperience,
          entityId: experience.id,
          actorUserId: userId,
          targetUserId: userId,
          metadata: { organizationName: experience.organizationName, jobTitle: experience.jobTitle },
        },
        tx,
      );
      return experience;
    });

    return toExperience(created);
  }

  async updateExperience(userId: string, experienceId: string, dto: UpdateExperienceDto) {
    const current = await this.requireExperience(userId, experienceId);

    const startDate = dto.startDate ?? formatDate(current.startDate)!;
    const endDate = dto.endDate !== undefined ? (optionalText(dto.endDate) ?? null) : formatDate(current.endDate);
    assertDateRange(startDate, endDate);

    const { data, changes, changed } = diffChanges(current, {
      organizationName: dto.organizationName,
      jobTitle: dto.jobTitle,
      startDate: toDate(startDate),
      endDate: endDate ? toDate(endDate) : null,
      description: optionalText(dto.description),
    });
    if (!changed) return toExperience(current);

    const updated = await this.prisma.$transaction(async (tx) => {
      const experience = await tx.professionalExperience.update({
        where: { id: current.id },
        data: data as Prisma.ProfessionalExperienceUpdateInput,
      });
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.professionalExperienceUpdated,
          entityType: AUDIT_ENTITIES.professionalExperience,
          entityId: current.id,
          actorUserId: userId,
          targetUserId: userId,
          metadata: { changes },
        },
        tx,
      );
      return experience;
    });

    return toExperience(updated);
  }

  async deleteExperience(userId: string, experienceId: string) {
    const current = await this.requireExperience(userId, experienceId);

    await this.prisma.$transaction(async (tx) => {
      await tx.professionalExperience.delete({ where: { id: current.id } });
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.professionalExperienceDeleted,
          entityType: AUDIT_ENTITIES.professionalExperience,
          entityId: current.id,
          actorUserId: userId,
          targetUserId: userId,
          metadata: { organizationName: current.organizationName, jobTitle: current.jobTitle },
        },
        tx,
      );
    });

    return { id: current.id, deleted: true };
  }

  /**
   * Service-layer entry point for future public APIs: null unless the profile satisfies the
   * public visibility rule; internal fields are omitted.
   */
  async findPublicProfile(userId: string) {
    const profile = await this.prisma.professionalProfile.findFirst({
      where: { userId, ...PUBLIC_PROFESSIONAL_PROFILE_WHERE },
      include: {
        user: { select: { firstName: true, lastName: true } },
        experience: { orderBy: EXPERIENCE_ORDER },
      },
    });
    if (!profile) return null;

    return {
      firstName: profile.user.firstName,
      lastName: profile.user.lastName,
      professionalType: profile.professionalType,
      headline: profile.headline,
      bio: profile.bio,
      yearsExperience: profile.yearsExperience,
      availabilityStatus: profile.availabilityStatus,
      verificationStatus: profile.verificationStatus,
      experience: profile.experience.map(({ organizationName, jobTitle, startDate, endDate, description }) => ({
        organizationName,
        jobTitle,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        description,
      })),
    };
  }

  private async requireProfile(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Professional profile not found. Create your profile first.');
    return profile;
  }

  /** Another user's experience id yields 404, the same as an unknown id. */
  private async requireExperience(userId: string, experienceId: string) {
    const experience = await this.prisma.professionalExperience.findFirst({
      where: { id: experienceId, professional: { userId } },
    });
    if (!experience) throw new NotFoundException('Experience entry not found');
    return experience;
  }

  private toProfile(profile: ProfessionalProfile) {
    return {
      id: profile.id,
      userId: profile.userId,
      professionalType: profile.professionalType,
      headline: profile.headline,
      bio: profile.bio,
      yearsExperience: profile.yearsExperience,
      availabilityStatus: profile.availabilityStatus,
      verificationStatus: profile.verificationStatus,
      publicProfile: profile.publicProfile,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
