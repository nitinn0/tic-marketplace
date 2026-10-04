import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ORGANIZATION_FUNCTIONALITIES as F } from '../rbac/constants/permission.constants.js';
import { CurrentOrganization, OrganizationScoped } from '../rbac/decorators/organization-scoped.decorator.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import type { OrganizationAccessContext } from '../rbac/services/organization-access.service.js';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { ListOrganizationsQueryDto } from './dto/list-organizations-query.dto.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { OrganizationMembersService } from './services/organization-members.service.js';
import { OrganizationRolesService } from './services/organization-roles.service.js';
import { OrganizationsService } from './services/organizations.service.js';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly members: OrganizationMembersService,
    private readonly roles: OrganizationRolesService,
  ) {}

  /** Any active authenticated user may create an organization and becomes its owner. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrganizationDto) {
    return this.organizations.create(user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListOrganizationsQueryDto) {
    return this.organizations.listForUser(user.sub, query);
  }

  /** Effective context for the organization named in the X-Organization-Id header. */
  @Get('current')
  @OrganizationScoped({ param: undefined, requireMembership: true })
  current(@CurrentOrganization() context: OrganizationAccessContext) {
    return this.organizations.getContext(context);
  }

  @Get(':organizationId')
  @OrganizationScoped()
  @RequirePermission(F.profile, 'view')
  get(@CurrentOrganization() context: OrganizationAccessContext) {
    return this.organizations.getDetails(context);
  }

  @Patch(':organizationId')
  @OrganizationScoped()
  @RequirePermission(F.profile, 'edit')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentOrganization() context: OrganizationAccessContext,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizations.update(user.sub, context, dto);
  }

  @Post(':organizationId/switch')
  @HttpCode(HttpStatus.OK)
  @OrganizationScoped({ requireMembership: true })
  switch(@CurrentUser() user: AuthenticatedUser, @CurrentOrganization() context: OrganizationAccessContext) {
    return this.organizations.switchContext(user.sub, context);
  }

  /** The caller's own effective permissions inside the organization. */
  @Get(':organizationId/permissions')
  @OrganizationScoped()
  permissions(@CurrentOrganization() context: OrganizationAccessContext) {
    return this.organizations.getContext(context);
  }

  /** Roles compatible with the organization type, flagged with whether the caller may grant them. */
  @Get(':organizationId/roles')
  @OrganizationScoped()
  @RequirePermission(F.memberRoles, 'view')
  compatibleRoles(@CurrentOrganization() context: OrganizationAccessContext) {
    return this.roles.listCompatibleRoles(context);
  }

  @Post(':organizationId/leave')
  @HttpCode(HttpStatus.OK)
  @OrganizationScoped({ requireMembership: true })
  leave(@CurrentUser() user: AuthenticatedUser, @CurrentOrganization() context: OrganizationAccessContext) {
    return this.members.leave(user.sub, context);
  }
}
