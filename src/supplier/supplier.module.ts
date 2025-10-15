import { Module } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { PrismaModule } from '../prisma.module';
import { AuditLogService } from '../audit-log.service';
import { UserModule } from '../user/user.module';
import { TrialGuard } from '../auth/trial.guard';
import { SubscriptionService } from '../billing/subscription.service';
import { BillingService } from '../billing/billing.service';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [SupplierController],
  providers: [SupplierService, AuditLogService, TrialGuard, SubscriptionService, BillingService],
  exports: [SupplierService],
})
export class SupplierModule {}
