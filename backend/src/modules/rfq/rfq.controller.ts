import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RFQ_FUNCTIONALITIES as R } from '../rbac/constants/permission.constants.js';
import { CurrentOrganization, OrganizationScoped } from '../rbac/decorators/organization-scoped.decorator.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import type { OrganizationAccessContext } from '../rbac/services/organization-access.service.js';
import { RfqService } from './rfq.service.js';
import { CreateRfqDto, SubmitQuoteDto } from './dto/rfq.dto.js';

@UseGuards(JwtAuthGuard, PermissionGuard)
@OrganizationScoped({ organizationTypes: ['BUYER'] })
@Controller('rfqs')
export class BuyerRfqController {
  constructor(private readonly rfqs: RfqService) {}

  @Get()
  @RequirePermission(R.buyer, 'view')
  list(@CurrentOrganization() context: OrganizationAccessContext) {
    return this.rfqs.listForBuyer(context);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(R.buyer, 'create')
  create(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRfqDto,
  ) {
    return this.rfqs.create(context, user.sub, dto);
  }

  @Get(':id')
  @RequirePermission(R.buyer, 'view')
  get(@CurrentOrganization() context: OrganizationAccessContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfqs.getForBuyer(context, id);
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@OrganizationScoped({ organizationTypes: ['PROVIDER'] })
@Controller('provider/rfqs')
export class ProviderRfqController {
  constructor(private readonly rfqs: RfqService) {}

  @Get()
  @RequirePermission(R.provider, 'view')
  list(@CurrentOrganization() context: OrganizationAccessContext) {
    return this.rfqs.listForProvider(context);
  }

  @Get(':id')
  @RequirePermission(R.provider, 'view')
  get(@CurrentOrganization() context: OrganizationAccessContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfqs.getForProvider(context, id);
  }

  @Post(':id/quotes')
  @RequirePermission(R.provider, 'create')
  quote(
    @CurrentOrganization() context: OrganizationAccessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitQuoteDto,
  ) {
    return this.rfqs.submitQuote(context, user.sub, id, dto);
  }
}
