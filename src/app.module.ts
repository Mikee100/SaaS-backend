import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma.module';
import { ConfigModule } from '@nestjs/config';
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
import { AdminModule } from './admin/admin.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ModuleAccessGuard } from './auth/module-access.guard';
import { AuditLogModule } from './audit-log/audit-log.module';
import { SupplierModule } from './supplier/supplier.module';
import { AiModule } from './ai/ai.module';
import { ExpensesModule } from './expenses/expenses.module';
import { SalaryModule } from './salary/salary.module';
import { HrModule } from './hr/hr.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { BackupModule } from './backup/backup.module';
import { SalesTargetModule } from './sales-target/sales-target.module';
import { ClassificationModule } from './classification/classification.module';
import { LedgerModule } from './ledger/ledger.module';
import { ImpersonationInterceptor } from './admin/impersonation.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RawBodyMiddleware } from './middleware/raw-body.middleware';
import { RestaurantModule } from './restaurant/restaurant.module';
import { CrmModule } from './crm/crm.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 50, // Increased to 50 requests per second for UI responsiveness
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 500, // Increased to 500 requests per minute for UI
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 5000, // Increased to 5000 requests per hour
      },
    ]),

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
    AdminModule,
    AuditLogModule,
    SupplierModule,
    AiModule,
    ExpensesModule,
    SalaryModule,
    HrModule,
    MonitoringModule,
    BackupModule,
    SalesTargetModule,
    ClassificationModule,
    LedgerModule,
    RestaurantModule,
    CrmModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ModuleAccessGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ImpersonationInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RawBodyMiddleware)
      .forRoutes({ path: 'billing/webhook', method: RequestMethod.POST });
  }
}
