import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardAnalytics(tenantId: string) {
    // Get current date and calculate date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch data in parallel
    const [
      totalSales,
      totalRevenue,
      totalProducts,
      totalCustomers,
      salesByDay,
      salesByWeek,
      salesByMonth,
      branches,
      branchSalesByDay,
      branchSalesByWeek,
      branchSalesByMonth,
      topProducts,
      branchTopProducts,
      inventoryAnalytics,
      forecastData,
      anomaliesData,
      customerSegmentsData,
      churnPredictionData,
    ] = await Promise.all([
      // Total Sales (count of sales in the last 30 days)
      this.prisma.sale.count({
        where: {
          tenantId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),

      // Total Revenue (sum of sales in the last 30 days)
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { total: true },
      }),

      // Total Products
      this.prisma.product.count({
        where: { tenantId },
      }),

      // Total Customers (unique customer names in sales)
      this.prisma.sale.groupBy({
        by: ['customerPhone'],
        where: {
          tenantId,
          customerPhone: { not: null },
        },
        _count: true,
      }),

      // Sales by day (last 7 days)
      this.getSalesByTimePeriod(tenantId, 'day'),

      // Sales by week (last 4 weeks)
      this.getSalesByTimePeriod(tenantId, 'week'),

      // Sales by month (last 6 months)
      this.getSalesByTimePeriod(tenantId, 'month'),

      // Get all branches for this tenant
      this.prisma.branch.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      }),

      // Branch-specific sales by day (last 7 days)
      this.getBranchSalesByTimePeriod(tenantId, 'day'),

      // Branch-specific sales by week (last 4 weeks)
      this.getBranchSalesByTimePeriod(tenantId, 'week'),

      // Branch-specific sales by month (last 6 months)
      this.getBranchSalesByTimePeriod(tenantId, 'month'),

      // Top selling products
      this.getTopProducts(tenantId, 5),

      // Branch top products
      this.getBranchTopProducts(tenantId),

      // Inventory analytics
      this.getInventoryAnalytics(tenantId),

      // Sales forecasting
      this.generateSalesForecast(tenantId),

      // AI-powered anomaly detection
      this.getAnomaliesData(tenantId),

      // AI-powered customer segmentation
      this.getCustomerSegmentsData(tenantId),

      // AI-powered churn prediction
      this.getChurnPredictionData(tenantId),
    ]);

    // Calculate customer retention (simplified)
    const repeatCustomers = await this.getRepeatCustomers(tenantId);
    const totalUniqueCustomers = totalCustomers.length;
    const retentionRate =
      totalUniqueCustomers > 0
        ? (repeatCustomers / totalUniqueCustomers) * 100
        : 0;

    // Calculate performance metrics
    const performanceMetrics = await this.calculatePerformanceMetrics(tenantId);

    const analyticsData = {
      totalSales,
      totalRevenue: totalRevenue._sum.total || 0,
      totalProducts,
      totalCustomers: totalUniqueCustomers,
      salesByDay,
      salesByWeek,
      salesByMonth,
      branches,
      branchSalesByDay,
      branchSalesByWeek,
      branchSalesByMonth,
      topProducts,
      branchTopProducts: branchTopProducts,
      customerRetention: {
        totalCustomers: totalUniqueCustomers,
        repeatCustomers,
        retentionRate: parseFloat(retentionRate.toFixed(2)),
      },
      inventoryAnalytics,
      performanceMetrics,
      realTimeData: await this.getRealTimeData(tenantId),
      forecast: forecastData,
      anomalies: anomaliesData,
      customerSegmentsAI: customerSegmentsData,
      churnPrediction: churnPredictionData,
    };

    // Generate AI summary
    let aiSummary = 'AI summary generation failed.';
    try {
      const summaryResponse = await axios.post(
        'http://localhost:5001/generate_summary',
        {
          metrics: {
            totalSales,
            totalRevenue: totalRevenue._sum.total || 0,
            avgSaleValue:
              totalSales > 0 ? (totalRevenue._sum.total || 0) / totalSales : 0,
            topProducts: topProducts.map((p) => ({ name: p.name })),
            customerRetention: {
              retentionRate: parseFloat(retentionRate.toFixed(2)),
            },
            forecastGrowth:
              forecastData.forecast_sales?.length > 1
                ? ((forecastData.forecast_sales[
                    forecastData.forecast_sales.length - 1
                  ] -
                    forecastData.forecast_sales[0]) /
                    forecastData.forecast_sales[0]) *
                  100
                : 0,
          },
        },
      );
      aiSummary = summaryResponse.data.summary;
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
    }

    // Add recent activity data
    const recentSales = await this.prisma.sale.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        User: {
          select: { name: true },
        },
      },
    });

    const recentActivity = {
      sales: recentSales.map((sale) => ({
        id: sale.id,
        amount: sale.total,
        customer: sale.customerName || 'Anonymous',
        date: sale.createdAt,
        user: sale.User?.name || 'Unknown',
        total: sale.total,
      })),
      products: [], // Could add recent products if needed
    };

    return {
      ...analyticsData,
      recentActivity,
      aiSummary,
    };
  }

  private async getSalesByTimePeriod(
    tenantId: string,
    period: 'day' | 'week' | 'month' | 'year',
  ) {
    const now = new Date();
    const format =
      period === 'day'
        ? 'YYYY-MM-DD'
        : period === 'week'
          ? "'Week' WW"
          : period === 'month'
            ? 'YYYY-MM'
            : 'YYYY';

    const groupBy =
      period === 'day'
        ? 'day'
        : period === 'week'
          ? 'week'
          : period === 'month'
            ? 'month'
            : 'year';

    const date = new Date();
    if (period === 'day') date.setDate(date.getDate() - 7);
    else if (period === 'week')
      date.setDate(date.getDate() - 28); // 4 weeks
    else if (period === 'month')
      date.setMonth(date.getMonth() - 6); // 6 months
    else date.setFullYear(date.getFullYear() - 5); // 5 years

    const sales = await this.prisma.$queryRaw`
      SELECT
        TO_CHAR("createdAt" AT TIME ZONE 'UTC', ${format}) as period,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total
      FROM "Sale"
      WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= ${date}
      GROUP BY period
      ORDER BY period ASC
    `;

    type SalesData = { period: string; total: string };
    return (sales as SalesData[]).reduce<Record<string, number>>(
      (acc, curr) => ({
        ...acc,
        [curr.period]: parseFloat(curr.total),
      }),
      {},
    );
  }

  async getDailySales(tenantId: string) {
    return this.getSalesByTimePeriod(tenantId, 'day');
  }

  async getWeeklySales(tenantId: string) {
    return this.getSalesByTimePeriod(tenantId, 'week');
  }

  async getYearlySales(tenantId: string) {
    return this.getSalesByTimePeriod(tenantId, 'year');
  }

  private async getBranchSalesByTimePeriod(
    tenantId: string,
    period: 'day' | 'week' | 'month' | 'year',
  ) {
    const now = new Date();
    const format =
      period === 'day'
        ? 'YYYY-MM-DD'
        : period === 'week'
          ? "'Week' WW"
          : period === 'month'
            ? 'YYYY-MM'
            : 'YYYY';

    const groupBy =
      period === 'day'
        ? 'day'
        : period === 'week'
          ? 'week'
          : period === 'month'
            ? 'month'
            : 'year';

    const date = new Date();
    if (period === 'day') date.setDate(date.getDate() - 7);
    else if (period === 'week')
      date.setDate(date.getDate() - 28); // 4 weeks
    else if (period === 'month')
      date.setMonth(date.getMonth() - 6); // 6 months
    else date.setFullYear(date.getFullYear() - 5); // 5 years

    const sales = await this.prisma.$queryRaw`
      SELECT
        "branchId",
        TO_CHAR("createdAt" AT TIME ZONE 'UTC', ${format}) as period,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total
      FROM "Sale"
      WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= ${date}
        AND "branchId" IS NOT NULL
      GROUP BY "branchId", period
      ORDER BY "branchId", period ASC
    `;

    type SalesData = { branchId: string; period: string; total: string };
    const salesArray = sales as SalesData[];

    // Group by branchId
    const branchSales: Record<string, Record<string, number>> = {};
    salesArray.forEach((item) => {
      if (!branchSales[item.branchId]) {
        branchSales[item.branchId] = {};
      }
      branchSales[item.branchId][item.period] = parseFloat(item.total);
    });

    return branchSales;
  }

  private async getTopProducts(tenantId: string, limit: number) {
    const topProducts = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: { tenantId },
      },
      _sum: {
        quantity: true,
        price: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          price: 'desc',
        },
      },
      take: limit,
    });

    // Get product details
    const productDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });

        const revenue = item._sum.price
          ? parseFloat(item._sum.price.toString())
          : 0;
        const quantity = item._sum.quantity || 0;
        const cost = product ? product.cost * quantity : 0;
        const margin = revenue > 0 ? (revenue - cost) / revenue : 0;

        return {
          name: product?.name || 'Unknown Product',
          sales: item._sum.quantity,
          revenue: revenue,
          margin: parseFloat(margin.toFixed(2)),
          cost: parseFloat(cost.toFixed(2)),
        };
      }),
    );

    return productDetails;
  }

  private async getBranchTopProducts(tenantId: string) {
    // Get all branches for this tenant
    const branches = await this.prisma.branch.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });

    const branchTopProducts: Record<string, Array<{ name: string; sales: number; revenue: number; margin?: number; cost?: number }>> = {};

    // For each branch, get top 3 products
    for (const branch of branches) {
      const topProducts = await this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: {
            tenantId,
            branchId: branch.id,
          },
        },
        _sum: {
          quantity: true,
          price: true,
        },
        _count: true,
        orderBy: {
          _sum: {
            price: 'desc',
          },
        },
        take: 3,
      });

      // Get product details
      const productDetails = await Promise.all(
        topProducts.map(async (item) => {
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
          });

          const revenue = item._sum.price
            ? parseFloat(item._sum.price.toString())
            : 0;
          const quantity = item._sum.quantity || 0;
          const cost = product ? product.cost * quantity : 0;
          const margin = revenue > 0 ? (revenue - cost) / revenue : 0;

          return {
            name: product?.name || 'Unknown Product',
            sales: item._sum.quantity || 0,
            revenue: revenue,
            margin: parseFloat(margin.toFixed(2)),
            cost: parseFloat(cost.toFixed(2)),
          };
        }),
      );

      branchTopProducts[branch.id] = productDetails;
    }

    return branchTopProducts;
  }

  private async getInventoryAnalytics(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId },
      include: { inventory: true },
    });

    const lowStockThreshold = 10; // Items below this are considered low stock
    const overstockThreshold = 100; // Items above this are considered overstocked

    let lowStockItems = 0;
    let overstockItems = 0;
    let totalStockValue = 0;
    let totalCost = 0;

    // Calculate inventory metrics
    products.forEach((product) => {
      const stock = product.inventory.reduce(
        (sum, inv) => sum + inv.quantity,
        0,
      );
      const value = stock * (product.price || 0);
      const cost = stock * (product.cost || 0);

      totalStockValue += value;
      totalCost += cost;

      if (stock <= lowStockThreshold) lowStockItems++;
      if (stock >= overstockThreshold) overstockItems++;
    });

    // Calculate inventory turnover (simplified)
    const cogs = await this.getCostOfGoodsSold(tenantId, 30); // Last 30 days
    const avgInventoryValue = totalCost / 2; // Simplified average
    const inventoryTurnover =
      avgInventoryValue > 0 ? cogs / avgInventoryValue : 0;

    // Calculate stockout rate (simplified)
    const stockoutRate =
      products.length > 0
        ? products.filter((p) => p.stock <= 0).length / products.length
        : 0;

    return {
      lowStockItems,
      overstockItems,
      inventoryTurnover: parseFloat(inventoryTurnover.toFixed(2)),
      stockoutRate: parseFloat(stockoutRate.toFixed(2)),
      totalStockValue: parseFloat(totalStockValue.toFixed(2)),
    };
  }

  private async getCostOfGoodsSold(tenantId: string, days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const sales = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId,
          createdAt: { gte: date },
        },
      },
      include: {
        product: true,
      },
    });

    return sales.reduce((sum, item) => {
      const cost = item.product?.cost || 0;
      return sum + cost * item.quantity;
    }, 0);
  }

  private async getRepeatCustomers(tenantId: string) {
    const repeatCustomers = await this.prisma.$queryRaw(
      Prisma.sql`
        SELECT "customerPhone", COUNT(*) as purchase_count
        FROM "Sale"
        WHERE "tenantId" = ${tenantId}
          AND "customerPhone" IS NOT NULL
        GROUP BY "customerPhone"
        HAVING COUNT(*) > 1
      `,
    );

    type RepeatCustomer = { customerPhone: string; purchase_count: bigint };
    return (repeatCustomers as RepeatCustomer[]).length;
  }

  private async calculatePerformanceMetrics(tenantId: string) {
    // Simplified calculations - in a real app, these would be more sophisticated
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get total revenue and sales count
    const salesData = await this.prisma.sale.aggregate({
      where: {
        tenantId,
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { total: true },
      _count: true,
    });

    // Get customer count
    const customerCount = await this.prisma.sale.groupBy({
      by: ['customerPhone'],
      where: {
        tenantId,
        customerPhone: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: true,
    });

    const totalRevenue = salesData._sum.total || 0;
    const totalSales = salesData._count;
    const totalCustomers = customerCount.length;

    // Simplified metrics - in a real app, these would be more accurate
    const customerLifetimeValue =
      totalCustomers > 0
        ? (totalRevenue * 3) / totalCustomers // Assuming 3x multiplier for lifetime value
        : 0;

    const customerAcquisitionCost =
      totalCustomers > 0
        ? 1000 / totalCustomers // Assuming $1000 marketing spend
        : 0;

    const returnOnInvestment =
      customerAcquisitionCost > 0
        ? (customerLifetimeValue - customerAcquisitionCost) /
          customerAcquisitionCost
        : 0;

    // NPS is typically -100 to 100, we'll simulate a reasonable value
    const netPromoterScore = 45; // This would come from customer surveys in a real app

    return {
      customerLifetimeValue: parseFloat(customerLifetimeValue.toFixed(2)),
      customerAcquisitionCost: parseFloat(customerAcquisitionCost.toFixed(2)),
      returnOnInvestment: parseFloat(returnOnInvestment.toFixed(2)),
      netPromoterScore: Math.min(100, Math.max(-100, netPromoterScore)),
    };
  }

  private async getRealTimeData(tenantId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get today's sales count
    const salesToday = await this.prisma.sale.count({
      where: {
        tenantId,
        createdAt: { gte: today },
      },
    });

    // Get today's revenue
    const revenueToday = await this.prisma.sale.aggregate({
      where: {
        tenantId,
        createdAt: { gte: today },
      },
      _sum: { total: true },
    });

    // Get active users (users who made sales today)
    const activeUsers = await this.prisma.sale.groupBy({
      by: ['userId'],
      where: {
        tenantId,
        createdAt: { gte: today },
      },
    });

    // Get active sales (sales in progress - this is a simplified version)
    const activeSales = await this.prisma.sale.count({
      where: {
        tenantId,
        createdAt: { gte: new Date(Date.now() - 3600000) }, // Sales in the last hour
      },
    });

    return {
      currentUsers: activeUsers.length,
      activeSales,
      revenueToday: revenueToday._sum.total || 0,
      ordersInProgress: salesToday,
      averageSessionDuration: 8.5, // Minutes - would come from analytics in a real app
      bounceRate: 0.32, // Would come from analytics in a real app
    };
  }

  private async generateSalesForecast(tenantId: string) {
    // Get historical sales data for the last 6 months to base forecast on
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const historicalSales = await this.prisma.$queryRaw(
      Prisma.sql`
        SELECT
          TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM') as month,
          COUNT(*) as sales_count,
          COALESCE(SUM(total), 0) as total_revenue
        FROM "Sale"
        WHERE "tenantId" = ${tenantId}
          AND "createdAt" >= ${sixMonthsAgo}
        GROUP BY month
        ORDER BY month ASC
      `,
    );

    type HistoricalData = {
      month: string;
      sales_count: bigint;
      total_revenue: string;
    };

    // If we have less than 3 months of data, generate mock forecast data
    if ((historicalSales as HistoricalData[]).length < 3) {
      const now = new Date();
      const forecastMonths: string[] = [];
      const forecastSales: number[] = [];

      for (let i = 1; i <= 6; i++) {
        const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        forecastMonths.push(futureDate.toISOString().slice(0, 7)); // YYYY-MM format

        // Generate realistic mock sales data with some growth trend
        const baseSales = 150 + Math.random() * 100; // Base sales between 150-250
        const growthFactor = 1 + i * 0.05 + (Math.random() * 0.1 - 0.05); // 5% monthly growth with variance
        forecastSales.push(Math.round(baseSales * growthFactor));
      }

      return {
        forecast_months: forecastMonths,
        forecast_sales: forecastSales,
      };
    }

    // Calculate trend and seasonality from historical data
    const salesData = (historicalSales as HistoricalData[]).map((item) => ({
      month: item.month,
      sales: Number(item.sales_count),
      revenue: parseFloat(item.total_revenue),
    }));

    // Simple linear regression for trend
    const n = salesData.length;
    const sumX = salesData.reduce((sum, _, index) => sum + index, 0);
    const sumY = salesData.reduce((sum, item) => sum + item.sales, 0);
    const sumXY = salesData.reduce(
      (sum, item, index) => sum + index * item.sales,
      0,
    );
    const sumXX = salesData.reduce((sum, _, index) => sum + index * index, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecast for next 6 months
    const now = new Date();
    const forecastMonths: string[] = [];
    const forecastSales: number[] = [];

    for (let i = 1; i <= 6; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      forecastMonths.push(futureDate.toISOString().slice(0, 7)); // YYYY-MM format

      // Predict sales using linear regression
      const predictedSales = intercept + slope * (n + i - 1);

      // Add some realistic variance (±20%) and ensure positive values
      const variance = 0.2;
      const randomFactor = 1 + (Math.random() * variance * 2 - variance);
      const finalPrediction = Math.max(
        1,
        Math.round(predictedSales * randomFactor),
      );

      forecastSales.push(finalPrediction);
    }

    return {
      forecast_months: forecastMonths,
      forecast_sales: forecastSales,
    };
  }

  private async getAnomaliesData(tenantId: string) {
    try {
      // Get sales data for anomaly detection (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const salesData = await this.prisma.$queryRaw(
        Prisma.sql`
          SELECT
            TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
            COUNT(*) as sales_count,
            COALESCE(SUM(total), 0) as total_revenue
          FROM "Sale"
          WHERE "tenantId" = ${tenantId}
            AND "createdAt" >= ${sixMonthsAgo}
          GROUP BY date
          ORDER BY date ASC
        `,
      );

      type SalesData = {
        date: string;
        sales_count: bigint;
        total_revenue: string;
      };
      const sales = (salesData as SalesData[]).map((item) => ({
        date: item.date,
        value: parseFloat(item.total_revenue),
      }));

      if (sales.length < 5) {
        return []; // Not enough data for anomaly detection
      }

      const response = await axios.post('http://localhost:5001/anomalies', {
        sales,
      });

      return response.data || [];
    } catch (error) {
      console.error('Failed to get anomalies data:', error);
      return [];
    }
  }

  private async getCustomerSegmentsData(tenantId: string) {
    try {
      // Get customer data for segmentation
      const customerData = await this.prisma.$queryRaw(
        Prisma.sql`
          SELECT
            COALESCE("customerName", 'Unknown') as name,
            COUNT(*) as count,
            COALESCE(SUM(total), 0) as total,
            MAX("createdAt") as last_purchase
          FROM "Sale"
          WHERE "tenantId" = ${tenantId}
            AND "customerPhone" IS NOT NULL
          GROUP BY "customerPhone", "customerName"
          HAVING COUNT(*) > 0
        `,
      );

      type CustomerData = {
        name: string;
        count: bigint;
        total: string;
        last_purchase: Date;
      };
      const customers = (customerData as CustomerData[]).map((item) => ({
        name: item.name,
        total: parseFloat(item.total),
        count: Number(item.count),
        last_purchase: item.last_purchase.toISOString().split('T')[0],
      }));

      if (customers.length < 2) {
        return []; // Not enough data for segmentation
      }

      const response = await axios.post(
        'http://localhost:5001/customer_segments',
        {
          customers,
        },
      );

      return response.data || [];
    } catch (error) {
      console.error('Failed to get customer segments data:', error);
      return [];
    }
  }

  private async getChurnPredictionData(tenantId: string) {
    try {
      // Get customer data for churn prediction
      const customerData = await this.prisma.$queryRaw(
        Prisma.sql`
          SELECT
            COALESCE("customerName", 'Unknown') as name,
            COUNT(*) as count,
            COALESCE(SUM(total), 0) as total,
            MAX("createdAt") as last_purchase
          FROM "Sale"
          WHERE "tenantId" = ${tenantId}
            AND "customerPhone" IS NOT NULL
          GROUP BY "customerPhone", "customerName"
          HAVING COUNT(*) > 0
        `,
      );

      type CustomerData = {
        name: string;
        count: bigint;
        total: string;
        last_purchase: Date;
      };
      const customers = (customerData as CustomerData[]).map((item) => ({
        name: item.name,
        total: parseFloat(item.total),
        count: Number(item.count),
        last_purchase: item.last_purchase.toISOString().split('T')[0],
      }));

      if (customers.length < 2) {
        return []; // Not enough data for churn prediction
      }

      const response = await axios.post(
        'http://localhost:5001/churn_prediction',
        {
          customers,
        },
      );

      return response.data || [];
    } catch (error) {
      console.error('Failed to get churn prediction data:', error);
      return [];
    }
  }

  async getBranchSales(
    tenantId: string,
    timeRange: string = '30days',
    branchId?: string,
  ) {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case '7days':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '90days':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case '30days':
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Build where clause for branch filtering
      const whereClause: any = {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (branchId) {
        whereClause.branchId = branchId;
      }

      // Get total orders and sales
      const salesAggregate = await this.prisma.sale.aggregate({
        where: whereClause,
        _sum: {
          total: true,
        },
        _count: true,
      });

      const totalOrders = salesAggregate._count;
      const totalSales = salesAggregate._sum.total || 0;
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Get top products
      const topProductsData = await this.prisma.$queryRaw`
        SELECT
          p.id as "productId",
          p.name as "productName",
          SUM(si.quantity) as "quantitySold",
          SUM(si.quantity * si.price) as "totalRevenue"
        FROM "SaleItem" si
        JOIN "Sale" s ON si."saleId" = s.id
        JOIN "Product" p ON si."productId" = p.id
        WHERE s."tenantId" = ${tenantId}
          AND s."createdAt" >= ${startDate}
          AND s."createdAt" <= ${endDate}
          ${branchId ? Prisma.sql`AND s."branchId" = ${branchId}` : Prisma.empty}
        GROUP BY p.id, p.name
        ORDER BY "totalRevenue" DESC
        LIMIT 5
      `;

      // Get payment methods
      const paymentMethodsData = await this.prisma.$queryRaw`
        SELECT
          "paymentType" as method,
          COUNT(*) as count,
          COALESCE(SUM(total), 0) as amount
        FROM "Sale"
        WHERE "tenantId" = ${tenantId}
          AND "createdAt" >= ${startDate}
          AND "createdAt" <= ${endDate}
          ${branchId ? Prisma.sql`AND "branchId" = ${branchId}` : Prisma.empty}
        GROUP BY "paymentType"
        ORDER BY amount DESC
      `;

      // Get sales trend (daily)
      const salesTrendData = await this.prisma.$queryRaw`
        SELECT
          DATE_TRUNC('day', "createdAt") as date,
          COUNT(*) as orders,
          COALESCE(SUM(total), 0) as sales
        FROM "Sale"
        WHERE "tenantId" = ${tenantId}
          AND "createdAt" >= ${startDate}
          AND "createdAt" <= ${endDate}
          ${branchId ? Prisma.sql`AND "branchId" = ${branchId}` : Prisma.empty}
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date ASC
      `;

      // Format the response
      const topProducts = (topProductsData as any[]).map((p) => ({
        productId: p.productId,
        productName: p.productName,
        quantitySold: Number(p.quantitySold) || 0,
        totalRevenue: Number(p.totalRevenue) || 0,
      }));

      const paymentMethods = (paymentMethodsData as any[]).map((pm) => ({
        method: pm.method,
        count: Number(pm.count) || 0,
        amount: Number(pm.amount) || 0,
      }));

      const salesTrend = (salesTrendData as any[]).map((st) => ({
        date: st.date.toISOString().split('T')[0],
        sales: Number(st.sales) || 0,
        orders: Number(st.orders) || 0,
      }));

      return {
        totalOrders,
        totalSales: Number(totalSales),
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        topProducts,
        paymentMethods,
        salesTrend,
      };
    } catch (error) {
      console.error('Error in getBranchSales:', error);
      throw new Error('Failed to fetch branch sales data');
    }
  }

  async getBranchComparisonTimeSeries(
    tenantId: string,
    timeRange: string = '30days',
  ) {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case '7days':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '90days':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case '30days':
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Determine grouping period based on time range
      let dateTrunc: string;
      let format: string;

      if (timeRange === '7days') {
        dateTrunc = 'day';
        format = 'YYYY-MM-DD';
      } else if (timeRange === '30days') {
        dateTrunc = 'day';
        format = 'YYYY-MM-DD';
      } else if (timeRange === '90days') {
        dateTrunc = 'week';
        format = "'Week' WW YYYY";
      } else if (timeRange === '1year') {
        dateTrunc = 'month';
        format = 'YYYY-MM';
      } else {
        dateTrunc = 'day';
        format = 'YYYY-MM-DD';
      }

      // Get all branches for this tenant
      const branches = await this.prisma.branch.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      });

      // Get time-series data for all branches
      const timeSeriesData = await this.prisma.$queryRaw`
        SELECT
          b.id as "branchId",
          b.name as "branchName",
          TO_CHAR(s."createdAt" AT TIME ZONE 'UTC', ${format}) as period,
          COUNT(s.id) as orders,
          COALESCE(SUM(s.total), 0) as sales
        FROM "Branch" b
        LEFT JOIN "Sale" s ON b.id = s."branchId"
          AND s."tenantId" = ${tenantId}
          AND s."createdAt" >= ${startDate}
          AND s."createdAt" <= ${endDate}
        WHERE b."tenantId" = ${tenantId}
        GROUP BY b.id, b.name, period
        ORDER BY b.name, period ASC
      `;

      // Get branch totals for the period
      const branchTotals = await this.prisma.$queryRaw`
        SELECT
          b.id as "branchId",
          b.name as "branchName",
          COUNT(s.id) as total_orders,
          COALESCE(SUM(s.total), 0) as total_sales
        FROM "Branch" b
        LEFT JOIN "Sale" s ON b.id = s."branchId"
          AND s."tenantId" = ${tenantId}
          AND s."createdAt" >= ${startDate}
          AND s."createdAt" <= ${endDate}
        WHERE b."tenantId" = ${tenantId}
        GROUP BY b.id, b.name
        ORDER BY total_sales DESC
      `;

      // Process time series data
      const processedData = (timeSeriesData as any[]).reduce(
        (acc, item) => {
          const branchId = item.branchId;
          if (!acc[branchId]) {
            acc[branchId] = {
              branchId,
              branchName: item.branchName,
              data: [],
            };
          }
          acc[branchId].data.push({
            period: item.period,
            orders: Number(item.orders) || 0,
            sales: Number(item.sales) || 0,
          });
          return acc;
        },
        {} as Record<string, any>,
      );

      // Convert to array and sort by total sales
      const branchComparison = Object.values(processedData).sort(
        (a: any, b: any) => {
          const aTotal = a.data.reduce(
            (sum: number, item: any) => sum + item.sales,
            0,
          );
          const bTotal = b.data.reduce(
            (sum: number, item: any) => sum + item.sales,
            0,
          );
          return bTotal - aTotal;
        },
      );

      // Process branch totals
      const totals = (branchTotals as any[]).map((item) => ({
        branchId: item.branchId,
        branchName: item.branchName,
        totalOrders: Number(item.total_orders) || 0,
        totalSales: Number(item.total_sales) || 0,
      }));

      return {
        timeRange,
        branches: branchComparison,
        totals,
        periodType: dateTrunc,
      };
    } catch (error) {
      console.error('Error in getBranchComparisonTimeSeries:', error);
      throw new Error('Failed to fetch branch comparison time series data');
    }
  }

  async getBranchProductComparison(
    tenantId: string,
    timeRange: string = '30days',
  ) {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case '7days':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '90days':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case '30days':
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Get product performance across all branches
      const productComparisonData = await this.prisma.$queryRaw`
        SELECT
          p.id as "productId",
          p.name as "productName",
          b.id as "branchId",
          b.name as "branchName",
          SUM(si.quantity) as "quantitySold",
          SUM(si.quantity * si.price) as "totalRevenue",
          COUNT(DISTINCT s.id) as "orderCount"
        FROM "Product" p
        CROSS JOIN "Branch" b
        LEFT JOIN "Sale" s ON s."branchId" = b.id
          AND s."tenantId" = ${tenantId}
          AND s."createdAt" >= ${startDate}
          AND s."createdAt" <= ${endDate}
        LEFT JOIN "SaleItem" si ON si."saleId" = s.id AND si."productId" = p.id
        WHERE b."tenantId" = ${tenantId}
        GROUP BY p.id, p.name, b.id, b.name
        ORDER BY p.name, b.name
      `;

      // Get overall product totals (across all branches)
      const overallProductTotals = await this.prisma.$queryRaw`
        SELECT
          p.id as "productId",
          p.name as "productName",
          SUM(si.quantity) as "totalQuantitySold",
          SUM(si.quantity * si.price) as "totalRevenue",
          COUNT(DISTINCT s.id) as "totalOrders",
          COUNT(DISTINCT s."branchId") as "branchCount"
        FROM "Product" p
        LEFT JOIN "SaleItem" si ON si."productId" = p.id
        LEFT JOIN "Sale" s ON si."saleId" = s.id
          AND s."tenantId" = ${tenantId}
          AND s."createdAt" >= ${startDate}
          AND s."createdAt" <= ${endDate}
        WHERE p."tenantId" = ${tenantId}
        GROUP BY p.id, p.name
        HAVING SUM(si.quantity) > 0
        ORDER BY "totalRevenue" DESC
        LIMIT 20
      `;

      // Get branch totals for context
      const branchTotals = await this.prisma.$queryRaw`
        SELECT
          b.id as "branchId",
          b.name as "branchName",
          COUNT(DISTINCT s.id) as "totalOrders",
          COALESCE(SUM(s.total), 0) as "totalSales"
        FROM "Branch" b
        LEFT JOIN "Sale" s ON b.id = s."branchId"
          AND s."tenantId" = ${tenantId}
          AND s."createdAt" >= ${startDate}
          AND s."createdAt" <= ${endDate}
        WHERE b."tenantId" = ${tenantId}
        GROUP BY b.id, b.name
        ORDER BY "totalSales" DESC
      `;

      // Process product comparison data
      const products = (overallProductTotals as any[]).map((product) => {
        const branchData = (productComparisonData as any[])
          .filter((item) => item.productId === product.productId)
          .map((item) => ({
            branchId: item.branchId,
            branchName: item.branchName,
            quantitySold: Number(item.quantitySold) || 0,
            totalRevenue: Number(item.totalRevenue) || 0,
            orderCount: Number(item.orderCount) || 0,
          }));

        return {
          productId: product.productId,
          productName: product.productName,
          totalQuantitySold: Number(product.totalQuantitySold) || 0,
          totalRevenue: Number(product.totalRevenue) || 0,
          totalOrders: Number(product.totalOrders) || 0,
          branchCount: Number(product.branchCount) || 0,
          branchBreakdown: branchData,
        };
      });

      // Process branch totals
      const branches = (branchTotals as any[]).map((branch) => ({
        branchId: branch.branchId,
        branchName: branch.branchName,
        totalOrders: Number(branch.totalOrders) || 0,
        totalSales: Number(branch.totalSales) || 0,
      }));

      return {
        timeRange,
        products,
        branches,
        summary: {
          totalProducts: products.length,
          totalBranches: branches.length,
          totalRevenue: products.reduce((sum, p) => sum + p.totalRevenue, 0),
          totalQuantitySold: products.reduce(
            (sum, p) => sum + p.totalQuantitySold,
            0,
          ),
        },
      };
    } catch (error) {
      console.error('Error in getBranchProductComparison:', error);
      throw new Error('Failed to fetch branch product comparison data');
    }
  }

  /**
   * Returns a time series of total sales per branch per month,
   * suitable for a combined bar/line chart (bar: branch sales, line: total sales).
   */
  async getBranchMonthlySalesComparison(tenantId: string, months: number = 6) {
    // Calculate date range
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // Get all branches for this tenant
    const branches = await this.prisma.branch.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });

    // Get sales per branch per month
    const salesData = await this.prisma.$queryRaw`
      SELECT
        b.id as "branchId",
        b.name as "branchName",
        TO_CHAR(s."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM') as month,
        COALESCE(SUM(s.total), 0) as sales
      FROM "Branch" b
      LEFT JOIN "Sale" s ON b.id = s."branchId"
        AND s."tenantId" = ${tenantId}
        AND s."createdAt" >= ${startDate}
      WHERE b."tenantId" = ${tenantId}
      GROUP BY b.id, b.name, month
      ORDER BY month ASC, b.name ASC
    `;

    // Get total sales per month (all branches combined)
    const totalSalesData = await this.prisma.$queryRaw`
      SELECT
        TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM') as month,
        COALESCE(SUM(total), 0) as sales
      FROM "Sale"
      WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= ${startDate}
      GROUP BY month
      ORDER BY month ASC
    `;

    // Prepare months array (ensure all months are present)
    const monthsArr: string[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsArr.push(d.toISOString().slice(0, 7));
    }

    // Prepare branch sales per month
    const branchMap: Record<string, { branchId: string; branchName: string; sales: Record<string, number> }> = {};
    for (const branch of branches) {
      branchMap[branch.id] = {
        branchId: branch.id,
        branchName: branch.name,
        sales: {},
      };
      for (const m of monthsArr) {
        branchMap[branch.id].sales[m] = 0;
      }
    }
    for (const row of salesData as any[]) {
      if (row.branchId && row.month) {
        branchMap[row.branchId].sales[row.month] = parseFloat(row.sales) || 0;
      }
    }

    // Prepare total sales per month
    const totalSalesMap: Record<string, number> = {};
    for (const m of monthsArr) totalSalesMap[m] = 0;
    for (const row of totalSalesData as any[]) {
      if (row.month) totalSalesMap[row.month] = parseFloat(row.sales) || 0;
    }

    // Format for chart: { months: [...], branches: [{branchName, data: [...]}, ...], total: [...] }
    const chartData = {
      months: monthsArr,
      branches: Object.values(branchMap).map((b) => ({
        branchId: b.branchId,
        branchName: b.branchName,
        data: monthsArr.map((m) => b.sales[m] || 0),
      })),
      total: monthsArr.map((m) => totalSalesMap[m] || 0),
    };

    return chartData;
  }
}
