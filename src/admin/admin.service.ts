import { Injectable } from '@nestjs/common';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class AdminService {
  constructor(private readonly billingService: BillingService) {}

  async getBillingMetrics() {
    // Implement logic to aggregate billing metrics from BillingService
    // For now, return dummy data or call billingService methods
    return {
      mrr: 10000,
      activeSubscriptions: 50,
      trialSubscriptions: 5,
      delinquentRate: 2,
    };
  }

  async getAllSubscriptions() {
    // Delegate to billingService to get all tenant subscriptions
    return this.billingService.getAllTenantSubscriptions();
  }
}
