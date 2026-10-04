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
import { ORGANIZATION_FUNCTIONALITIES as F } from '../rbac/constants/permission.constants.js';
import { CurrentOrganization, OrganizationScoped } from '../rbac/decorators/organization-scoped.decorator.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import type { OrganizationAccessContext } from '../rbac/services/organization-access.service.js';
import { AssignRoleDto, InviteMemberDto, ListMembersQueryDto, UpdateMemberDto } from './dto/member.dto.js';
import { OrganizationInvitationsService } from './services/organization-invitations.service.js';
import { OrganizationMembersService } from './services/organization-members.service.js';

@UseGuards(JwtAuthGuard, PermissionGuard)
@OrganizationScoped()
@Controller('organizations/:organizationId/members')
export class OrganizationMembersController {
  constructor(
    private readonly members: OrganizationMembersService,
    private readonly invitations: OrganizationInvitationsService,
  ) {}

  @Get()
  @RequirePermission(F.members, 'view')
  list(@CurrentOrganization() context: OrganizationAccessContext, @Query() query: ListMembersQueryDto) {
    return this.members.list(context, query.includeRemoved ?? false);
  }

  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(F.members, 'create')
  invite(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentOrganization() context: OrganizationAccessContext,
    @Body() dto: InviteMemberDto,
  ) {
    return this.invitations.invite(user.sub, context, dto);
  }

  @Patch(':memberId')
  @RequirePermission(F.members, 'edit')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentOrganization() context: OrganizationAccessContext,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.members.updateStatus(user.sub, context, memberId, dto.membershipStatus);
  }

  @Delete(':memberId')
  @RequirePermission(F.members, 'delete')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentOrganization() context: OrganizationAccessContext,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.members.remove(user.sub, context, memberId);
  }

  @Post(':memberId/transfer-ownership')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(F.ownership, 'edit')
  transferOwnership(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentOrganization() context: OrganizationAccessContext,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.members.transferOwnership(user.sub, context, memberId);
  }

  @Get(':memberId/roles')
  @RequirePermission(F.memberRoles, 'view')
  roles(
    @CurrentOrganization() context: OrganizationAccessContext,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.members.listRoles(context, memberId);
  }

  @Post(':memberId/roles')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(F.memberRoles, 'create')
  assignRole(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentOrganization() context: OrganizationAccessContext,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.members.assignRole(user.sub, context, memberId, dto.roleId);
  }

  @Delete(':memberId/roles/:roleId')
  @RequirePermission(F.memberRoles, 'delete')
  removeRole(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentOrganization() context: OrganizationAccessContext,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.members.removeRole(user.sub, context, memberId, roleId);
  }
}
