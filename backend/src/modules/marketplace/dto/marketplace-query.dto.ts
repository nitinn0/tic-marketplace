import { IsOptional, IsString, MaxLength } from 'class-validator';

import { Trim } from '../../../common/dto/transforms.js';

export class MarketplaceServicesQueryDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(80)
  category?: string;
}
