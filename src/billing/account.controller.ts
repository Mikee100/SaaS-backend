import {
  Controller,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('account')
export class AccountController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('invoices')
  async getInvoices(@Req() req) {
    return await this.subscriptionService.getInvoices(req.user.tenantId);
  }
}
