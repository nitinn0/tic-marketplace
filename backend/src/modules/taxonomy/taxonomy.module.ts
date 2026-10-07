import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { IndustriesService } from './services/industries.service.js';
import { LocationsService } from './services/locations.service.js';
import { ServiceCategoriesService } from './services/service-categories.service.js';
import { StandardsService } from './services/standards.service.js';
import { TaxonomyLookupService } from './services/taxonomy-lookup.service.js';
import { TaxonomyServicesService } from './services/taxonomy-services.service.js';
import {
  IndustriesController,
  LocationsController,
  ServiceCategoriesController,
  StandardsController,
  TaxonomyServicesController,
} from './taxonomy.controller.js';

@Module({
  imports: [DatabaseModule, RbacModule],
  controllers: [
    ServiceCategoriesController,
    TaxonomyServicesController,
    StandardsController,
    IndustriesController,
    LocationsController,
  ],
  providers: [
    ServiceCategoriesService,
    TaxonomyServicesService,
    StandardsService,
    IndustriesService,
    LocationsService,
    TaxonomyLookupService,
  ],
  exports: [TaxonomyLookupService],
})
export class TaxonomyModule {}
