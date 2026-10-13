import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { MarketplaceCatalogService } from './marketplace-catalog.service.js';
import { MarketplaceController } from './marketplace.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceCatalogService],
  exports: [MarketplaceCatalogService],
})
export class MarketplaceModule {}
