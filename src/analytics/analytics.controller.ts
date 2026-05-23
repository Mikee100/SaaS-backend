import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { TrialGuard } from '../auth/trial.guard';

@Controller()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  private getNormalizedRoleNames(user: any): string[] {
    if (!Array.isArray(user?.roles)) return [];
    return user.roles
      .map((role: any) =>
        typeof role === 'string' ? role.toLowerCase() : String(role?.name || '').toLowerCase(),
      )
      .filter(Boolean);
  }

  private resolveBranchScope(req: any): string | undefined {
    const roles = this.getNormalizedRoleNames(req?.user);
    const assignedBranchId = req?.user?.branchId as string | undefined;
    const requestedBranchId =
      (req?.headers?.['x-branch-id'] as string | undefined) ||
      (req?.query?.branchId as string | undefined);
    const isBranchScopedRole = roles.includes('manager') || roles.includes('cashier');

    if (isBranchScopedRole) {
      if (!assignedBranchId) {
        throw new ForbiddenException(
          'Your account is branch-scoped but has no assigned branch. Contact an admin.',
        );
      }
      return assignedBranchId;
    }

    if (requestedBranchId && requestedBranchId !== 'all') {
      return requestedBranchId;
    }

    return undefined;
  }

  @Get('/analytics/basic')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getBasicAnalytics(@Req() req: any) {
    // Get the tenant ID from the authenticated user
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new Error('Tenant ID not found in user session');
    }

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      const data = await this.analyticsService.getDashboardAnalytics(
        tenantId,
        effectiveBranchId,
      );

      // Calculate previous period for growth comparison
      const now = new Date();
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get previous period revenue (30-60 days ago)
      const previousRevenue = await this.analyticsService.getRevenueForPeriod(
        tenantId,
        sixtyDaysAgo,
        thirtyDaysAgo,
        effectiveBranchId,
      );

      // Get previous period sales count
      const previousSales = await this.analyticsService.getSalesCountForPeriod(
        tenantId,
        sixtyDaysAgo,
        thirtyDaysAgo,
        effectiveBranchId,
      );

      // Calculate growth percentages
      const revenueGrowth = previousRevenue > 0
        ? ((data.totalRevenue - previousRevenue) / previousRevenue) * 100
        : 0;
      const salesGrowth = previousSales > 0
        ? ((data.totalSales - previousSales) / previousSales) * 100
        : 0;

      // Calculate average order value
      const averageOrderValue = data.totalSales > 0
        ? data.totalRevenue / data.totalSales
        : 0;

      // Format sales by month for chart (last 6 months)
      const salesByMonth = data.salesByMonth || {};

      // Get top products with revenue
      const topProducts = (data.topProducts || []).map((product: any) => ({
        name: product.name || 'Unknown Product',
        revenue: product.revenue || 0,
        sales: product.sales || 0,
      }));

      // Get COGS for last 30 days
      const cogs = await this.analyticsService.getCostOfGoodsSold(tenantId, 30);

      return {
        totalSales: data.totalSales,
        totalRevenue: data.totalRevenue,
        totalProducts: data.totalProducts,
        totalCustomers: data.totalCustomers,
        averageOrderValue,
        conversionRate: 0, // Can be calculated if you have visitor data
        salesByMonth,
        topProducts,
        revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
        salesGrowth: parseFloat(salesGrowth.toFixed(1)),
        customerRetention: data.customerRetention?.retentionRate || 0,
        cogs: parseFloat(cogs.toFixed(2)),
        message: 'Basic analytics available to all plans',
      };
    } catch (error) {
      console.error('Error fetching basic analytics:', error);
      throw new Error('Failed to fetch basic analytics');
    }
  }


  @Get('/analytics/dashboard')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getDashboardAnalytics(@Req() req: any) {
    // Get the tenant ID from the authenticated user
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('Tenant ID not found in user session');
    }

    const branchId = this.resolveBranchScope(req);

    try {
      return await this.analyticsService.getDashboardAnalytics(tenantId, branchId);
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  @Get('/analytics/advanced')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getAdvancedAnalytics(@Req() req: any) {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new Error('Tenant ID not found in user session');
    }

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      const data = await this.analyticsService.getDashboardAnalytics(
        tenantId,
        effectiveBranchId,
      );
      return {
        ...data,
        // Add any advanced metrics here
      };
    } catch (error) {
      console.error('Error fetching advanced analytics:', error);
      throw new Error('Failed to fetch advanced analytics');
    }
  }

  @Get('/analytics/enterprise')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getEnterpriseAnalytics(@Req() req: any) {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new Error('Tenant ID not found in user session');
    }

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      const data = await this.analyticsService.getDashboardAnalytics(
        tenantId,
        effectiveBranchId,
      );
      return {
        ...data,
        // Add any enterprise-specific metrics here
      };
    } catch (error) {
      console.error('Error fetching enterprise analytics:', error);
      throw new Error('Failed to fetch enterprise analytics');
    }
  }

  @Get('/analytics/sales/daily')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getDailySales(@Req() req: any) {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new Error('Tenant ID not found in user session');
    }

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      return await this.analyticsService.getDailySales(tenantId, effectiveBranchId);
    } catch (error) {
      console.error('Error fetching daily sales:', error);
      throw new Error('Failed to fetch daily sales');
    }
  }

  @Get('/analytics/sales/weekly')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getWeeklySales(@Req() req: any) {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new Error('Tenant ID not found in user session');
    }

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      return await this.analyticsService.getWeeklySales(tenantId, effectiveBranchId);
    } catch (error) {
      console.error('Error fetching weekly sales:', error);
      throw new Error('Failed to fetch weekly sales');
    }
  }

  @Get('/analytics/sales/yearly')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getYearlySales(@Req() req: any) {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new Error('Tenant ID not found in user session');
    }

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      return await this.analyticsService.getYearlySales(tenantId, effectiveBranchId);
    } catch (error) {
      console.error('Error fetching yearly sales:', error);
      throw new Error('Failed to fetch yearly sales');
    }
  }

  @Get('/api/reports/branches/:tenantId/sales')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getBranchSales(@Req() req: any) {
    const { tenantId } = req.params;
    const { timeRange = '30days' } = req.query;
    const userTenantId = req.user?.tenantId;

    if (!tenantId || !userTenantId || tenantId !== userTenantId) {
      throw new ForbiddenException('Access denied for tenant reports');
    }

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      return await this.analyticsService.getBranchSales(
        tenantId,
        timeRange as string,
        effectiveBranchId,
      );
    } catch (error) {
      console.error('Error fetching branch sales:', error);
      throw new Error('Failed to fetch branch sales data');
    }
  }

  @Get('/api/reports/branches/:tenantId/comparison/timeseries')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getBranchComparisonTimeSeries(@Req() req: any) {
    const { tenantId } = req.params;
    const { timeRange = '30days' } = req.query;
    const userTenantId = req.user?.tenantId;

    if (!tenantId || !userTenantId || tenantId !== userTenantId) {
      throw new ForbiddenException('Access denied for tenant reports');
    }

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      return await this.analyticsService.getBranchComparisonTimeSeries(
        tenantId,
        timeRange as string,
        effectiveBranchId,
      );
    } catch (error) {
      console.error('Error fetching branch comparison time series:', error);
      throw new Error('Failed to fetch branch comparison time series data');
    }
  }

  @Get('/api/reports/branches/:tenantId/comparison/products')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getBranchProductComparison(@Req() req: any) {
    const { tenantId } = req.params;
    const { timeRange = '30days' } = req.query;
    const userTenantId = req.user?.tenantId;

    if (!tenantId || !userTenantId || tenantId !== userTenantId) {
      throw new ForbiddenException('Access denied for tenant reports');
    }

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      return await this.analyticsService.getBranchProductComparison(
        tenantId,
        timeRange as string,
        effectiveBranchId,
      );
    } catch (error) {
      console.error('Error fetching branch product comparison:', error);
      throw new Error('Failed to fetch branch product comparison data');
    }
  }

  @Get('/analytics/branch-monthly-sales-comparison')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getBranchMonthlySalesComparison(@Req() req: any) {
    const tenantId = req.user.tenantId;
    const { months = 6 } = req.query;

    if (!tenantId) {
      throw new Error('Tenant ID not found in user session');
    }

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      return await this.analyticsService.getBranchMonthlySalesComparison(
        tenantId,
        parseInt(months as string) || 6,
        effectiveBranchId,
      );
    } catch (error) {
      console.error('Error fetching branch monthly sales comparison:', error);
      throw new Error('Failed to fetch branch monthly sales comparison data');
    }
  }
}
