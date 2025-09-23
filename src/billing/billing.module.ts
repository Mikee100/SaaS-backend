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
<<<<<<< HEAD
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
=======
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
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
  controllers: [BillingController, PaymentController, SubscriptionController],
  providers: [
    BillingService, 
    PaymentService,
    StripeService, 
    SubscriptionService,
    BillingLoggerService,
    TenantConfigurationService,
<<<<<<< HEAD
    PrismaService, 
    AuditLogService
  ],
  exports: [BillingService, PaymentService, StripeService, SubscriptionService, BillingLoggerService],
=======
    AuditLogService,
  ],
  exports: [
    BillingService, 
    PaymentService, 
    StripeService, 
    SubscriptionService, 
    BillingLoggerService
  ],
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
})
export class BillingModule {}