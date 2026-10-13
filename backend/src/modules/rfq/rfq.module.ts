import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { BuyerRfqController, ProviderRfqController } from './rfq.controller.js';
import { RfqService } from './rfq.service.js';

@Module({
  imports: [DatabaseModule, RbacModule],
  controllers: [BuyerRfqController, ProviderRfqController],
  providers: [RfqService],
})
export class RfqModule {}
