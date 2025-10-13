import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('basic')
  @UseGuards(AuthGuard('jwt'))
  async getBasicAnalytics(@Req() req: any) {
    // Get the tenant ID from the authenticated user
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new Error('Tenant ID not found in user session');
    }

    try {
      const data = await this.analyticsService.getDashboardAnalytics(tenantId);
      return {
        totalSales: data.totalSales,
        totalRevenue: data.totalRevenue,
        totalProducts: data.totalProducts,
        message: 'Basic analytics available to all plans',
      };
    } catch (error) {
      console.error('Error fetching basic analytics:', error);
      throw new Error('Failed to fetch basic analytics');
    }
  }

  @Get('dashboard')
  @UseGuards(AuthGuard('jwt'))
  async getDashboardAnalytics(@Req() req: any) {
    // Get the tenant ID from the authenticated user
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new Error('Tenant ID not found in user session');
    }

    try {
      return await this.analyticsService.getDashboardAnalytics(tenantId);
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  @Get('advanced')
  @UseGuards(AuthGuard('jwt'))
  async getAdvancedAnalytics(@Req() req: any) {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new Error('Tenant ID not found in user session');
    }

    try {
      const data = await this.analyticsService.getDashboardAnalytics(tenantId);
      return {
        ...data,
        // Add any advanced metrics here
      };
    } catch (error) {
      console.error('Error fetching advanced analytics:', error);
      throw new Error('Failed to fetch advanced analytics');
    }
  }

  @Get('enterprise')
  @UseGuards(AuthGuard('jwt'))
  async getEnterpriseAnalytics(@Req() req: any) {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new Error('Tenant ID not found in user session');
    }

    try {
      const data = await this.analyticsService.getDashboardAnalytics(tenantId);
      return {
        ...data,
        // Add any enterprise-specific metrics here
      };
    } catch (error) {
      console.error('Error fetching enterprise analytics:', error);
      throw new Error('Failed to fetch enterprise analytics');
    }
  }

  @Get('sales/daily')
  @UseGuards(AuthGuard('jwt'))
  async getDailySales(@Req() req: any) {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new Error('Tenant ID not found in user session');
    }

    try {
      return await this.analyticsService.getDailySales(tenantId);
    } catch (error) {
      console.error('Error fetching daily sales:', error);
      throw new Error('Failed to fetch daily sales');
    }
  }

  @Get('sales/weekly')
  @UseGuards(AuthGuard('jwt'))
  async getWeeklySales(@Req() req: any) {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new Error('Tenant ID not found in user session');
    }

    try {
      return await this.analyticsService.getWeeklySales(tenantId);
    } catch (error) {
      console.error('Error fetching weekly sales:', error);
      throw new Error('Failed to fetch weekly sales');
    }
  }

  @Get('sales/yearly')
  @UseGuards(AuthGuard('jwt'))
  async getYearlySales(@Req() req: any) {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new Error('Tenant ID not found in user session');
    }

    try {
      return await this.analyticsService.getYearlySales(tenantId);
    } catch (error) {
      console.error('Error fetching yearly sales:', error);
      throw new Error('Failed to fetch yearly sales');
    }
  }
}
