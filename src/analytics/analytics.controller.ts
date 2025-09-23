import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
<<<<<<< HEAD
import { RequirePlan } from '../billing/plan.guard';
import { PlanGuard } from '../billing/plan.guard';
import { PrismaService } from '../prisma.service';
import { Inject } from '@nestjs/common';

@Controller('analytics')
export class AnalyticsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('basic')
  @UseGuards(AuthGuard('jwt'))
  async getBasicAnalytics(@Req() req: any) {
    // Fetch real data from the database
    const [totalSales, totalRevenue, totalProducts, totalCustomers, sales] = await Promise.all([
      this.prisma.sale.count(),
      this.prisma.sale.aggregate({ _sum: { total: true } }),
      this.prisma.product.count(),
      this.prisma.user.count(),
      this.prisma.sale.findMany({ select: { total: true, createdAt: true } })
    ]);

    // Calculate average order value
    const avgOrderValue = totalSales > 0 ? (totalRevenue._sum.total || 0) / totalSales : 0;

    // Calculate sales by month (last 6 months)
    const salesByMonth: Record<string, number> = {};
    sales.forEach(sale => {
      const month = sale.createdAt.toISOString().slice(0, 7); // YYYY-MM
      salesByMonth[month] = (salesByMonth[month] || 0) + (sale.total || 0);
    });

    return {
      totalSales,
      totalRevenue: totalRevenue._sum.total || 0,
      totalProducts,
      totalCustomers,
      averageOrderValue: avgOrderValue,
      salesByMonth,
      // You can add more real analytics here as needed
      message: 'Basic analytics with real data'
    };
=======
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
        message: 'Basic analytics available to all plans'
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
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
  }

  @Get('advanced')
  @UseGuards(AuthGuard('jwt'))
  async getAdvancedAnalytics(@Req() req: any) {
<<<<<<< HEAD
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
=======
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
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
  }

  @Get('enterprise')
  @UseGuards(AuthGuard('jwt'))
  async getEnterpriseAnalytics(@Req() req: any) {
<<<<<<< HEAD
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

    const tenantId = req.user.tenantId;

    // Fetch products with cost for profitability and inventory
    const products = await this.prisma.product.findMany({ where: { tenantId }, select: { id: true, name: true, cost: true, stock: true } });
    // Fetch sales with items and product details
    const allSales = await this.prisma.sale.findMany({ where: { tenantId }, include: { items: { include: { product: true } } } });
    // Total sales count
    const totalSales = allSales.length;
    // Total revenue
    const totalRevenue = allSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    // Average order value
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    // Total products
    const totalProducts = products.length;
    // Total customers (distinct customerName)
    const customerNames = await this.prisma.sale.findMany({ where: { tenantId, customerName: { not: null } }, select: { customerName: true }, distinct: ['customerName'] });
    const totalCustomers = customerNames.length;

    // Sales trend: day/week/month
    const salesTrendDay: Record<string, number> = {};
    const salesTrendWeek: Record<string, number> = {};
    const salesTrendMonth: Record<string, number> = {};
    allSales.forEach(sale => {
      const day = sale.createdAt.toISOString().split('T')[0];
      const week = `${sale.createdAt.getFullYear()}-W${Math.ceil((sale.createdAt.getDate()) / 7)}`;
      const month = sale.createdAt.toISOString().slice(0, 7);
      salesTrendDay[day] = (salesTrendDay[day] || 0) + (sale.total || 0);
      salesTrendWeek[week] = (salesTrendWeek[week] || 0) + (sale.total || 0);
      salesTrendMonth[month] = (salesTrendMonth[month] || 0) + (sale.total || 0);
    });

    // --- Advanced Analytics ---
    let salesGrowthRate = 0;
    let avgSalesPerCustomer = 0;
    let topPaymentMethods: Array<{ method: string; total: number }> = [];
    let topCustomer: { name: string; total: number } | null = null;
    let salesByHour: number[] = Array(24).fill(0);

    // Calculate advanced analytics
    const monthKeys = Object.keys(salesTrendMonth).sort();
    if (monthKeys.length >= 2) {
      const lastMonth = salesTrendMonth[monthKeys[monthKeys.length - 1]];
      const prevMonth = salesTrendMonth[monthKeys[monthKeys.length - 2]];
      if (prevMonth > 0) {
        salesGrowthRate = ((lastMonth - prevMonth) / prevMonth) * 100;
      }
    }

    avgSalesPerCustomer = totalCustomers > 0 ? totalSales / totalCustomers : 0;

    const paymentMethodTotals: Record<string, number> = {};
    allSales.forEach(sale => {
      if (sale.paymentType) {
        paymentMethodTotals[sale.paymentType] = (paymentMethodTotals[sale.paymentType] || 0) + sale.total;
      }
    });
    topPaymentMethods = Object.entries(paymentMethodTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([method, total]) => ({ method, total }));

    if (allSales.length > 0) {
      const customerTotals: Record<string, number> = {};
      allSales.forEach(sale => {
        if (sale.customerName) {
          customerTotals[sale.customerName] = (customerTotals[sale.customerName] || 0) + sale.total;
        }
      });
      const sortedCustomers = Object.entries(customerTotals).sort((a, b) => b[1] - a[1]);
      if (sortedCustomers.length > 0) {
        topCustomer = { name: sortedCustomers[0][0], total: sortedCustomers[0][1] };
      }
    }

    allSales.forEach(sale => {
      const hour = sale.createdAt.getHours();
      salesByHour[hour] += sale.total || 0;
    });

        // Top products with margin
        const productSalesMap: Record<string, { unitsSold: number; revenue: number }> = {};
        allSales.forEach(sale => {
          sale.items.forEach(item => {
            if (!productSalesMap[item.productId]) {
              productSalesMap[item.productId] = { unitsSold: 0, revenue: 0 };
            }
            productSalesMap[item.productId].unitsSold += item.quantity;
            productSalesMap[item.productId].revenue += item.quantity * item.price;
          });
        });
        const topProducts = products.map(p => {
          const salesData = productSalesMap[p.id] || { unitsSold: 0, revenue: 0 };
          // Margin: (revenue - cost * unitsSold) / revenue
          const margin = salesData.revenue > 0 ? (salesData.revenue - (p.cost * salesData.unitsSold)) / salesData.revenue : 0;
          return { id: p.id, name: p.name, unitsSold: salesData.unitsSold, revenue: salesData.revenue, cost: p.cost ?? 0, margin };
        }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Inventory analytics
    const lowStockItems = products.filter(p => (p.stock ?? 0) <= 10 && (p.stock ?? 0) > 0).length;
    const overstockItems = products.filter(p => (p.stock ?? 0) > 100).length;
    const inventoryTurnover = totalProducts > 0 ? totalSales / totalProducts : 0;
    const stockoutRate = totalProducts > 0 ? products.filter(p => (p.stock ?? 0) === 0).length / totalProducts : 0;

    // Payment breakdown
    const paymentBreakdown: Record<string, number> = {};
    allSales.forEach(sale => {
      if (sale.paymentType) {
        paymentBreakdown[sale.paymentType] = (paymentBreakdown[sale.paymentType] || 0) + 1;
      }
    });

    // Customer segments (basic: by frequency)
    const customerSales: Record<string, number> = {};
    allSales.forEach(sale => {
      if (sale.customerName) {
        customerSales[sale.customerName] = (customerSales[sale.customerName] || 0) + 1;
      }
    });
    const repeatCustomers = Object.values(customerSales).filter(count => count > 1).length;
    const retentionRate = totalCustomers > 0 ? repeatCustomers / totalCustomers : 0;

    // Advanced segments (by location, age, device if available)
    // Placeholder for real logic: you can extend with real fields if present in your schema
    const advancedSegments = {
      byLocation: [],
      byAge: [],
      byDevice: []
    };

    return {
      totalSales,
      totalRevenue,
      totalProducts,
      totalCustomers,
      averageOrderValue,
    salesTrendDay,
    salesTrendWeek,
    salesTrendMonth,
    salesByMonth: salesTrendMonth,
      topProducts,
      inventoryAnalytics: {
        lowStockItems,
        overstockItems,
        inventoryTurnover,
        stockoutRate
      },
      paymentBreakdown,
      customerRetention: {
        totalCustomers,
        repeatCustomers,
        retentionRate
      },
      advancedSegments,
  salesGrowthRate,
  avgSalesPerCustomer,
  topPaymentMethods,
  topCustomer,
  salesByHour,
      message: 'Dashboard analytics with real business data and advanced KPIs'
    };
  }
}
=======
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
}
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
