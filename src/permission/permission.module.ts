import { Module } from '@nestjs/common';
import { PermissionController } from './permission.controller';
import { RoleController } from './role.controller';
import { PermissionService } from './permission.service';
import { PrismaService } from '../prisma.service';
import { UserModule } from '../user/user.module';
import { TrialGuard } from '../auth/trial.guard';
import { SubscriptionService } from '../billing/subscription.service';
import { BillingService } from '../billing/billing.service';

@Module({
  controllers: [PermissionController, RoleController],
  providers: [PermissionService, PrismaService, TrialGuard, SubscriptionService, BillingService],
  imports: [UserModule],
})
export class PermissionModule {}

