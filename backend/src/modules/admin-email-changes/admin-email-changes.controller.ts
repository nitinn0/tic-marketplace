import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ORGANIZATION_FUNCTIONALITIES as O } from '../rbac/constants/permission.constants.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import { AdminEmailChangesService } from './admin-email-changes.service.js';

class RejectEmailChangeDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('admin/email-changes')
export class AdminEmailChangesController {
  constructor(private readonly emailChanges: AdminEmailChangesService) {}

  @Get()
  @RequirePermission(O.platformAccess, 'view')
  list(@Query('status') status?: string) {
    return this.emailChanges.list(status);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(O.platformAccess, 'view')
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.emailChanges.approve(user.sub, id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(O.platformAccess, 'view')
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectEmailChangeDto,
  ) {
    return this.emailChanges.reject(user.sub, id, dto.note);
  }
}
