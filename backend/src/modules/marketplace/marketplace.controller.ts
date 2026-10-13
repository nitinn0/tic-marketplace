import { Controller, Get, Param, Query } from '@nestjs/common';

import { MarketplaceServicesQueryDto } from './dto/marketplace-query.dto.js';
import { MarketplaceCatalogService } from './marketplace-catalog.service.js';

/** Public directory. Browsing does not require an account. */
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
  service(@Param('slug') slug: string) {
    return this.catalog.serviceBySlug(slug);
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
