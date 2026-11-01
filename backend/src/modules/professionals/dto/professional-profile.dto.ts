import { AvailabilityStatus, ProfessionalType } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

import { OptionalNotNull, Squish, Trim, TrimUpper } from '../../../common/dto/transforms.js';

/** verification_status is not accepted from clients; it is reserved for the Phase 5 workflow. */
export class CreateProfessionalProfileDto {
  @TrimUpper()
  @IsEnum(ProfessionalType)
  professionalType: ProfessionalType;

  @IsOptional()
  @Squish()
  @IsString()
  @MaxLength(160)
  headline?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(5000)
  bio?: string | null;

  @IsOptional()
  @Squish()
  @IsString()
  @MaxLength(120)
  baseCity?: string | null;

  @IsOptional()
  @Squish()
  @IsString()
  @MaxLength(200)
  primaryAccreditation?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  yearsExperience?: number | null;

  @OptionalNotNull()
  @TrimUpper()
  @IsEnum(AvailabilityStatus)
  availabilityStatus?: AvailabilityStatus;

  @OptionalNotNull()
  @IsBoolean()
  publicProfile?: boolean;
}

export class UpdateProfessionalProfileDto {
  @OptionalNotNull()
  @TrimUpper()
  @IsEnum(ProfessionalType)
  professionalType?: ProfessionalType;

  @IsOptional()
  @Squish()
  @IsString()
  @MaxLength(160)
  headline?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(5000)
  bio?: string | null;

  @IsOptional()
  @Squish()
  @IsString()
  @MaxLength(120)
  baseCity?: string | null;

  @IsOptional()
  @Squish()
  @IsString()
  @MaxLength(200)
  primaryAccreditation?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  yearsExperience?: number | null;

  @OptionalNotNull()
  @TrimUpper()
  @IsEnum(AvailabilityStatus)
  availabilityStatus?: AvailabilityStatus;

  @OptionalNotNull()
  @IsBoolean()
  publicProfile?: boolean;
}

/** Self-serve join for independents: grants PROFESSIONAL role and creates the profile. */
export class OnboardProfessionalDto extends CreateProfessionalProfileDto {
  @Trim()
  @IsString()
  @Length(2, 80)
  firstName: string;

  @Trim()
  @IsString()
  @Length(2, 80)
  lastName: string;
}
