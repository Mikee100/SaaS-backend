import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { PrismaModule } from '../prisma.module';
import { AuditLogService } from '../audit-log.service';
import { BillingModule } from '../billing/billing.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, BillingModule, UserModule],
  controllers: [ProductController],
  providers: [ProductService, AuditLogService],
  exports: [ProductService],
})
export class ProductModule {}
