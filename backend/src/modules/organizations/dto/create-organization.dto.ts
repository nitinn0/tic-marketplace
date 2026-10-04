import { OrganizationType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUrl, Length, Matches, MaxLength } from 'class-validator';

import { Trim, TrimUpper } from './transforms.js';

export class CreateOrganizationDto {
  @Trim()
  @IsString()
  @Length(2, 200)
  legalName: string;

  @Trim()
  @IsString()
  @Length(2, 120)
  displayName: string;

  @TrimUpper()
  @IsEnum(OrganizationType)
  organizationType: OrganizationType;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  taxId?: string;

  @IsOptional()
  @Trim()
  @IsUrl({ require_tld: false }, { message: 'website must be a valid URL' })
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @TrimUpper()
  @Matches(/^[A-Z]{2}$/, { message: 'countryCode must be an ISO 3166-1 alpha-2 code' })
  countryCode?: string;
}
