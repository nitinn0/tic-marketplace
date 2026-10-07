import { IsBoolean, IsNumber, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

import { OptionalNotNull, Squish, TrimUpper } from '../../../common/dto/transforms.js';

const POSTAL_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 -]{1,19}$/;
const POSTAL_CODE_MESSAGE = 'postalCode must be 2-20 letters, digits, spaces or hyphens';
const COUNTRY_CODE_MESSAGE = 'countryCode must be an ISO 3166-1 alpha-2 code';

/** Leave `state` empty for country-wide coverage and `city` empty for state-wide coverage. */
export class CreateLocationDto {
  @TrimUpper()
  @Matches(/^[A-Z]{2}$/, { message: COUNTRY_CODE_MESSAGE })
  countryCode: string;

  @IsOptional()
  @Squish()
  @IsString()
  @Length(1, 100)
  state?: string | null;

  @IsOptional()
  @Squish()
  @IsString()
  @Length(1, 100)
  city?: string | null;

  @IsOptional()
  @Squish()
  @Matches(POSTAL_CODE_PATTERN, { message: POSTAL_CODE_MESSAGE })
  postalCode?: string | null;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @OptionalNotNull()
  @IsBoolean()
  active?: boolean;
}

export class UpdateLocationDto {
  @OptionalNotNull()
  @TrimUpper()
  @Matches(/^[A-Z]{2}$/, { message: COUNTRY_CODE_MESSAGE })
  countryCode?: string;

  @IsOptional()
  @Squish()
  @IsString()
  @Length(1, 100)
  state?: string | null;

  @IsOptional()
  @Squish()
  @IsString()
  @Length(1, 100)
  city?: string | null;

  @IsOptional()
  @Squish()
  @Matches(POSTAL_CODE_PATTERN, { message: POSTAL_CODE_MESSAGE })
  postalCode?: string | null;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @OptionalNotNull()
  @IsBoolean()
  active?: boolean;
}
