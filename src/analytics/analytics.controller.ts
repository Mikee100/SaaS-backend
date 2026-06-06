import {
  Controller,
  Get,
  UseGuards,
  Req,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { TrialGuard } from '../auth/trial.guard';
import { RequireModules } from '../auth/module-access.decorator';
import { AuthenticatedRequest } from '../auth/request.types';

@RequireModules('analytics')
@Controller()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  private asObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : null;
  }

  private getString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0];
    }
    return undefined;
  }

  private getNumber(value: unknown, fallback: number = 0): number {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : fallback;
  }

  private getNormalizedRoleNames(user: unknown): string[] {
    const userObj = this.asObject(user);
    const roles = userObj?.roles;
    if (!Array.isArray(roles)) return [];

    return roles
      .map((role) => {
        if (typeof role === 'string') {
          return role.toLowerCase();
        }
        const roleObj = this.asObject(role);
        const roleName = this.getString(roleObj?.name);
        return roleName ? roleName.toLowerCase() : '';
      })
      .filter((roleName): roleName is string => roleName.length > 0);
  }

  private resolveBranchScope(req: AuthenticatedRequest): string | undefined {
    const roles = this.getNormalizedRoleNames(req.user);
    const assignedBranchId = req.user?.branchId;
    const headers = req.headers as Record<string, unknown>;
    const query = req.query as Record<string, unknown>;
    const requestedBranchId =
      this.getString(headers['x-branch-id']) ?? this.getString(query.branchId);
    const isBranchScopedRole =
      roles.includes('manager') || roles.includes('cashier');

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

  private requireTenantId(req: AuthenticatedRequest): string {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in user session');
    }
    return tenantId;
  }

  private rethrowKnownOrInternal(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new InternalServerErrorException(fallbackMessage);
  }

  @Get('/analytics/basic')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getBasicAnalytics(@Req() req: AuthenticatedRequest) {
    const tenantId = this.requireTenantId(req);

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      const dashboardData: unknown =
        await this.analyticsService.getDashboardAnalytics(
          tenantId,
          effectiveBranchId,
        );
      const data = this.asObject(dashboardData) ?? {};

      // Calculate previous period for growth comparison
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
      const revenueGrowth =
        previousRevenue > 0
          ? ((data.totalRevenue - previousRevenue) / previousRevenue) * 100
          : 0;
      const salesGrowth =
        previousSales > 0
          ? ((this.getNumber(data.totalSales) - previousSales) /
              previousSales) *
            100
          : 0;

      // Calculate average order value
      const averageOrderValue =
        this.getNumber(data.totalSales) > 0
          ? this.getNumber(data.totalRevenue) / this.getNumber(data.totalSales)
          : 0;

      // Format sales by month for chart (last 6 months)
      const salesByMonth = this.asObject(data.salesByMonth) ?? {};

      // Get top products with revenue
      const topProductsRaw = Array.isArray(data.topProducts)
        ? data.topProducts
        : [];
      const topProducts = topProductsRaw.map((product) => {
        const row = this.asObject(product);
        return {
          name: this.getString(row?.name) ?? 'Unknown Product',
          revenue: this.getNumber(row?.revenue),
          sales: this.getNumber(row?.sales),
        };
      });

      // Get COGS for last 30 days
      const cogs = await this.analyticsService.getCostOfGoodsSold(tenantId, 30);

      return {
        totalSales: this.getNumber(data.totalSales),
        totalRevenue: this.getNumber(data.totalRevenue),
        totalProducts: this.getNumber(data.totalProducts),
        totalCustomers: this.getNumber(data.totalCustomers),
        averageOrderValue,
        conversionRate: 0, // Can be calculated if you have visitor data
        salesByMonth,
        topProducts,
        revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
        salesGrowth: parseFloat(salesGrowth.toFixed(1)),
        customerRetention: this.getNumber(
          this.asObject(data.customerRetention)?.retentionRate,
        ),
        cogs: parseFloat(cogs.toFixed(2)),
        message: 'Basic analytics available to all plans',
      };
    } catch (error) {
      console.error('Error fetching basic analytics:', error);
      this.rethrowKnownOrInternal(error, 'Failed to fetch basic analytics');
    }
  }

  @Get('/analytics/dashboard')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getDashboardAnalytics(@Req() req: AuthenticatedRequest) {
    const tenantId = this.requireTenantId(req);

    const branchId = this.resolveBranchScope(req);

    try {
      return await this.analyticsService.getDashboardAnalytics(
        tenantId,
        branchId,
      );
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      this.rethrowKnownOrInternal(error, 'Failed to fetch dashboard data');
    }
  }

  @Get('/analytics/advanced')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getAdvancedAnalytics(@Req() req: AuthenticatedRequest) {
    const tenantId = this.requireTenantId(req);

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
      this.rethrowKnownOrInternal(error, 'Failed to fetch advanced analytics');
    }
  }

  @Get('/analytics/enterprise')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getEnterpriseAnalytics(@Req() req: AuthenticatedRequest) {
    const tenantId = this.requireTenantId(req);

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
      this.rethrowKnownOrInternal(
        error,
        'Failed to fetch enterprise analytics',
      );
    }
  }

  @Get('/analytics/sales/daily')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getDailySales(@Req() req: AuthenticatedRequest) {
    const tenantId = this.requireTenantId(req);

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      return await this.analyticsService.getDailySales(
        tenantId,
        effectiveBranchId,
      );
    } catch (error) {
      console.error('Error fetching daily sales:', error);
      this.rethrowKnownOrInternal(error, 'Failed to fetch daily sales');
    }
  }

  @Get('/analytics/sales/weekly')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getWeeklySales(@Req() req: AuthenticatedRequest) {
    const tenantId = this.requireTenantId(req);

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      return await this.analyticsService.getWeeklySales(
        tenantId,
        effectiveBranchId,
      );
    } catch (error) {
      console.error('Error fetching weekly sales:', error);
      this.rethrowKnownOrInternal(error, 'Failed to fetch weekly sales');
    }
  }

  @Get('/analytics/sales/yearly')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getYearlySales(@Req() req: AuthenticatedRequest) {
    const tenantId = this.requireTenantId(req);

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      return await this.analyticsService.getYearlySales(
        tenantId,
        effectiveBranchId,
      );
    } catch (error) {
      console.error('Error fetching yearly sales:', error);
      this.rethrowKnownOrInternal(error, 'Failed to fetch yearly sales');
    }
  }

  @Get('/analytics/stockout-lost-sales')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getStockoutLostSales(@Req() req: AuthenticatedRequest) {
    const tenantId = this.requireTenantId(req);

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      return await this.analyticsService.getStockoutLostSales(
        tenantId,
        effectiveBranchId,
      );
    } catch (error) {
      console.error('Error fetching stockout lost sales report:', error);
      this.rethrowKnownOrInternal(
        error,
        'Failed to fetch stockout lost sales report',
      );
    }
  }

  @Get('/api/reports/branches/:tenantId/sales')
  @RequireModules('reports')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getBranchSales(@Req() req: AuthenticatedRequest) {
    const params = req.params as Record<string, unknown>;
    const query = req.query as Record<string, unknown>;
    const tenantId = this.getString(params.tenantId);
    const timeRange = this.getString(query.timeRange) ?? '30days';
    const userTenantId = req.user?.tenantId;

    if (!tenantId || !userTenantId || tenantId !== userTenantId) {
      throw new ForbiddenException('Access denied for tenant reports');
    }

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      return await this.analyticsService.getBranchSales(
        tenantId,
        timeRange,
        effectiveBranchId,
      );
    } catch (error) {
      console.error('Error fetching branch sales:', error);
      this.rethrowKnownOrInternal(error, 'Failed to fetch branch sales data');
    }
  }

  @Get('/api/reports/branches/:tenantId/comparison/timeseries')
  @RequireModules('reports')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getBranchComparisonTimeSeries(@Req() req: AuthenticatedRequest) {
    const params = req.params as Record<string, unknown>;
    const query = req.query as Record<string, unknown>;
    const tenantId = this.getString(params.tenantId);
    const timeRange = this.getString(query.timeRange) ?? '30days';
    const userTenantId = req.user?.tenantId;

    if (!tenantId || !userTenantId || tenantId !== userTenantId) {
      throw new ForbiddenException('Access denied for tenant reports');
    }

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      return await this.analyticsService.getBranchComparisonTimeSeries(
        tenantId,
        timeRange,
        effectiveBranchId,
      );
    } catch (error) {
      console.error('Error fetching branch comparison time series:', error);
      this.rethrowKnownOrInternal(
        error,
        'Failed to fetch branch comparison time series data',
      );
    }
  }

  @Get('/api/reports/branches/:tenantId/comparison/products')
  @RequireModules('reports')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getBranchProductComparison(@Req() req: AuthenticatedRequest) {
    const params = req.params as Record<string, unknown>;
    const query = req.query as Record<string, unknown>;
    const tenantId = this.getString(params.tenantId);
    const timeRange = this.getString(query.timeRange) ?? '30days';
    const userTenantId = req.user?.tenantId;

    if (!tenantId || !userTenantId || tenantId !== userTenantId) {
      throw new ForbiddenException('Access denied for tenant reports');
    }

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      return await this.analyticsService.getBranchProductComparison(
        tenantId,
        timeRange,
        effectiveBranchId,
      );
    } catch (error) {
      console.error('Error fetching branch product comparison:', error);
      this.rethrowKnownOrInternal(
        error,
        'Failed to fetch branch product comparison data',
      );
    }
  }

  @Get('/analytics/branch-monthly-sales-comparison')
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  async getBranchMonthlySalesComparison(@Req() req: AuthenticatedRequest) {
    const tenantId = this.requireTenantId(req);
    const query = req.query as Record<string, unknown>;
    const monthsRaw = this.getString(query.months);
    const parsedMonths = monthsRaw ? Number.parseInt(monthsRaw, 10) : 6;

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      return await this.analyticsService.getBranchMonthlySalesComparison(
        tenantId,
        Number.isFinite(parsedMonths) ? parsedMonths : 6,
        effectiveBranchId,
      );
    } catch (error) {
      console.error('Error fetching branch monthly sales comparison:', error);
      this.rethrowKnownOrInternal(
        error,
        'Failed to fetch branch monthly sales comparison data',
      );
    }
  }
}
