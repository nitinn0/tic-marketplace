import { IsBoolean, IsOptional, IsString } from 'class-validator';

import { IsOptionalOrganizationType } from './organization-type.transform.js';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptionalOrganizationType()
  organizationType?: string | null;

  @IsOptional()
  @IsString()
  baselineAccessLevelId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
