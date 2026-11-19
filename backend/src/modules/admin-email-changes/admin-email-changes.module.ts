import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { MailModule } from '../../common/mail/mail.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { AdminEmailChangesController } from './admin-email-changes.controller.js';
import { AdminEmailChangesService } from './admin-email-changes.service.js';

@Module({
  imports: [DatabaseModule, RbacModule, NotificationsModule, MailModule],
  controllers: [AdminEmailChangesController],
  providers: [AdminEmailChangesService],
})
export class AdminEmailChangesModule {}
