import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

import { OptionalNotNull, Squish, Trim } from '../../../common/dto/transforms.js';

/** Codes are stored upper-case with single spaces ("iso  9001" -> "ISO 9001"). */
const NormalizeCode = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toUpperCase() : value));

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9 ./:&()-]*$/;
const CODE_MESSAGE = 'code may contain letters, digits, spaces and . / : & ( ) -';

export class CreateStandardDto {
  @NormalizeCode()
  @IsString()
  @Length(2, 60)
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code: string;

  @Squish()
  @IsString()
  @Length(2, 200)
  name: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(30)
  version?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @OptionalNotNull()
  @IsBoolean()
  active?: boolean;
}

export class UpdateStandardDto {
  @OptionalNotNull()
  @NormalizeCode()
  @IsString()
  @Length(2, 60)
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code?: string;

  @OptionalNotNull()
  @Squish()
  @IsString()
  @Length(2, 200)
  name?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(30)
  version?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @OptionalNotNull()
  @IsBoolean()
  active?: boolean;
}
