import { ProviderType } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { OptionalNotNull, Squish, Trim, TrimUpper } from '../../../common/dto/transforms.js';

/**
 * Verification fields (verification_status, verified_at) are deliberately absent: unknown
 * properties are rejected by the global ValidationPipe, so a provider cannot self-verify.
 */
export class CreateProviderProfileDto {
  @TrimUpper()
  @IsEnum(ProviderType)
  providerType: ProviderType;

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
  @TrimUpper()
  @IsEnum(ProviderType)
  providerType?: ProviderType;

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
