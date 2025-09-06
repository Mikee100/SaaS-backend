import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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
      inventoryAnalytics
    ] = await Promise.all([
      // Total Sales (count of sales in the last 30 days)
      this.prisma.sale.count({
        where: {
          tenantId,
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      
      // Total Revenue (sum of sales in the last 30 days)
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          createdAt: { gte: thirtyDaysAgo }
        },
        _sum: { total: true }
      }),
      
      // Total Products
      this.prisma.product.count({
        where: { tenantId }
      }),
      
      // Total Customers (unique customer names in sales)
      this.prisma.sale.groupBy({
        by: ['customerPhone'],
        where: { 
          tenantId,
          customerPhone: { not: null }
        },
        _count: true
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
      this.getInventoryAnalytics(tenantId)
    ]);

    // Calculate customer retention (simplified)
    const repeatCustomers = await this.getRepeatCustomers(tenantId);
    const totalUniqueCustomers = totalCustomers.length;
    const retentionRate = totalUniqueCustomers > 0 
      ? (repeatCustomers / totalUniqueCustomers) * 100 
      : 0;

    // Calculate performance metrics
    const performanceMetrics = await this.calculatePerformanceMetrics(tenantId);

    return {
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
        retentionRate: parseFloat(retentionRate.toFixed(2))
      },
      inventoryAnalytics,
      performanceMetrics,
      realTimeData: await this.getRealTimeData(tenantId)
    };
  }

  private async getSalesByTimePeriod(tenantId: string, period: 'day' | 'week' | 'month') {
    const now = new Date();
    const format = period === 'day' ? 'YYYY-MM-DD' : 
                  period === 'week' ? '\'Week\' WW' : 'YYYY-MM';
    
    const groupBy = period === 'day' ? 'day' : 
                   period === 'week' ? 'week' : 'month';
    
    const date = new Date();
    if (period === 'day') date.setDate(date.getDate() - 7);
    else if (period === 'week') date.setDate(date.getDate() - 28); // 4 weeks
    else date.setMonth(date.getMonth() - 6); // 6 months

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
    return (sales as SalesData[]).reduce<Record<string, number>>((acc, curr) => ({
      ...acc,
      [curr.period]: parseFloat(curr.total)
    }), {});
  }

  private async getTopProducts(tenantId: string, limit: number) {
    const topProducts = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: { tenantId }
      },
      _sum: {
        quantity: true,
        price: true
      },
      _count: true,
      orderBy: {
        _sum: {
          price: 'desc'
        }
      },
      take: limit
    });

    // Get product details
    const productDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId }
        });
        
        const revenue = item._sum.price ? parseFloat(item._sum.price.toString()) : 0;
        const quantity = item._sum.quantity || 0;
        const cost = product ? (product.cost * quantity) : 0;
        const margin = revenue > 0 ? (revenue - cost) / revenue : 0;
        
        return {
          name: product?.name || 'Unknown Product',
          sales: item._sum.quantity,
          revenue: revenue,
          margin: parseFloat(margin.toFixed(2)),
          cost: parseFloat(cost.toFixed(2))
        };
      })
    );

    return productDetails;
  }

  private async getInventoryAnalytics(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId },
      include: { inventory: true }
    });

    const lowStockThreshold = 10; // Items below this are considered low stock
    const overstockThreshold = 100; // Items above this are considered overstocked
    
    let lowStockItems = 0;
    let overstockItems = 0;
    let totalStockValue = 0;
    let totalCost = 0;
    
    // Calculate inventory metrics
    products.forEach(product => {
      const stock = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
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
    const inventoryTurnover = avgInventoryValue > 0 
      ? cogs / avgInventoryValue 
      : 0;

    // Calculate stockout rate (simplified)
    const stockoutRate = products.length > 0 
      ? products.filter(p => p.stock <= 0).length / products.length 
      : 0;

    return {
      lowStockItems,
      overstockItems,
      inventoryTurnover: parseFloat(inventoryTurnover.toFixed(2)),
      stockoutRate: parseFloat(stockoutRate.toFixed(2)),
      totalStockValue: parseFloat(totalStockValue.toFixed(2))
    };
  }

  private async getCostOfGoodsSold(tenantId: string, days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const sales = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId,
          createdAt: { gte: date }
        }
      },
      include: {
        product: true
      }
    });

    return sales.reduce((sum, item) => {
      const cost = item.product?.cost || 0;
      return sum + (cost * item.quantity);
    }, 0);
  }

  private async getRepeatCustomers(tenantId: string) {
    const repeatCustomers = await this.prisma.$queryRaw`
      SELECT "customerPhone", COUNT(*) as purchase_count
      FROM "Sale"
      WHERE "tenantId" = ${tenantId}
        AND "customerPhone" IS NOT NULL
      GROUP BY "customerPhone"
      HAVING COUNT(*) > 1
    `;
    
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
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: { total: true },
      _count: true
    });

    // Get customer count
    const customerCount = await this.prisma.sale.groupBy({
      by: ['customerPhone'],
      where: { 
        tenantId,
        customerPhone: { not: null },
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: true
    });

    const totalRevenue = salesData._sum.total || 0;
    const totalSales = salesData._count;
    const totalCustomers = customerCount.length;
    
    // Simplified metrics - in a real app, these would be more accurate
    const customerLifetimeValue = totalCustomers > 0 
      ? (totalRevenue * 3) / totalCustomers // Assuming 3x multiplier for lifetime value
      : 0;
      
    const customerAcquisitionCost = totalCustomers > 0 
      ? 1000 / totalCustomers // Assuming $1000 marketing spend
      : 0;
      
    const returnOnInvestment = customerAcquisitionCost > 0
      ? (customerLifetimeValue - customerAcquisitionCost) / customerAcquisitionCost
      : 0;
      
    // NPS is typically -100 to 100, we'll simulate a reasonable value
    const netPromoterScore = 45; // This would come from customer surveys in a real app

    return {
      customerLifetimeValue: parseFloat(customerLifetimeValue.toFixed(2)),
      customerAcquisitionCost: parseFloat(customerAcquisitionCost.toFixed(2)),
      returnOnInvestment: parseFloat(returnOnInvestment.toFixed(2)),
      netPromoterScore: Math.min(100, Math.max(-100, netPromoterScore))
    };
  }

  private async getRealTimeData(tenantId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get today's sales count
    const salesToday = await this.prisma.sale.count({
      where: {
        tenantId,
        createdAt: { gte: today }
      }
    });
    
    // Get today's revenue
    const revenueToday = await this.prisma.sale.aggregate({
      where: {
        tenantId,
        createdAt: { gte: today }
      },
      _sum: { total: true }
    });

    // Get active users (users who made sales today)
    const activeUsers = await this.prisma.sale.groupBy({
      by: ['userId'],
      where: {
        tenantId,
        createdAt: { gte: today }
      }
    });

    // Get active sales (sales in progress - this is a simplified version)
    const activeSales = await this.prisma.sale.count({
      where: {
        tenantId,
        createdAt: { gte: new Date(Date.now() - 3600000) } // Sales in the last hour
      }
    });

    return {
      currentUsers: activeUsers.length,
      activeSales,
      revenueToday: revenueToday._sum.total || 0,
      ordersInProgress: salesToday,
      averageSessionDuration: 8.5, // Minutes - would come from analytics in a real app
      bounceRate: 0.32 // Would come from analytics in a real app
    };
  }
}
