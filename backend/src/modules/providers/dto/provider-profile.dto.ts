import { ProviderType } from '@prisma/client';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { OptionalNotNull, Squish, Trim, TrimUpperEach } from '../../../common/dto/transforms.js';

/**
 * Verification fields (verification_status, verified_at) are deliberately absent: unknown
 * properties are rejected by the global ValidationPipe, so a provider cannot self-verify.
 */
export class CreateProviderProfileDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @TrimUpperEach()
  @IsEnum(ProviderType, { each: true })
  providerTypes: ProviderType[];

  @IsOptional()
  @Squish()
  @IsString()
  @MaxLength(160)
  headline?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  yearsInBusiness?: number | null;

  @OptionalNotNull()
  @IsBoolean()
  publicProfile?: boolean;
}

export class UpdateProviderProfileDto {
  @OptionalNotNull()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @TrimUpperEach()
  @IsEnum(ProviderType, { each: true })
  providerTypes?: ProviderType[];

  @IsOptional()
  @Squish()
  @IsString()
  @MaxLength(160)
  headline?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  yearsInBusiness?: number | null;

  @OptionalNotNull()
  @IsBoolean()
  publicProfile?: boolean;
}
