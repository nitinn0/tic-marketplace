import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ORGANIZATION_FUNCTIONALITIES as F } from '../rbac/constants/permission.constants.js';
import { CurrentOrganization, OrganizationScoped } from '../rbac/decorators/organization-scoped.decorator.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import type { OrganizationAccessContext } from '../rbac/services/organization-access.service.js';
import { InvitationTokenDto } from './dto/member.dto.js';
import { OrganizationInvitationsService } from './services/organization-invitations.service.js';

@UseGuards(JwtAuthGuard, PermissionGuard)
@OrganizationScoped()
@Controller('organizations/:organizationId/invitations')
export class OrganizationInvitationsController {
  constructor(private readonly invitations: OrganizationInvitationsService) {}

  @Get()
  @RequirePermission(F.members, 'view')
  list(@CurrentOrganization() context: OrganizationAccessContext) {
    return this.invitations.listPending(context);
  }

  @Delete(':invitationId')
  @RequirePermission(F.members, 'create')
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentOrganization() context: OrganizationAccessContext,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ) {
    return this.invitations.cancel(user.sub, context, invitationId);
  }
}

/** Token-based endpoints used by the invitee. Tokens travel in the body to keep them out of URLs and logs. */
@Controller('organization-invitations')
export class InvitationAcceptanceController {
  constructor(private readonly invitations: OrganizationInvitationsService) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  preview(@Body() dto: InvitationTokenDto) {
    return this.invitations.preview(dto.token);
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  accept(@CurrentUser() user: AuthenticatedUser, @Body() dto: InvitationTokenDto) {
    return this.invitations.accept(user.sub, dto.token);
  }
}
