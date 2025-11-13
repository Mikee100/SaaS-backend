import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { BulkUploadRecordController } from './bulk-upload-record.controller';
import { ProductService } from './product.service';
import { BulkUploadRecordService } from './bulk-upload-record.service';
import { PrismaModule } from '../prisma.module';
import { CacheModule } from '../cache/cache.module';
import { AuditLogService } from '../audit-log.service';
import { BillingModule } from '../billing/billing.module';
import { UserModule } from '../user/user.module';
import { TrialGuard } from '../auth/trial.guard';


@Module({
  imports: [PrismaModule, CacheModule, BillingModule, UserModule],
  controllers: [ProductController, BulkUploadRecordController],
  providers: [
    ProductService,
    BulkUploadRecordService,
    AuditLogService,
    TrialGuard,
  ],
  exports: [ProductService, BulkUploadRecordService],
})
export class ProductModule {}
