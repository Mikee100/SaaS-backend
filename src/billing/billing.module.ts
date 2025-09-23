import { Module, forwardRef } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { PaymentController } from './payment.controller';
import { SubscriptionController } from './subscription.controller';
import { BillingService } from './billing.service';
import { PaymentService } from './payment.service';
import { StripeService } from './stripe.service';
import { SubscriptionService } from './subscription.service';
import { BillingLoggerService } from './billing-logger.service';
import { TenantConfigurationService } from '../config/tenant-configuration.service';
import { AuditLogService } from '../audit-log.service';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../prisma.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    forwardRef(() => UserModule), 
    PrismaModule,
    ConfigModule, // Add ConfigModule to provide CONFIG_OPTIONS
  ],
  controllers: [BillingController, PaymentController, SubscriptionController],
  providers: [
    BillingService, 
    PaymentService,
    StripeService, 
    SubscriptionService,
    BillingLoggerService,
    TenantConfigurationService,
    AuditLogService,
  ],
  exports: [
    BillingService, 
    PaymentService, 
    StripeService, 
    SubscriptionService, 
    BillingLoggerService
  ],
})
export class BillingModule {}