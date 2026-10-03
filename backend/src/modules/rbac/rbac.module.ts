import { Module } from '@nestjs/common';

import { RbacController } from './rbac.controller.js';
import { RbacService } from './rbac.service.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [RbacController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
