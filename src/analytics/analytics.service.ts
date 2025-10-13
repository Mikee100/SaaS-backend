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
      topProducts,
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

      // Top selling products
      this.getTopProducts(tenantId, 5),

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
      topProducts,
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
      const summaryResponse = await axios.post('http://localhost:5001/generate_summary', {
        metrics: {
          totalSales,
          totalRevenue: totalRevenue._sum.total || 0,
          avgSaleValue: totalSales > 0 ? (totalRevenue._sum.total || 0) / totalSales : 0,
          topProducts: topProducts.map(p => ({ name: p.name })),
          customerRetention: { retentionRate: parseFloat(retentionRate.toFixed(2)) },
          forecastGrowth: forecastData.forecast_sales?.length > 1 ?
            ((forecastData.forecast_sales[forecastData.forecast_sales.length - 1] - forecastData.forecast_sales[0]) / forecastData.forecast_sales[0]) * 100 : 0,
        },
      });
      aiSummary = summaryResponse.data.summary;
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
    }

    return {
      ...analyticsData,
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
      period === 'day' ? 'day' : period === 'week' ? 'week' : period === 'month' ? 'month' : 'year';

    const date = new Date();
    if (period === 'day') date.setDate(date.getDate() - 7);
    else if (period === 'week')
      date.setDate(date.getDate() - 28); // 4 weeks
    else if (period === 'month') date.setMonth(date.getMonth() - 6); // 6 months
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
      `
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
      `
    );

    type HistoricalData = { month: string; sales_count: bigint; total_revenue: string };

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
        const growthFactor = 1 + (i * 0.05) + (Math.random() * 0.1 - 0.05); // 5% monthly growth with variance
        forecastSales.push(Math.round(baseSales * growthFactor));
      }

      return {
        forecast_months: forecastMonths,
        forecast_sales: forecastSales,
      };
    }

    // Calculate trend and seasonality from historical data
    const salesData = (historicalSales as HistoricalData[]).map(item => ({
      month: item.month,
      sales: Number(item.sales_count),
      revenue: parseFloat(item.total_revenue),
    }));

    // Simple linear regression for trend
    const n = salesData.length;
    const sumX = salesData.reduce((sum, _, index) => sum + index, 0);
    const sumY = salesData.reduce((sum, item) => sum + item.sales, 0);
    const sumXY = salesData.reduce((sum, item, index) => sum + index * item.sales, 0);
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
      const finalPrediction = Math.max(1, Math.round(predictedSales * randomFactor));

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
        `
      );

      type SalesData = { date: string; sales_count: bigint; total_revenue: string };
      const sales = (salesData as SalesData[]).map(item => ({
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
        `
      );

      type CustomerData = { name: string; count: bigint; total: string; last_purchase: Date };
      const customers = (customerData as CustomerData[]).map(item => ({
        name: item.name,
        total: parseFloat(item.total),
        count: Number(item.count),
        last_purchase: item.last_purchase.toISOString().split('T')[0],
      }));

      if (customers.length < 2) {
        return []; // Not enough data for segmentation
      }

      const response = await axios.post('http://localhost:5001/customer_segments', {
        customers,
      });

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
        `
      );

      type CustomerData = { name: string; count: bigint; total: string; last_purchase: Date };
      const customers = (customerData as CustomerData[]).map(item => ({
        name: item.name,
        total: parseFloat(item.total),
        count: Number(item.count),
        last_purchase: item.last_purchase.toISOString().split('T')[0],
      }));

      if (customers.length < 2) {
        return []; // Not enough data for churn prediction
      }

      const response = await axios.post('http://localhost:5001/churn_prediction', {
        customers,
      });

      return response.data || [];
    } catch (error) {
      console.error('Failed to get churn prediction data:', error);
      return [];
    }
  }
}
