import { CoverageType } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsEnum, IsOptional, IsUUID, ValidateNested } from 'class-validator';

import { TrimUpper } from '../../../common/dto/transforms.js';

const MAX_ITEMS = 200;
const DUPLICATES = 'must not contain duplicate entries';

export class ReplaceProviderServicesDto {
  @IsArray()
  @ArrayMaxSize(MAX_ITEMS)
  @ArrayUnique({ message: `serviceIds ${DUPLICATES}` })
  @IsUUID('all', { each: true })
  serviceIds: string[];
}

export class ReplaceProviderStandardsDto {
  @IsArray()
  @ArrayMaxSize(MAX_ITEMS)
  @ArrayUnique({ message: `standardIds ${DUPLICATES}` })
  @IsUUID('all', { each: true })
  standardIds: string[];
}

export class ReplaceProviderIndustriesDto {
  @IsArray()
  @ArrayMaxSize(MAX_ITEMS)
  @ArrayUnique({ message: `industryIds ${DUPLICATES}` })
  @IsUUID('all', { each: true })
  industryIds: string[];
}

export class ProviderLocationInputDto {
  @IsUUID()
  locationId: string;

  @IsOptional()
  @TrimUpper()
  @IsEnum(CoverageType)
  coverageType?: CoverageType | null;
}

export class ReplaceProviderLocationsDto {
  @IsArray()
  @ArrayMaxSize(MAX_ITEMS)
  @ArrayUnique((entry: ProviderLocationInputDto) => entry?.locationId, { message: `locations ${DUPLICATES}` })
  @ValidateNested({ each: true })
  @Type(() => ProviderLocationInputDto)
  locations: ProviderLocationInputDto[];
}

export class AddProviderServiceDto {
  @IsUUID()
  serviceId: string;
}

export class AddProviderStandardDto {
  @IsUUID()
  standardId: string;
}

export class AddProviderIndustryDto {
  @IsUUID()
  industryId: string;
}
