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
  Put,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PROVIDER_FUNCTIONALITIES as P } from '../rbac/constants/permission.constants.js';
import { CurrentOrganization, OrganizationScoped } from '../rbac/decorators/organization-scoped.decorator.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import type { OrganizationAccessContext } from '../rbac/services/organization-access.service.js';
import { TaxonomyLookupService } from '../taxonomy/services/taxonomy-lookup.service.js';
import {
  AddProviderIndustryDto,
  AddProviderServiceDto,
  AddProviderStandardDto,
  ProviderLocationInputDto,
  ReplaceProviderIndustriesDto,
  ReplaceProviderLocationsDto,
  ReplaceProviderServicesDto,
  ReplaceProviderStandardsDto,
} from './dto/provider-capabilities.dto.js';
import { CreateProviderProfileDto, UpdateProviderProfileDto } from './dto/provider-profile.dto.js';
import { ProviderCapabilitiesService } from './services/provider-capabilities.service.js';
import { ProviderProfilesService } from './services/provider-profiles.service.js';

/**
 * The provider profile of the active organization (X-Organization-Id). Only PROVIDER organizations
 * are accepted; every action is checked against the caller's organization roles.
 */
@UseGuards(JwtAuthGuard, PermissionGuard)
@OrganizationScoped({ organizationTypes: ['PROVIDER'] })
@Controller('provider')
export class ProviderController {
  constructor(
    private readonly profiles: ProviderProfilesService,
    private readonly capabilities: ProviderCapabilitiesService,
    private readonly lookup: TaxonomyLookupService,
  ) {}

  @Get('profile')
  @RequirePermission(P.profile, 'view')
  getProfile(@CurrentOrganization() context: OrganizationAccessContext) {
    return this.profiles.get(context);
  }

  @Post('profile')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(P.profile, 'create')
  createProfile(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProviderProfileDto,
  ) {
    return this.profiles.create(context, user.sub, dto);
  }

  @Patch('profile')
  @RequirePermission(P.profile, 'edit')
  updateProfile(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProviderProfileDto,
  ) {
    return this.profiles.update(context, user.sub, dto);
  }

  /** Active taxonomy a provider can pick from; providers never need taxonomy admin rights. */
  @Get('catalog')
  @RequirePermission(P.profile, 'view')
  catalog() {
    return this.lookup.providerCatalog();
  }

  @Get('profile/services')
  @RequirePermission(P.services, 'view')
  listServices(@CurrentOrganization() context: OrganizationAccessContext) {
    return this.capabilities.listForOrganization(context.organization.id, 'services');
  }

  @Put('profile/services')
  @RequirePermission(P.services, 'edit')
  replaceServices(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReplaceProviderServicesDto,
  ) {
    return this.capabilities.replace(context.organization.id, user.sub, 'services', dto.serviceIds.map((id) => ({ id })));
  }

  @Post('profile/services')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(P.services, 'create')
  addService(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddProviderServiceDto,
  ) {
    return this.capabilities.add(context.organization.id, user.sub, 'services', { id: dto.serviceId });
  }

  @Delete('profile/services/:serviceId')
  @RequirePermission(P.services, 'delete')
  removeService(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.capabilities.remove(context.organization.id, user.sub, 'services', serviceId);
  }

  @Get('profile/standards')
  @RequirePermission(P.standards, 'view')
  listStandards(@CurrentOrganization() context: OrganizationAccessContext) {
    return this.capabilities.listForOrganization(context.organization.id, 'standards');
  }

  @Put('profile/standards')
  @RequirePermission(P.standards, 'edit')
  replaceStandards(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReplaceProviderStandardsDto,
  ) {
    return this.capabilities.replace(context.organization.id, user.sub, 'standards', dto.standardIds.map((id) => ({ id })));
  }

  @Post('profile/standards')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(P.standards, 'create')
  addStandard(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddProviderStandardDto,
  ) {
    return this.capabilities.add(context.organization.id, user.sub, 'standards', { id: dto.standardId });
  }

  @Delete('profile/standards/:standardId')
  @RequirePermission(P.standards, 'delete')
  removeStandard(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('standardId', ParseUUIDPipe) standardId: string,
  ) {
    return this.capabilities.remove(context.organization.id, user.sub, 'standards', standardId);
  }

  @Get('profile/industries')
  @RequirePermission(P.industries, 'view')
  listIndustries(@CurrentOrganization() context: OrganizationAccessContext) {
    return this.capabilities.listForOrganization(context.organization.id, 'industries');
  }

  @Put('profile/industries')
  @RequirePermission(P.industries, 'edit')
  replaceIndustries(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReplaceProviderIndustriesDto,
  ) {
    return this.capabilities.replace(context.organization.id, user.sub, 'industries', dto.industryIds.map((id) => ({ id })));
  }

  @Post('profile/industries')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(P.industries, 'create')
  addIndustry(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddProviderIndustryDto,
  ) {
    return this.capabilities.add(context.organization.id, user.sub, 'industries', { id: dto.industryId });
  }

  @Delete('profile/industries/:industryId')
  @RequirePermission(P.industries, 'delete')
  removeIndustry(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('industryId', ParseUUIDPipe) industryId: string,
  ) {
    return this.capabilities.remove(context.organization.id, user.sub, 'industries', industryId);
  }

  @Get('profile/locations')
  @RequirePermission(P.locations, 'view')
  listLocations(@CurrentOrganization() context: OrganizationAccessContext) {
    return this.capabilities.listForOrganization(context.organization.id, 'locations');
  }

  @Put('profile/locations')
  @RequirePermission(P.locations, 'edit')
  replaceLocations(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReplaceProviderLocationsDto,
  ) {
    return this.capabilities.replace(
      context.organization.id,
      user.sub,
      'locations',
      dto.locations.map((entry) => ({ id: entry.locationId, coverageType: entry.coverageType ?? null })),
    );
  }

  @Post('profile/locations')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(P.locations, 'create')
  addLocation(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ProviderLocationInputDto,
  ) {
    return this.capabilities.add(context.organization.id, user.sub, 'locations', {
      id: dto.locationId,
      coverageType: dto.coverageType ?? null,
    });
  }

  @Delete('profile/locations/:locationId')
  @RequirePermission(P.locations, 'delete')
  removeLocation(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('locationId', ParseUUIDPipe) locationId: string,
  ) {
    return this.capabilities.remove(context.organization.id, user.sub, 'locations', locationId);
  }
}
