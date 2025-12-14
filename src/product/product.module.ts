import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductAttributeController } from './product-attribute.controller';
import { BulkUploadRecordController } from './bulk-upload-record.controller';
import { ProductService } from './product.service';
import { ProductAttributeService } from './product-attribute.service';
import { BulkUploadRecordService } from './bulk-upload-record.service';
import { PrismaModule } from '../prisma.module';
import { CacheModule } from '../cache/cache.module';
import { AuditLogService } from '../audit-log.service';
import { BillingModule } from '../billing/billing.module';
import { UserModule } from '../user/user.module';
import { TrialGuard } from '../auth/trial.guard';


@Module({
  imports: [PrismaModule, CacheModule, BillingModule, UserModule],
  controllers: [
    ProductController,
    ProductAttributeController,
    BulkUploadRecordController,
  ],
  providers: [
    ProductService,
    ProductAttributeService,
    BulkUploadRecordService,
    AuditLogService,
    TrialGuard,
  ],
  exports: [
    ProductService,
    ProductAttributeService,
    BulkUploadRecordService,
  ],
})
export class ProductModule {}
