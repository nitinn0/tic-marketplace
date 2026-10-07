import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { TaxonomyModule } from '../taxonomy/taxonomy.module.js';
import { ProviderController } from './provider.controller.js';
import { ProviderCapabilitiesService } from './services/provider-capabilities.service.js';
import { ProviderProfilesService } from './services/provider-profiles.service.js';

@Module({
  imports: [DatabaseModule, RbacModule, TaxonomyModule],
  controllers: [ProviderController],
  providers: [ProviderProfilesService, ProviderCapabilitiesService],
  exports: [ProviderProfilesService],
})
export class ProvidersModule {}
