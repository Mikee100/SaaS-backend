import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
<<<<<<< HEAD
import { BillingModule } from '../billing/billing.module';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [BillingModule, PrismaModule],
=======
import { AnalyticsService } from './analytics.service';
import { PrismaModule } from '../prisma.module'; // <-- Add this import

@Module({
  imports: [PrismaModule], // <-- Add PrismaModule here
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService]
})
export class AnalyticsModule {}