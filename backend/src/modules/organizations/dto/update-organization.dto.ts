import { OrganizationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUrl, Length, Matches, MaxLength, ValidateIf } from 'class-validator';

import { Trim, TrimUpper } from './transforms.js';

/**
 * organizationType is intentionally not updatable: role compatibility depends on it.
 * verificationStatus belongs to the later verification workflow. Optional text fields accept
 * null or an empty string to clear them.
 */
export class UpdateOrganizationDto {
  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 200)
  legalName?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 120)
  displayName?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  taxId?: string | null;

  @IsOptional()
  @Trim()
  @ValidateIf((_, value) => value !== '')
  @IsUrl({ require_tld: false }, { message: 'website must be a valid URL' })
  @MaxLength(255)
  website?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @TrimUpper()
  @ValidateIf((_, value) => value !== '')
  @Matches(/^[A-Z]{2}$/, { message: 'countryCode must be an ISO 3166-1 alpha-2 code' })
  countryCode?: string | null;

  /** Requires the organizations.status permission in addition to organizations.profile. */
  @IsOptional()
  @TrimUpper()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;
}
