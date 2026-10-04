import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

import { IsOptionalOrganizationType } from './organization-type.transform.js';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  code: string;

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
  isSystem?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
