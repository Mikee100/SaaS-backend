import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DataService } from './data.service';

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }>;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area';
  title: string;
  data: ChartData;
  options?: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    scales?: any;
  };
}

@Injectable()
export class ChartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataService: DataService,
  ) {}

  async generateSalesChart(
    tenantId: string,
    branchId: string,
    chartType: 'line' | 'bar' | 'area' = 'line',
    period: '7days' | '30days' | '90days' | '1year' = '30days',
  ): Promise<ChartConfig> {
    const salesData = await this.dataService.getSalesData(tenantId, branchId);
    
    let labels: string[] = [];
    let data: number[] = [];

    if (period === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const dailySales: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date(sevenDaysAgo);
        date.setDate(date.getDate() + i);
        const dateKey = date.toLocaleDateString('en-US', { weekday: 'short' });
        dailySales[dateKey] = 0;
      }

      const sales = await this.prisma.sale.findMany({
        where: {
          tenantId,
          branchId,
          createdAt: { gte: sevenDaysAgo },
        },
        select: { total: true, createdAt: true },
      });

      sales.forEach((sale) => {
        const date = new Date(sale.createdAt);
        const dateKey = date.toLocaleDateString('en-US', { weekday: 'short' });
        dailySales[dateKey] = (dailySales[dateKey] || 0) + sale.total;
      });

      labels = Object.keys(dailySales);
      data = Object.values(dailySales);
    } else if (period === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const weeklySales: Record<string, number> = {};
      for (let i = 0; i < 4; i++) {
        const weekStart = new Date(thirtyDaysAgo);
        weekStart.setDate(weekStart.getDate() + i * 7);
        const weekKey = `Week ${i + 1}`;
        weeklySales[weekKey] = 0;
      }

      const sales = await this.prisma.sale.findMany({
        where: {
          tenantId,
          branchId,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { total: true, createdAt: true },
      });

      sales.forEach((sale) => {
        const date = new Date(sale.createdAt);
        const daysDiff = Math.floor((date.getTime() - thirtyDaysAgo.getTime()) / (1000 * 60 * 60 * 24));
        const weekNum = Math.floor(daysDiff / 7) + 1;
        const weekKey = `Week ${weekNum}`;
        if (weeklySales[weekKey] !== undefined) {
          weeklySales[weekKey] += sale.total;
        }
      });

      labels = Object.keys(weeklySales);
      data = Object.values(weeklySales);
    } else if (period === '90days') {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const monthlySales: Record<string, number> = {};
      for (let i = 0; i < 3; i++) {
        const monthStart = new Date(ninetyDaysAgo);
        monthStart.setMonth(monthStart.getMonth() + i);
        const monthKey = monthStart.toLocaleDateString('en-US', { month: 'short' });
        monthlySales[monthKey] = 0;
      }

      const sales = await this.prisma.sale.findMany({
        where: {
          tenantId,
          branchId,
          createdAt: { gte: ninetyDaysAgo },
        },
        select: { total: true, createdAt: true },
      });

      sales.forEach((sale) => {
        const date = new Date(sale.createdAt);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
        monthlySales[monthKey] = (monthlySales[monthKey] || 0) + sale.total;
      });

      labels = Object.keys(monthlySales);
      data = Object.values(monthlySales);
    } else {
      // 1 year - monthly breakdown
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const monthlySales: Record<string, number> = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      monthNames.forEach((month) => {
        monthlySales[month] = 0;
      });

      const sales = await this.prisma.sale.findMany({
        where: {
          tenantId,
          branchId,
          createdAt: { gte: oneYearAgo },
        },
        select: { total: true, createdAt: true },
      });

      sales.forEach((sale) => {
        const date = new Date(sale.createdAt);
        const monthIndex = date.getMonth();
        const monthKey = monthNames[monthIndex];
        monthlySales[monthKey] = (monthlySales[monthKey] || 0) + sale.total;
      });

      labels = Object.keys(monthlySales);
      data = Object.values(monthlySales);
    }

    return {
      type: chartType,
      title: `Sales Revenue - ${period}`,
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue',
            data,
            backgroundColor: chartType === 'bar' ? 'rgba(59, 130, 246, 0.5)' : undefined,
            borderColor: 'rgba(59, 130, 246, 1)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
      },
    };
  }

  async generateProductPerformanceChart(
    tenantId: string,
    branchId: string,
    chartType: 'bar' | 'pie' | 'doughnut' = 'bar',
    limit: number = 10,
  ): Promise<ChartConfig> {
    const productData = await this.dataService.getProductData(tenantId, branchId);
    const topProducts = productData.topProducts.slice(0, limit);

    const labels = topProducts.map((p: any) => p.name);
    const data = topProducts.map((p: any) => p.revenue || 0);

    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(236, 72, 153, 0.8)',
      'rgba(20, 184, 166, 0.8)',
      'rgba(251, 146, 60, 0.8)',
      'rgba(99, 102, 241, 0.8)',
      'rgba(168, 85, 247, 0.8)',
    ];

    return {
      type: chartType,
      title: `Top ${limit} Products by Revenue`,
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue',
            data,
            backgroundColor: chartType === 'bar' ? colors[0] : colors.slice(0, limit),
            borderColor: chartType === 'bar' ? 'rgba(59, 130, 246, 1)' : undefined,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
      },
    };
  }

  async generateInventoryChart(
    tenantId: string,
    branchId: string,
    chartType: 'bar' | 'pie' = 'bar',
  ): Promise<ChartConfig> {
    const inventoryData = await this.dataService.getInventoryData(tenantId, branchId);
    const items = inventoryData.items.slice(0, 15);

    const labels = items.map((item: any) => item.name);
    const data = items.map((item: any) => item.quantity);

    return {
      type: chartType,
      title: 'Inventory Stock Levels',
      data: {
        labels,
        datasets: [
          {
            label: 'Stock Quantity',
            data,
            backgroundColor: items.map((item: any) => {
              if (item.status === 'out') return 'rgba(239, 68, 68, 0.8)';
              if (item.status === 'low') return 'rgba(245, 158, 11, 0.8)';
              return 'rgba(16, 185, 129, 0.8)';
            }),
            borderColor: items.map((item: any) => {
              if (item.status === 'out') return 'rgba(239, 68, 68, 1)';
              if (item.status === 'low') return 'rgba(245, 158, 11, 1)';
              return 'rgba(16, 185, 129, 1)';
            }),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
      },
    };
  }

  async generateCustomerChart(
    tenantId: string,
    branchId: string,
    chartType: 'bar' | 'pie' | 'doughnut' = 'bar',
    limit: number = 10,
  ): Promise<ChartConfig> {
    const customerData = await this.dataService.getCustomerData(tenantId, branchId);
    const topCustomers = customerData.topCustomers.slice(0, limit);

    const labels = topCustomers.map((c: any) => c.name);
    const data = topCustomers.map((c: any) => c.revenue || 0);

    return {
      type: chartType,
      title: `Top ${limit} Customers by Revenue`,
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue',
            data,
            backgroundColor: 'rgba(139, 92, 246, 0.8)',
            borderColor: 'rgba(139, 92, 246, 1)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
      },
    };
  }
}

