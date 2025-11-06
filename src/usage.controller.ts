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
    const isSuperadmin = req.user.isSuperadmin;
    let tenantId = req.user.tenantId;
    let branchId = req.headers['x-branch-id'] || req.user.branchId;

    // For superadmin, skip tenant/branch filtering
    const where: any = {};
    if (!isSuperadmin) {
      where.tenantId = tenantId;
      if (branchId) where.branchId = branchId;
    }

    const productsCount = await this.prisma.product.count({
      where: isSuperadmin ? {} : where,
    });

    return {
      products: { current: productsCount, limit: 10 },
    };
  }

  @Get('trial')
  @UseGuards(AuthGuard('jwt'))
  async getTrialUsage(@Req() req: any) {
    const isSuperadmin = req.user.isSuperadmin;
    const tenantId = req.query.tenantId || req.user.tenantId;
    if (isSuperadmin) {
      // Optionally return all tenants' trial usage or a message
      return { message: 'Superadmin does not have trial usage limits.' };
    }
    return await this.subscriptionService.getTrialUsage(tenantId);
  }
}
