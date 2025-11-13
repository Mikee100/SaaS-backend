import { Module } from '@nestjs/common';
import { SalesTargetController } from './sales-target.controller';
import { SalesTargetService } from './sales-target.service';
import { PrismaModule } from '../prisma.module';
import { UserModule } from '../user/user.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, UserModule, BillingModule],
  controllers: [SalesTargetController],
  providers: [SalesTargetService],
  exports: [SalesTargetService],
})
export class SalesTargetModule {}
