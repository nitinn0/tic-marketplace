import { IsISO8601, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

import { OptionalNotNull, Squish, Trim } from '../../../common/dto/transforms.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = (field: string) => `${field} must be a date in YYYY-MM-DD format`;

export class CreateExperienceDto {
  @Squish()
  @IsString()
  @Length(2, 200)
  organizationName: string;

  @Squish()
  @IsString()
  @Length(2, 160)
  jobTitle: string;

  @Matches(DATE_PATTERN, { message: DATE_MESSAGE('startDate') })
  @IsISO8601({ strict: true }, { message: DATE_MESSAGE('startDate') })
  startDate: string;

  /** Omit or null for a current position. */
  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE('endDate') })
  @IsISO8601({ strict: true }, { message: DATE_MESSAGE('endDate') })
  endDate?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}

export class UpdateExperienceDto {
  @OptionalNotNull()
  @Squish()
  @IsString()
  @Length(2, 200)
  organizationName?: string;

  @OptionalNotNull()
  @Squish()
  @IsString()
  @Length(2, 160)
  jobTitle?: string;

  @OptionalNotNull()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE('startDate') })
  @IsISO8601({ strict: true }, { message: DATE_MESSAGE('startDate') })
  startDate?: string;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE('endDate') })
  @IsISO8601({ strict: true }, { message: DATE_MESSAGE('endDate') })
  endDate?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
