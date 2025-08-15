import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';


  
export interface SalesAnalytics {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  salesTrend: Array<{ date: string; amount: number }>;
  topProducts: Array<{ id: string; name: string; revenue: number; quantity: number; cost: number; margin: number }>;
}

export interface InventoryAnalytics {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
}

@Injectable()
export class AnalyticsService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async getSalesAnalytics(tenantId: string): Promise<SalesAnalytics> {
    const sales = await this.prisma.sale.findMany({
      where: { tenantId },
      include: {
        items: {
          include: {
            product: true // Select all fields, including 'cost' if present in schema
          }
        }
      }
    });
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Sales trend (last 30 days)
    const salesTrend = Array.from({ length: 30 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const daySales = sales.filter(sale => sale.createdAt.toISOString().split('T')[0] === dateStr);
      return {
        date: dateStr,
        amount: daySales.reduce((sum, sale) => sum + sale.total, 0),
      };
    });

    // Top products by revenue, cost, and margin
    const productRevenue = new Map<string, { id: string; name: string; revenue: number; quantity: number; cost: number; margin: number }>();
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productRevenue.get(item.productId) || {
          id: item.productId,
          name: item.product.name,
          revenue: 0,
          quantity: 0,
          cost: item.product.cost ?? 0,
          margin: 0
        };
        const revenue = existing.revenue + (item.quantity * item.price);
        const quantity = existing.quantity + item.quantity;
        const cost = item.product.cost ?? 0;
        // Margin = (revenue - cost * quantity) / revenue
        const margin = revenue > 0 ? (revenue - cost * quantity) / revenue : 0;
        productRevenue.set(item.productId, {
          ...existing,
          revenue,
          quantity,
          cost,
          margin,
        });
      });
    });
    const topProducts = Array.from(productRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalSales,
      totalRevenue,
      averageOrderValue,
      salesTrend,
      topProducts,
    };
  }

  async getInventoryAnalytics(tenantId: string): Promise<InventoryAnalytics> {
    const products = await this.prisma.product.findMany({
      where: { tenantId },
    });
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, product) => sum + (product.price * (product.stock || 0)), 0);
    const lowStockItems = products.filter(p => (p.stock || 0) <= 10 && (p.stock || 0) > 0).length;
    const outOfStockItems = products.filter(p => (p.stock || 0) <= 0).length;
    return {
      totalProducts,
      totalValue,
      lowStockItems,
      outOfStockItems,
    };
  }
}
  