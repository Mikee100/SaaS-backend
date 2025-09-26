import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  @Get()
  getHello(): string {
    return 'Hello World!';
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('dashboard/stats')
  async getDashboardStats(@Req() req: any) {
    const tenantId = req.user.tenantId;

    try {
      // Get total sales count
      const totalSales = await this.prisma.sale.count({
        where: { tenantId },
      });

      // Get total products count
      const totalProducts = await this.prisma.product.count({
        where: { tenantId },
      });

      // Get total revenue (sum of all sales)
      const salesData = await this.prisma.sale.findMany({
        where: { tenantId },
        select: { total: true },
      });
      const totalRevenue = salesData.reduce((sum, sale) => sum + sale.total, 0);

      // Get monthly revenue (current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const monthlySales = await this.prisma.sale.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        select: { total: true },
      });
      const monthlyRevenue = monthlySales.reduce(
        (sum, sale) => sum + sale.total,
        0,
      );

      // Get unique customers count (based on customer names in sales)
      const uniqueCustomers = await this.prisma.sale.findMany({
        where: {
          tenantId,
          customerName: { not: null },
        },
        select: { customerName: true },
        distinct: ['customerName'],
      });
      const totalCustomers = uniqueCustomers.length;

      // Get recent activity
      const recentSales = await this.prisma.sale.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          User: {
            select: { name: true },
          },
        },
      });

      const recentProducts = await this.prisma.product.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });

      return {
        totalSales,
        totalProducts,
        totalCustomers,
        totalRevenue,
        monthlyRevenue,
        recentActivity: {
          sales: recentSales.map((sale) => ({
            id: sale.id,
            amount: sale.total,
            customer: sale.customerName || 'Anonymous',
            date: sale.createdAt,
            user: sale.User.name,
          })),
          products: recentProducts.map((product) => ({
            id: product.id,
            name: product.name,
            price: product.price,
            date: product.createdAt,
          })),
        },
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalSales: 0,
        totalProducts: 0,
        totalCustomers: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        recentActivity: {
          sales: [],
          products: [],
        },
      };
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('usage/stats')
  async getUsageStats(@Req() req: any) {
    const tenantId = req.user.tenantId;

    try {
      // Get user count for this tenant
      const userCount = await this.prisma.userRole.count({
        where: { tenantId },
      });

      // Get product count for this tenant
      const productCount = await this.prisma.product.count({
        where: { tenantId },
      });

      // Get sales count for current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const monthlySales = await this.prisma.sale.count({
        where: {
          tenantId,
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      });

      return {
        users: {
          current: userCount,
          limit: 10, // This should come from the plan
        },
        products: {
          current: productCount,
          limit: 50, // This should come from the plan
        },
        sales: {
          current: monthlySales,
          limit: 100, // This should come from the plan
        },
      };
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      return {
        users: { current: 1, limit: 10 },
        products: { current: 0, limit: 50 },
        sales: { current: 0, limit: 100 },
      };
    }
  }
}
