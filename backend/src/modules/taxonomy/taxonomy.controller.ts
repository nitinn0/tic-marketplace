import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MARKETPLACE_FUNCTIONALITIES as M } from '../rbac/constants/permission.constants.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';
import { CreateIndustryDto, UpdateIndustryDto } from './dto/industry.dto.js';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto.js';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto.js';
import { CreateStandardDto, UpdateStandardDto } from './dto/standard.dto.js';
import {
  CategoryListQueryDto,
  HierarchyListQueryDto,
  LocationListQueryDto,
  ServiceListQueryDto,
  TaxonomyListQueryDto,
} from './dto/taxonomy-query.dto.js';
import { IndustriesService } from './services/industries.service.js';
import { LocationsService } from './services/locations.service.js';
import { ServiceCategoriesService } from './services/service-categories.service.js';
import { StandardsService } from './services/standards.service.js';
import { TaxonomyServicesService } from './services/taxonomy-services.service.js';

/**
 * Taxonomy master data administration. Permissions come from the caller's global roles; DELETE
 * deactivates records that are still referenced instead of removing them.
 */
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('taxonomy/categories')
export class ServiceCategoriesController {
  constructor(private readonly categories: ServiceCategoriesService) {}

  @Get()
  @RequirePermission(M.categories, 'view')
  list(@Query() query: CategoryListQueryDto) {
    return this.categories.list(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(M.categories, 'create')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCategoryDto) {
    return this.categories.create(user.sub, dto);
  }

  @Get(':id')
  @RequirePermission(M.categories, 'view')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.get(id);
  }

  @Patch(':id')
  @RequirePermission(M.categories, 'edit')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(user.sub, id, dto);
  }

  @Delete(':id')
  @RequirePermission(M.categories, 'delete')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.categories.remove(user.sub, id);
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('taxonomy/services')
export class TaxonomyServicesController {
  constructor(private readonly services: TaxonomyServicesService) {}

  @Get()
  @RequirePermission(M.services, 'view')
  list(@Query() query: ServiceListQueryDto) {
    return this.services.list(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(M.services, 'create')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateServiceDto) {
    return this.services.create(user.sub, dto);
  }

  @Get(':id')
  @RequirePermission(M.services, 'view')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.services.get(id);
  }

  @Patch(':id')
  @RequirePermission(M.services, 'edit')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateServiceDto) {
    return this.services.update(user.sub, id, dto);
  }

  @Delete(':id')
  @RequirePermission(M.services, 'delete')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.services.remove(user.sub, id);
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('taxonomy/standards')
export class StandardsController {
  constructor(private readonly standards: StandardsService) {}

  @Get()
  @RequirePermission(M.standards, 'view')
  list(@Query() query: TaxonomyListQueryDto) {
    return this.standards.list(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(M.standards, 'create')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStandardDto) {
    return this.standards.create(user.sub, dto);
  }

  @Get(':id')
  @RequirePermission(M.standards, 'view')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.standards.get(id);
  }

  @Patch(':id')
  @RequirePermission(M.standards, 'edit')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStandardDto) {
    return this.standards.update(user.sub, id, dto);
  }

  @Delete(':id')
  @RequirePermission(M.standards, 'delete')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.standards.remove(user.sub, id);
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('taxonomy/industries')
export class IndustriesController {
  constructor(private readonly industries: IndustriesService) {}

  @Get()
  @RequirePermission(M.industries, 'view')
  list(@Query() query: HierarchyListQueryDto) {
    return this.industries.list(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(M.industries, 'create')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateIndustryDto) {
    return this.industries.create(user.sub, dto);
  }

  @Get(':id')
  @RequirePermission(M.industries, 'view')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.industries.get(id);
  }

  @Patch(':id')
  @RequirePermission(M.industries, 'edit')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateIndustryDto) {
    return this.industries.update(user.sub, id, dto);
  }

  @Delete(':id')
  @RequirePermission(M.industries, 'delete')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.industries.remove(user.sub, id);
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('taxonomy/locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get()
  @RequirePermission(M.locations, 'view')
  list(@Query() query: LocationListQueryDto) {
    return this.locations.list(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(M.locations, 'create')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLocationDto) {
    return this.locations.create(user.sub, dto);
  }

  @Get(':id')
  @RequirePermission(M.locations, 'view')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.locations.get(id);
  }

  @Patch(':id')
  @RequirePermission(M.locations, 'edit')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLocationDto) {
    return this.locations.update(user.sub, id, dto);
  }

  @Delete(':id')
  @RequirePermission(M.locations, 'delete')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.locations.remove(user.sub, id);
  }
}
