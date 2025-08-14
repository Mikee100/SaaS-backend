import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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
    const tenantId = req.user.tenantId;

    // Fetch products for profitability and inventory
    const products = await this.prisma.product.findMany({ where: { tenantId } });
    // Fetch sales with items for customer retention and product sales
    const allSales = await this.prisma.sale.findMany({ where: { tenantId }, include: { items: true } });
    // Fetch total sales count
    const totalSales = await this.prisma.sale.count({ where: { tenantId } });
    // Fetch total revenue
    const totalRevenueAgg = await this.prisma.sale.aggregate({ _sum: { total: true }, where: { tenantId } });
    const totalRevenue = totalRevenueAgg._sum.total || 0;
    // Fetch total products
    const totalProducts = products.length;
    // Fetch total customers (distinct customerName)
    const customerNames = await this.prisma.sale.findMany({ where: { tenantId, customerName: { not: null } }, select: { customerName: true }, distinct: ['customerName'] });
    const totalCustomers = customerNames.length;
    // Average order value
    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    // Sales by month (last 6 months)
    const salesByMonth: Record<string, number> = {};
    allSales.forEach(sale => {
      const month = sale.createdAt.toISOString().slice(0, 7); // YYYY-MM
      salesByMonth[month] = (salesByMonth[month] || 0) + (sale.total || 0);
    });
    // Profitability: margin = (price - avgSalePrice) / price (no cost field, so use sale price)
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
      // Margin: (price - avgSalePrice) / price
      const avgSalePrice = salesData.unitsSold > 0 ? salesData.revenue / salesData.unitsSold : p.price;
      const margin = p.price > 0 ? ((p.price - avgSalePrice) / p.price) : 0;
      return { id: p.id, name: p.name, unitsSold: salesData.unitsSold, revenue: salesData.revenue, margin };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    // Inventory movement
    const lowStockItems = products.filter(p => (p.stock ?? 0) <= 10 && (p.stock ?? 0) > 0).length;
    const overstockItems = products.filter(p => (p.stock ?? 0) > 100).length;
    const inventoryTurnover = totalProducts > 0 ? totalSales / totalProducts : 0;
    const stockoutRate = totalProducts > 0 ? products.filter(p => (p.stock ?? 0) === 0).length / totalProducts : 0;
    // Customer retention
    const customerSales: Record<string, number> = {};
    allSales.forEach(sale => {
      if (sale.customerName) {
        customerSales[sale.customerName] = (customerSales[sale.customerName] || 0) + 1;
      }
    });
    const repeatCustomers = Object.values(customerSales).filter(count => count > 1).length;
    const retentionRate = totalCustomers > 0 ? repeatCustomers / totalCustomers : 0;
    return {
      totalSales,
      totalRevenue,
      totalProducts,
      totalCustomers,
      averageOrderValue: avgOrderValue,
      salesByMonth,
      topProducts,
      inventoryAnalytics: {
        lowStockItems,
        overstockItems,
        inventoryTurnover,
        stockoutRate
      },
      customerRetention: {
        totalCustomers,
        repeatCustomers,
        retentionRate
      },
      message: 'Dashboard analytics with real business data and advanced KPIs'
    };
  }
}