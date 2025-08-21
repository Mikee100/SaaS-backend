import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { PaymentController } from './payment.controller';
import { SubscriptionController } from './subscription.controller';
import { BillingService } from './billing.service';
import { PaymentService } from './payment.service';
import { StripeService } from './stripe.service';
import { SubscriptionService } from './subscription.service';
import { BillingLoggerService } from './billing-logger.service';
import { TenantConfigurationService } from '../config/tenant-configuration.service';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [BillingController, PaymentController, SubscriptionController],
  providers: [
    BillingService, 
    PaymentService,
    StripeService, 
    SubscriptionService,
    BillingLoggerService,
    TenantConfigurationService,
    PrismaService, 
    AuditLogService
  ],
  exports: [BillingService, PaymentService, StripeService, SubscriptionService, BillingLoggerService],
})
export class BillingModule {} 