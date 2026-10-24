import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ORGANIZATION_FUNCTIONALITIES as O } from '../rbac/constants/permission.constants.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import { AdminProvidersService } from './admin-providers.service.js';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('admin/providers')
export class AdminProvidersController {
  constructor(private readonly providers: AdminProvidersService) {}

  @Get()
  @RequirePermission(O.platformAccess, 'view')
  list(@Query('verificationStatus') verificationStatus?: string) {
    return this.providers.list(verificationStatus);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(O.platformAccess, 'view')
  verify(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.providers.verify(user.sub, id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(O.platformAccess, 'view')
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.providers.reject(user.sub, id);
  }
}
