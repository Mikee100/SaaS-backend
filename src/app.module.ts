import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantModule } from './tenant/tenant.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './product/product.module';
import { InventoryModule } from './inventory/inventory.module';


@Module({
  imports: [TenantModule, UserModule, AuthModule, ProductModule, InventoryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
