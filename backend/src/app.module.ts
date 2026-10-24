import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { appConfig } from './config/app.config.js';
import { supabaseConfig } from './config/supabase.config.js';
import { DatabaseModule } from './database/database.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SupabaseModule } from './common/supabase/supabase.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { RbacModule } from './modules/rbac/rbac.module.js';
import { AuditModule } from './common/audit/audit.module.js';
import { MailModule } from './common/mail/mail.module.js';
import { OrganizationsModule } from './modules/organizations/organizations.module.js';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module.js';
import { ProvidersModule } from './modules/providers/providers.module.js';
import { ProfessionalsModule } from './modules/professionals/professionals.module.js';
import { MarketplaceModule } from './modules/marketplace/marketplace.module.js';
import { RfqModule } from './modules/rfq/rfq.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { AdminProvidersModule } from './modules/admin-providers/admin-providers.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      load: [appConfig, supabaseConfig],
    }),
    DatabaseModule,
    SupabaseModule,
    AuditModule,
    MailModule,
    AuthModule,
    UsersModule,
    RbacModule,
    OrganizationsModule,
    TaxonomyModule,
    ProvidersModule,
    ProfessionalsModule,
    MarketplaceModule,
    RfqModule,
    NotificationsModule,
    AdminProvidersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
