import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class DataService {
  constructor(private readonly prisma: PrismaService) {}

  async getBusinessData(tenantId: string, branchId: string): Promise<any> {
    try {
      const [sales, inventory, customers, products] = await Promise.all([
        this.getSalesData(tenantId, branchId),
        this.getInventoryData(tenantId, branchId),
        this.getCustomerData(tenantId, branchId),
        this.getProductData(tenantId, branchId),
      ]);

      return {
        sales,
        inventory,
        customers,
        products,
        summary: {
          totalRevenue: sales.totalRevenue,
          totalSales: sales.totalSales,
          lowStockItems: inventory.lowStockCount,
          totalCustomers: customers.totalCustomers,
          totalProducts: products.totalProducts,
        },
      };
    } catch (error) {
      console.error('Error getting business data:', error);
      return {
        sales: {},
        inventory: {},
        customers: {},
        products: {},
        summary: {},
      };
    }
  }

  async getSalesDataForMonth(
    tenantId: string,
    branchId: string,
    year: number,
    month: number, // 0-11 (0 = January, 11 = December)
  ): Promise<any> {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const [sales, aggregates] = await Promise.all([
      this.prisma.sale.findMany({
        where: {
          tenantId,
          branchId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          total: true,
          createdAt: true,
          customerName: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          branchId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { total: true },
        _count: true,
        _avg: { total: true },
        _max: { total: true },
        _min: { total: true },
      }),
    ]);

    const totalRevenue = aggregates._sum.total || 0;
    const totalSales = aggregates._count;
    const averageSale = aggregates._avg?.total || 0;
    const highestSale = aggregates._max?.total || 0;
    const lowestSale = aggregates._min?.total || 0;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[month];

    return {
      month: monthName,
      year,
      totalRevenue,
      totalSales,
      averageSale,
      highestSale,
      lowestSale,
      sales,
    };
  }

  async getSalesData(tenantId: string, branchId: string): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const [recentSales, totalSales, todaySales, weeklySales, allSales] = await Promise.all([
      this.prisma.sale.findMany({
        where: {
          tenantId,
          branchId,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          total: true,
          createdAt: true,
          customerName: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.sale.aggregate({
        where: { tenantId, branchId },
        _sum: { total: true },
        _count: true,
        _avg: { total: true },
        _max: { total: true },
        _min: { total: true },
      }),
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          branchId,
          createdAt: { gte: today },
        },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          branchId,
          createdAt: { gte: sevenDaysAgo },
        },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.sale.findMany({
        where: {
          tenantId,
          branchId,
          createdAt: { gte: oneYearAgo },
        },
        select: {
          total: true,
          createdAt: true,
        },
      }),
    ]);

    const totalRevenue = totalSales._sum.total || 0;
    const recentRevenue = recentSales.reduce((sum, sale) => sum + sale.total, 0);
    const averageSale = totalSales._avg?.total || 0;
    const highestSale = totalSales._max?.total || 0;
    const lowestSale = totalSales._min?.total || 0;

    // Calculate trend
    const midpoint = Math.floor(recentSales.length / 2);
    const firstHalf = recentSales.slice(0, midpoint);
    const secondHalf = recentSales.slice(midpoint);
    const firstHalfTotal = firstHalf.reduce((sum, sale) => sum + sale.total, 0);
    const secondHalfTotal = secondHalf.reduce((sum, sale) => sum + sale.total, 0);
    const trend = secondHalfTotal > firstHalfTotal ? 'up' : secondHalfTotal < firstHalfTotal ? 'down' : 'stable';
    const trendPercentage = firstHalfTotal > 0 
      ? Math.round(((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100) 
      : 0;

    // Daily average
    const dailyAverage = recentSales.length > 0 ? recentRevenue / 30 : 0;

    // Calculate monthly sales breakdown
    const monthlySales: Record<string, { revenue: number; count: number; month: string; year: number }> = {};
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    allSales.forEach((sale) => {
      const date = new Date(sale.createdAt);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${month}`;
      const monthName = `${monthNames[month]} ${year}`;

      if (!monthlySales[key]) {
        monthlySales[key] = {
          revenue: 0,
          count: 0,
          month: monthName,
          year,
        };
      }
      monthlySales[key].revenue += sale.total;
      monthlySales[key].count += 1;
    });

    // Convert to array and sort by revenue
    const monthlySalesArray = Object.values(monthlySales)
      .sort((a, b) => b.revenue - a.revenue);

    // Get current year monthly breakdown
    const currentYear = new Date().getFullYear();
    const currentYearMonthly = Object.entries(monthlySales)
      .filter(([key]) => key.startsWith(currentYear.toString()))
      .map(([key, data]) => ({
        ...data,
        monthNumber: parseInt(key.split('-')[1]),
      }))
      .sort((a, b) => a.monthNumber - b.monthNumber);

    return {
      totalRevenue,
      totalSales: totalSales._count,
      recentRevenue,
      averageSale,
      highestSale,
      lowestSale,
      trend,
      trendPercentage,
      recentSalesCount: recentSales.length,
      todayRevenue: todaySales._sum.total || 0,
      todaySalesCount: todaySales._count || 0,
      weeklyRevenue: weeklySales._sum.total || 0,
      weeklySalesCount: weeklySales._count || 0,
      dailyAverage,
      monthlySales: monthlySalesArray,
      currentYearMonthly,
      bestMonth: monthlySalesArray[0] || null,
    };
  }

  async getInventoryData(tenantId: string, branchId: string): Promise<any> {
    const inventory = await this.prisma.inventory.findMany({
      where: { tenantId, branchId },
      include: {
        product: {
          select: {
            name: true,
            price: true,
          },
        },
      },
    });

    const lowStock = inventory.filter((item) => item.quantity <= item.minStock);

    const totalValue = inventory.reduce(
      (sum, item) => sum + item.quantity * (item.product.price || 0),
      0,
    );

    return {
      totalItems: inventory.length,
      lowStockCount: lowStock.length,
      outOfStockCount: inventory.filter((item) => item.quantity === 0).length,
      totalValue,
      items: inventory.slice(0, 20).map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        minStock: item.minStock,
        status: item.quantity <= item.minStock ? 'low' : item.quantity === 0 ? 'out' : 'ok',
      })),
    };
  }

  async getCustomerData(tenantId: string, branchId: string): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [topCustomers, activeCustomers, allCustomers] = await Promise.all([
      this.prisma.sale.groupBy({
        by: ['customerName'],
        where: {
          tenantId,
          branchId,
          customerName: { not: null },
        },
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }),
      this.prisma.sale.groupBy({
        by: ['customerName'],
        where: {
          tenantId,
          branchId,
          customerName: { not: null },
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: true,
      }),
      this.prisma.sale.groupBy({
        by: ['customerName'],
        where: {
          tenantId,
          branchId,
          customerName: { not: null },
        },
        _count: true,
      }),
    ]);

    const activeCustomerCount = new Set(
      activeCustomers.map((c) => c.customerName!),
    ).size;
    const totalCustomers = allCustomers.length;

    return {
      totalCustomers,
      activeCustomers: activeCustomerCount,
      topCustomers: topCustomers.map((c) => ({
        name: c.customerName,
        revenue: c._sum.total || 0,
        purchaseCount: c._count,
      })),
      retentionRate:
        totalCustomers > 0
          ? Math.round((activeCustomerCount / totalCustomers) * 100)
          : 0,
    };
  }

  async getProductData(tenantId: string, branchId: string): Promise<any> {
    const [products, topProducts, allProducts] = await Promise.all([
      this.prisma.product.count({
        where: { tenantId },
      }),
      this.prisma.saleItem.findMany({
        where: {
          sale: {
            tenantId,
            branchId,
          },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              description: true,
            },
          },
        },
        take: 500,
      }),
      this.prisma.product.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          price: true,
          description: true,
        },
        take: 50,
      }),
    ]);

    const productSales = topProducts.reduce(
      (acc, item) => {
        const productName = item.product.name;
        if (!acc[productName]) {
          acc[productName] = {
            name: productName,
            quantity: 0,
            revenue: 0,
            salesCount: 0,
            averagePrice: 0,
            price: item.product.price || 0,
            description: item.product.description,
          };
        }
        acc[productName].quantity += item.quantity;
        acc[productName].revenue += item.quantity * item.price;
        acc[productName].salesCount += 1;
        acc[productName].averagePrice = acc[productName].revenue / acc[productName].quantity;
        return acc;
      },
      {} as Record<string, any>,
    );

    const topProductsList = Object.values(productSales)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 20);

    // Get product performance metrics
    const totalProductRevenue = topProductsList.reduce((sum: number, p: any) => sum + (p.revenue || 0), 0);
    const averageProductRevenue = topProductsList.length > 0 ? totalProductRevenue / topProductsList.length : 0;

    return {
      totalProducts: products,
      topProducts: topProductsList,
      allProducts: allProducts.slice(0, 30),
      metrics: {
        totalProductRevenue,
        averageProductRevenue,
        bestPerformer: topProductsList[0] || null,
      },
    };
  }

  async getTenantInfo(tenantId: string): Promise<any> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          name: true,
          contactEmail: true,
          contactPhone: true,
          address: true,
          city: true,
          country: true,
          businessType: true,
          website: true,
          foundedYear: true,
          employeeCount: true,
        },
      });

      return tenant || {};
    } catch (error) {
      console.error('Error getting tenant info:', error);
      return {};
    }
  }

  async getBranchInfo(tenantId: string, branchId: string): Promise<any> {
    try {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: branchId,
          tenantId,
        },
        select: {
          name: true,
          address: true,
          city: true,
          country: true,
          phone: true,
          email: true,
          isMainBranch: true,
        },
      });

      return branch || {};
    } catch (error) {
      console.error('Error getting branch info:', error);
      return {};
    }
  }
}


