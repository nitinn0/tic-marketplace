import { Controller, Get, Param, ParseUUIDPipe, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import { OptionalUser } from '../../common/decorators/optional-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';
import { MarketplaceServicesQueryDto } from './dto/marketplace-query.dto.js';
import { MarketplaceCatalogService } from './marketplace-catalog.service.js';

/** Public directory. Browsing does not require an account; documents require sign-in. */
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly catalog: MarketplaceCatalogService) {}

  @Get('home')
  home() {
    return this.catalog.home();
  }

  @Get('services')
  services(@Query() query: MarketplaceServicesQueryDto) {
    return this.catalog.listServices(query);
  }

  @Get('services/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  service(@Param('slug') slug: string, @OptionalUser() user: AuthenticatedUser | null) {
    return this.catalog.serviceBySlug(slug, Boolean(user));
  }

  @Get('documents/:documentId')
  @UseGuards(JwtAuthGuard)
  async document(@Param('documentId', ParseUUIDPipe) documentId: string, @Res({ passthrough: true }) res: Response) {
    const { file, originalName, mimeType } = await this.catalog.openDocument(documentId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${originalName.replace(/"/g, '')}"`);
    return file;
  }

  @Get('providers')
  providers() {
    return this.catalog.listProviders();
  }

  @Get('providers/:id')
  provider(@Param('id') id: string) {
    return this.catalog.providerById(id);
  }
}
