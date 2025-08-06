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
      totalCustomers: 120,
      averageOrderValue: 36.48,
      conversionRate: 0.68,
      salesByMonth: {
        '2024-01': 12000,
        '2024-02': 15000,
        '2024-03': 18000,
        '2024-04': 21000,
        '2024-05': 19500,
        '2024-06': 22000
      },
      topProducts: [
        { name: 'Product A', sales: 234, revenue: 2340, growth: 0.15 },
        { name: 'Product B', sales: 189, revenue: 1890, growth: 0.08 },
        { name: 'Product C', sales: 156, revenue: 1560, growth: 0.22 },
        { name: 'Product D', sales: 134, revenue: 1340, growth: -0.05 }
      ],
      customerSegments: [
        { segment: 'VIP', count: 15, revenue: 25000, avgOrderValue: 166.67 },
        { segment: 'Regular', count: 85, revenue: 20000, avgOrderValue: 235.29 },
        { segment: 'New', count: 20, revenue: 600, avgOrderValue: 30.00 }
      ],
      salesByCategory: {
        'Electronics': 18000,
        'Clothing': 12000,
        'Home & Garden': 8000,
        'Sports': 7600
      },
      message: 'Enhanced basic analytics available to all plans'
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
        '2024-03': 18000,
        '2024-04': 21000,
        '2024-05': 19500,
        '2024-06': 22000
      },
      topProducts: [
        { name: 'Product A', sales: 234, revenue: 2340, growth: 0.15, margin: 0.25 },
        { name: 'Product B', sales: 189, revenue: 1890, growth: 0.08, margin: 0.30 },
        { name: 'Product C', sales: 156, revenue: 1560, growth: 0.22, margin: 0.20 },
        { name: 'Product D', sales: 134, revenue: 1340, growth: -0.05, margin: 0.35 }
      ],
      customerSegments: [
        { segment: 'VIP', count: 15, revenue: 25000, avgOrderValue: 166.67, retention: 0.95 },
        { segment: 'Regular', count: 85, revenue: 20000, avgOrderValue: 235.29, retention: 0.78 },
        { segment: 'New', count: 20, revenue: 600, avgOrderValue: 30.00, retention: 0.45 }
      ],
      predictiveAnalytics: {
        nextMonthForecast: 22000,
        churnRisk: 0.05,
        growthRate: 0.15,
        seasonalTrend: 0.08,
        marketTrend: 0.12
      },
      performanceMetrics: {
        customerLifetimeValue: 450,
        customerAcquisitionCost: 25,
        returnOnInvestment: 0.18,
        netPromoterScore: 8.2
      },
      inventoryAnalytics: {
        lowStockItems: 8,
        overstockItems: 3,
        inventoryTurnover: 4.2,
        stockoutRate: 0.03
      },
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
        revenueToday: 3400,
        ordersInProgress: 8,
        averageSessionDuration: 15.5,
        bounceRate: 0.23
      },
      predictiveAnalytics: {
        nextMonthForecast: 22000,
        churnRisk: 0.05,
        growthRate: 0.15,
        seasonalTrend: 0.08,
        marketTrend: 0.12,
        demandForecast: {
          'Product A': 280,
          'Product B': 220,
          'Product C': 190,
          'Product D': 150
        }
      },
      advancedSegments: {
        byLocation: [
          { location: 'Nairobi', revenue: 18000, customers: 45 },
          { location: 'Mombasa', revenue: 12000, customers: 32 },
          { location: 'Kisumu', revenue: 8000, customers: 28 },
          { location: 'Other', revenue: 7600, customers: 15 }
        ],
        byAge: [
          { age: '18-25', revenue: 8000, customers: 25 },
          { age: '26-35', revenue: 15000, customers: 40 },
          { age: '36-45', revenue: 12000, customers: 35 },
          { age: '45+', revenue: 10600, customers: 20 }
        ],
        byDevice: [
          { device: 'Mobile', revenue: 25000, customers: 80 },
          { device: 'Desktop', revenue: 15000, customers: 30 },
          { device: 'Tablet', revenue: 5600, customers: 10 }
        ]
      },
      customReports: [
        { name: 'Executive Summary', data: '...', lastUpdated: '2024-01-15' },
        { name: 'Department Performance', data: '...', lastUpdated: '2024-01-14' },
        { name: 'Market Analysis', data: '...', lastUpdated: '2024-01-13' },
        { name: 'Competitive Intelligence', data: '...', lastUpdated: '2024-01-12' }
      ],
      aiInsights: {
        recommendations: [
          'Increase inventory for Product A due to high demand',
          'Consider discounting Product D to improve sales',
          'Focus marketing efforts on mobile users',
          'VIP customers show high retention - increase engagement'
        ],
        anomalies: [
          'Unusual spike in Product C sales on weekends',
          'Mobile conversion rate 15% higher than average',
          'Customer segment "New" showing declining engagement'
        ]
      },
      message: 'Enterprise analytics with real-time data, AI insights, and advanced predictions'
    };
  }

  @Get('dashboard')
  @UseGuards(AuthGuard('jwt'))
  async getDashboardStats(@Req() req: any) {
    // Enhanced dashboard stats for all users
    return {
      totalSales: 1250,
      totalRevenue: 45600,
      totalProducts: 45,
      totalCustomers: 120,
      averageOrderValue: 36.48,
      conversionRate: 0.68,
      recentActivity: {
        sales: [
          { amount: 150, customer: 'John Doe', date: '2024-01-15T10:30:00Z' },
          { amount: 89, customer: 'Jane Smith', date: '2024-01-15T09:15:00Z' },
          { amount: 234, customer: 'Mike Johnson', date: '2024-01-15T08:45:00Z' }
        ],
        products: [
          { name: 'New Product X', date: '2024-01-15T11:00:00Z' },
          { name: 'Updated Product Y', date: '2024-01-14T16:30:00Z' }
        ]
      },
      customerGrowth: {
        '2024-01': 85,
        '2024-02': 92,
        '2024-03': 98,
        '2024-04': 105,
        '2024-05': 112,
        '2024-06': 120
      },
      topProducts: [
        { name: 'Product A', sales: 234, revenue: 2340 },
        { name: 'Product B', sales: 189, revenue: 1890 },
        { name: 'Product C', sales: 156, revenue: 1560 },
        { name: 'Product D', sales: 134, revenue: 1340 }
      ]
    };
  }
} 