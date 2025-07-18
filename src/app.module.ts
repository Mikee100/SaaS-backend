import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantModule } from './tenant/tenant.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './product/product.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './sales/sales.module';
import { MpesaModule } from './mpesa.module';
import { PermissionController } from './permission/permission.controller';
import { PrismaModule } from './prisma.module';


@Module({
  imports: [PrismaModule, TenantModule, UserModule, AuthModule, ProductModule, InventoryModule, SalesModule, MpesaModule],
  controllers: [AppController, PermissionController],
  providers: [AppService],
})
export class AppModule {}
