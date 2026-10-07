import { ServiceCategoryType } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, MaxLength, Min } from 'class-validator';

import { OptionalNotNull, Squish, Trim, TrimLower, TrimUpper } from '../../../common/dto/transforms.js';
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from '../utils/slug.util.js';

export const SLUG_MESSAGE = 'slug may only contain lowercase letters, digits and single hyphens';

export class CreateCategoryDto {
  @Squish()
  @IsString()
  @Length(2, 120)
  name: string;

  /** Derived from the name when omitted. */
  @OptionalNotNull()
  @TrimLower()
  @MaxLength(SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  /** Required for top-level categories; child categories inherit their parent's type. */
  @OptionalNotNull()
  @TrimUpper()
  @IsEnum(ServiceCategoryType)
  categoryType?: ServiceCategoryType;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @OptionalNotNull()
  @IsBoolean()
  active?: boolean;

  @OptionalNotNull()
  @IsInt()
  @Min(0)
  @Max(100_000)
  sortOrder?: number;
}

/** `parentId: null` moves the category to the top level. */
export class UpdateCategoryDto {
  @OptionalNotNull()
  @Squish()
  @IsString()
  @Length(2, 120)
  name?: string;

  @OptionalNotNull()
  @TrimLower()
  @MaxLength(SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @OptionalNotNull()
  @TrimUpper()
  @IsEnum(ServiceCategoryType)
  categoryType?: ServiceCategoryType;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @OptionalNotNull()
  @IsBoolean()
  active?: boolean;

  @OptionalNotNull()
  @IsInt()
  @Min(0)
  @Max(100_000)
  sortOrder?: number;
}
