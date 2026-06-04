import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { AuthGuard } from '@nestjs/passport';
import { TrialGuard } from '../auth/trial.guard';
import { RequireModules } from '../auth/module-access.decorator';

@UseGuards(AuthGuard('jwt'), TrialGuard)
@RequireModules('billing')
@Controller('account')
export class AccountController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('invoices')
  async getInvoices(@Req() req) {
    return await this.subscriptionService.getInvoices(req.user.tenantId);
  }
}
