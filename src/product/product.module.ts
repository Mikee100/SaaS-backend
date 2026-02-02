import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductAttributeController } from './product-attribute.controller';
import { ProductService } from './product.service';
import { ProductAttributeService } from './product-attribute.service';
import { PrismaModule } from '../prisma.module';
import { CacheModule } from '../cache/cache.module';
import { AuditLogService } from '../audit-log.service';
import { BillingModule } from '../billing/billing.module';
import { UserModule } from '../user/user.module';
import { TrialGuard } from '../auth/trial.guard';

@Module({
  imports: [PrismaModule, CacheModule, BillingModule, UserModule],
  controllers: [ProductController, ProductAttributeController],
  providers: [
    ProductService,
    ProductAttributeService,
    AuditLogService,
    TrialGuard,
  ],
  exports: [ProductService, ProductAttributeService],
})
export class ProductModule {}
