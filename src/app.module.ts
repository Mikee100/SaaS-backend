import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProductModule } from './product/product.module';
import { SalesModule } from './sales/sales.module';
import { TenantModule } from './tenant/tenant.module';
import { InventoryModule } from './inventory/inventory.module';
import { MpesaModule } from './mpesa.module';
import { RealtimeModule } from './realtime.module';
import { PermissionModule } from './permission/permission.module';
import { BillingModule } from './billing/billing.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { RawBodyMiddleware } from './middleware/raw-body.middleware';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    ProductModule,
    SalesModule,
    TenantModule,
    InventoryModule,
    MpesaModule,
    RealtimeModule,
    PermissionModule,
    BillingModule,
    AnalyticsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RawBodyMiddleware)
      .forRoutes({ path: '/billing/webhook', method: RequestMethod.POST });
  }
}
