import { Module } from '@nestjs/common';
import { SectionLogoController } from './section-logo.controller';
import { SectionLogoService } from './section-logo.service';
import { LogoService } from './logo.service';
import { TrialGuard } from '../auth/trial.guard';
import { SubscriptionService } from '../billing/subscription.service';
import { BillingService } from '../billing/billing.service';

@Module({
  controllers: [SectionLogoController],
  providers: [
    SectionLogoService,
    LogoService,
    TrialGuard,
    SubscriptionService,
    BillingService,
  ],
  exports: [SectionLogoService],
})
export class SectionLogoModule {}
