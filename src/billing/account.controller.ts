import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { AuthGuard } from '@nestjs/passport';
import { TrialGuard } from '../auth/trial.guard';
import { RequireModules } from '../auth/module-access.decorator';
import { AuthenticatedRequest } from '../auth/request.types';

@UseGuards(AuthGuard('jwt'), TrialGuard)
@RequireModules('billing')
@Controller('account')
export class AccountController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('invoices')
  async getInvoices(@Req() req: AuthenticatedRequest) {
    if (!req.user?.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return await this.subscriptionService.getInvoices(req.user.tenantId);
  }
}
