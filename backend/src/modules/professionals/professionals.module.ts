import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { ProfessionalController } from './professional.controller.js';
import { ProfessionalProfilesService } from './services/professional-profiles.service.js';

@Module({
  imports: [DatabaseModule, RbacModule],
  controllers: [ProfessionalController],
  providers: [ProfessionalProfilesService],
  exports: [ProfessionalProfilesService],
})
export class ProfessionalsModule {}
