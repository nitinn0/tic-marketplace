import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import {
  InvitationAcceptanceController,
  OrganizationInvitationsController,
} from './organization-invitations.controller.js';
import { OrganizationMembersController } from './organization-members.controller.js';
import { OrganizationsController } from './organizations.controller.js';
import { OrganizationInvitationsService } from './services/organization-invitations.service.js';
import { OrganizationMembersService } from './services/organization-members.service.js';
import { OrganizationRolesService } from './services/organization-roles.service.js';
import { OrganizationsService } from './services/organizations.service.js';

@Module({
  imports: [DatabaseModule, RbacModule],
  controllers: [
    OrganizationsController,
    OrganizationMembersController,
    OrganizationInvitationsController,
    InvitationAcceptanceController,
  ],
  providers: [
    OrganizationsService,
    OrganizationMembersService,
    OrganizationRolesService,
    OrganizationInvitationsService,
  ],
  exports: [OrganizationsService, OrganizationRolesService],
})
export class OrganizationsModule {}
