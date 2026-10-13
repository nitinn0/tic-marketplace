import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

import { Squish, Trim } from '../../../common/dto/transforms.js';

export class CreateRfqDto {
  @IsUUID()
  serviceId: string;

  @Squish()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title: string;

  @Trim()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string;

  @Squish()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  location: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  siteCount: number;

  @IsInt()
  @Min(1)
  @Max(1000000)
  employeeCount: number;

  @IsOptional()
  @Squish()
  @IsString()
  @MaxLength(160)
  timeline?: string;
}

export class SubmitQuoteDto {
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  amount: number;

  @IsOptional()
  @Squish()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @Trim()
  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  scopeNotes: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  exclusions?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  timelineDays?: number;
}
