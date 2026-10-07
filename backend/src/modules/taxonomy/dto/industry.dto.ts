import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, MaxLength, Min } from 'class-validator';

import { OptionalNotNull, Squish, Trim, TrimLower } from '../../../common/dto/transforms.js';
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from '../utils/slug.util.js';
import { SLUG_MESSAGE } from './category.dto.js';

export class CreateIndustryDto {
  @Squish()
  @IsString()
  @Length(2, 120)
  name: string;

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

/** `parentId: null` moves the industry to the top level. */
export class UpdateIndustryDto {
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
