import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProductModule } from './product/product.module';
import { SalesModule } from './sales/sales.module';
import { TenantModule } from './tenant/tenant.module';
import { TenantConfigurationModule } from './tenant/tenant-configuration.module';
import { InventoryModule } from './inventory/inventory.module';
import { MpesaModule } from './mpesa/mpesa.module';
import { RealtimeModule } from './realtime.module';
import { PermissionModule } from './permission/permission.module';
import { BillingModule } from './billing/billing.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BranchModule } from './branch/branch.module';
import { UsageModule } from './usage.module';
import { AdminTenantStatsModule } from './adminTenantStats/admin-tenant-stats.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot(),
    PrismaModule,
    UserModule,
    ProductModule,
    SalesModule,
    TenantModule,
    TenantConfigurationModule,
    InventoryModule,
    MpesaModule,
    RealtimeModule,
    PermissionModule,
    BillingModule,
    AnalyticsModule,
    BranchModule,
    UsageModule,
    AdminTenantStatsModule,
   
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
