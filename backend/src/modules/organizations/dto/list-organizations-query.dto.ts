import { OrganizationStatus, OrganizationType } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { Trim, TrimUpper } from './transforms.js';

export class ListOrganizationsQueryDto {
  /** `member` (default): organizations with an ACTIVE membership. `all`: platform access only. */
  @IsOptional()
  @IsIn(['member', 'all'])
  scope?: 'member' | 'all';

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @TrimUpper()
  @IsEnum(OrganizationType)
  organizationType?: OrganizationType;

  @IsOptional()
  @TrimUpper()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;
}
