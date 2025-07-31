import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { BillingLoggerService } from './billing-logger.service';
import { TenantConfigurationService } from '../config/tenant-configuration.service';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [BillingController],
  providers: [
    BillingService, 
    StripeService, 
    BillingLoggerService,
    TenantConfigurationService,
    PrismaService, 
    AuditLogService
  ],
  exports: [BillingService, StripeService, BillingLoggerService],
})
export class BillingModule {} 