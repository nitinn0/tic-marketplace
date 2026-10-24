import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { AdminProvidersController } from './admin-providers.controller.js';
import { AdminProvidersService } from './admin-providers.service.js';

@Module({
  imports: [DatabaseModule, RbacModule, NotificationsModule],
  controllers: [AdminProvidersController],
  providers: [AdminProvidersService],
})
export class AdminProvidersModule {}
