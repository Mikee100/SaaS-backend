import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SuperadminGuard } from './superadmin.guard';

@Controller('admin')
@UseGuards(SuperadminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('billing/metrics')
  async getBillingMetrics() {
    return this.adminService.getBillingMetrics();
  }

  @Get('billing/subscriptions')
  async getAllSubscriptions() {
    return this.adminService.getAllSubscriptions();
  }
}
