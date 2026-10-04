import { Module } from '@nestjs/common';

import { RbacController } from './rbac.controller.js';
import { RbacService } from './rbac.service.js';
import { DatabaseModule } from '../../database/database.module.js';
import { PermissionGuard } from './guards/permission.guard.js';
import { OrganizationAccessService } from './services/organization-access.service.js';
import { PermissionResolverService } from './services/permission-resolver.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [RbacController],
  providers: [RbacService, PermissionResolverService, OrganizationAccessService, PermissionGuard],
  exports: [RbacService, PermissionResolverService, OrganizationAccessService, PermissionGuard],
})
export class RbacModule {}
