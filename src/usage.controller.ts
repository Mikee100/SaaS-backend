import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from './prisma.service';
import { TrialGuard } from './auth/trial.guard';
import { SubscriptionService } from './billing/subscription.service';
import { AuthenticatedRequest } from './auth/request.types';

interface TrialUsageQuery {
  tenantId?: string;
}

@Controller('usage')
export class UsageController {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getStats(@Req() req: AuthenticatedRequest) {
    const isSuperadmin = req.user.isSuperadmin === true;
    const tenantId = req.user.tenantId;
    const rawBranchHeader = req.headers['x-branch-id'];
    const branchId =
      (typeof rawBranchHeader === 'string' ? rawBranchHeader : undefined) ||
      req.user.branchId;

    // For superadmin, skip tenant/branch filtering
    const where: { tenantId?: string; branchId?: string } = {};
    if (!isSuperadmin) {
      where.tenantId = tenantId;
      if (branchId) where.branchId = branchId;
    }

    const [activeVariationCount, nonVariationProductCount] = await Promise.all([
      this.prisma.productVariation.count({
        where: isSuperadmin
          ? { isActive: true, deletedAt: null }
          : { ...where, isActive: true, deletedAt: null },
      }),
      this.prisma.product.count({
        where: isSuperadmin
          ? {
              deletedAt: null,
              variations: { none: { isActive: true, deletedAt: null } },
            }
          : {
              ...where,
              deletedAt: null,
              variations: { none: { isActive: true, deletedAt: null } },
            },
      }),
    ]);

    const productsCount = activeVariationCount + nonVariationProductCount;

    return {
      products: { current: productsCount, limit: 10 },
    };
  }

  @Get('trial')
  @UseGuards(AuthGuard('jwt'))
  async getTrialUsage(
    @Req() req: AuthenticatedRequest & { query: TrialUsageQuery },
  ) {
    const isSuperadmin = req.user.isSuperadmin === true;
    const tenantId = req.query.tenantId || req.user.tenantId;
    if (isSuperadmin) {
      // Optionally return all tenants' trial usage or a message
      return { message: 'Superadmin does not have trial usage limits.' };
    }
    if (!tenantId) {
      return { message: 'Tenant is required for trial usage lookup.' };
    }
    return await this.subscriptionService.getTrialUsage(tenantId);
  }
}
