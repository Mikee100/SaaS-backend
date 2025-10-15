import {
  Controller,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { AuthGuard } from '@nestjs/passport';
import { TrialGuard } from '../auth/trial.guard';

@UseGuards(AuthGuard('jwt'), TrialGuard)
@Controller('account')
export class AccountController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('invoices')
  async getInvoices(@Req() req) {
    return await this.subscriptionService.getInvoices(req.user.tenantId);
  }
}
