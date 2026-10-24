import { Module } from '@nestjs/common';

import { AuditModule } from '../../common/audit/audit.module.js';
import { DatabaseModule } from '../../database/database.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { BuyerRfqController, ProviderRfqController } from './rfq.controller.js';
import { RfqService } from './rfq.service.js';

@Module({
  imports: [DatabaseModule, RbacModule, AuditModule, NotificationsModule],
  controllers: [BuyerRfqController, ProviderRfqController],
  providers: [RfqService],
})
export class RfqModule {}
