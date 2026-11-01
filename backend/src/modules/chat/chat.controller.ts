import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentOrganization, OrganizationScoped } from '../rbac/decorators/organization-scoped.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import type { OrganizationAccessContext } from '../rbac/services/organization-access.service.js';
import { ChatService } from './chat.service.js';
import { ListMessagesQueryDto, SendMessageDto } from './dto/chat.dto.js';

@UseGuards(JwtAuthGuard, PermissionGuard)
@OrganizationScoped({ organizationTypes: ['BUYER', 'PROVIDER'] })
@Controller('conversations')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  list(@CurrentOrganization() context: OrganizationAccessContext, @CurrentUser() user: AuthenticatedUser) {
    return this.chat.list(context, user.sub);
  }

  @Get(':id')
  get(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chat.get(context, user.sub, id);
  }

  @Get(':id/messages')
  messages(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.chat.listMessages(context, user.sub, id, query);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  send(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.send(context, user.sub, id, dto.body);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chat.markRead(context, user.sub, id);
  }
}
