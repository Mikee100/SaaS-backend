import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from './prisma.service';
import { TrialGuard } from './auth/trial.guard';
import { SubscriptionService } from './billing/subscription.service';

@Controller('usage')
export class UsageController {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getStats(@Req() req: any) {
    const tenantId = req.user.tenantId;
    const branchId = req.headers['x-branch-id'] || req.user.branchId;
    // Count products for this tenant and branch
    const productsCount = await this.prisma.product.count({
      where: { tenantId, branchId: branchId || undefined },
    });
    // You can add more usage stats here (users, sales, etc.)
    return {
      products: { current: productsCount, limit: 10 }, // Example limit, replace with real plan limit
    };
  }

  @Get('trial')
  @UseGuards(AuthGuard('jwt'))
  async getTrialUsage(@Req() req: any) {
    const tenantId = req.query.tenantId || req.user.tenantId;
    return await this.subscriptionService.getTrialUsage(tenantId);
  }
}
