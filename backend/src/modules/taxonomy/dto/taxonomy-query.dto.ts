import { ServiceCategoryType } from '@prisma/client';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

import { ToOptionalBoolean, Trim, TrimUpper } from '../../../common/dto/transforms.js';

export class TaxonomyListQueryDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @ToOptionalBoolean()
  @IsBoolean()
  active?: boolean;
}

export class HierarchyListQueryDto extends TaxonomyListQueryDto {
  /** `flat` (default): depth-first ordered list with depth and path. `tree`: nested children. */
  @IsOptional()
  @IsIn(['flat', 'tree'])
  format?: 'flat' | 'tree';

  /** Direct children of this node (flat format only). */
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class CategoryListQueryDto extends HierarchyListQueryDto {
  @IsOptional()
  @TrimUpper()
  @IsEnum(ServiceCategoryType)
  categoryType?: ServiceCategoryType;
}

export class ServiceListQueryDto extends TaxonomyListQueryDto {
  /** Services in this category or any of its descendants. */
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class LocationListQueryDto extends TaxonomyListQueryDto {
  @IsOptional()
  @TrimUpper()
  @Matches(/^[A-Z]{2}$/, { message: 'countryCode must be an ISO 3166-1 alpha-2 code' })
  countryCode?: string;
}
