import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequirePlan } from '../billing/plan.guard';
import { PlanGuard } from '../billing/plan.guard';

@Controller('analytics')
export class AnalyticsController {
  @Get('basic')
  @UseGuards(AuthGuard('jwt'))
  async getBasicAnalytics(@Req() req: any) {
    // Available to all plans
    return {
      totalSales: 1250,
      totalRevenue: 45600,
      totalProducts: 45,
      message: 'Basic analytics available to all plans'
    };
  }

  @Get('advanced')
  @UseGuards(AuthGuard('jwt'), PlanGuard)
  @RequirePlan('Pro')
  async getAdvancedAnalytics(@Req() req: any) {
    // Only available to Pro+ plans
    return {
      salesByMonth: {
        '2024-01': 12000,
        '2024-02': 15000,
        '2024-03': 18000
      },
      topProducts: [
        { name: 'Product A', sales: 234, revenue: 2340 },
        { name: 'Product B', sales: 189, revenue: 1890 }
      ],
      customerSegments: [
        { segment: 'VIP', count: 15, revenue: 25000 },
        { segment: 'Regular', count: 85, revenue: 20000 }
      ],
      message: 'Advanced analytics available to Pro+ plans'
    };
  }

  @Get('enterprise')
  @UseGuards(AuthGuard('jwt'), PlanGuard)
  @RequirePlan('Enterprise')
  async getEnterpriseAnalytics(@Req() req: any) {
    // Only available to Enterprise plans
    return {
      realTimeData: {
        currentUsers: 45,
        activeSales: 12,
        revenueToday: 3400
      },
      predictiveAnalytics: {
        nextMonthForecast: 22000,
        churnRisk: 0.05,
        growthRate: 0.15
      },
      customReports: [
        { name: 'Executive Summary', data: '...' },
        { name: 'Department Performance', data: '...' }
      ],
      message: 'Enterprise analytics with real-time data and predictions'
    };
  }
} 