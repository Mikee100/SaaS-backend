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
    borderWidth?: number;
    tension?: number;
    fill?: boolean;
    pointBackgroundColor?: string;
    pointBorderColor?: string;
    pointBorderWidth?: number;
    pointRadius?: number;
    pointHoverRadius?: number;
    borderRadius?: number;
    borderSkipped?: boolean;
  }>;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area';
  title: string;
  data: ChartData;
  options?: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    plugins?: any;
    scales?: any;
  };
}

type ProductMetric = {
  name: string;
  revenue: number;
};

type InventoryMetric = {
  name: string;
  quantity: number;
  status: string;
};

@Injectable()
export class ChartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataService: DataService,
  ) {}

  private asObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : null;
  }

  private asNumber(value: unknown, fallback: number = 0): number {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : fallback;
  }

  private asString(value: unknown, fallback: string = ''): string {
    return typeof value === 'string' ? value : fallback;
  }

  private getTopProducts(data: unknown): ProductMetric[] {
    const obj = this.asObject(data);
    const list = obj?.topProducts;
    if (!Array.isArray(list)) {
      return [];
    }

    return list.map((item) => {
      const row = this.asObject(item);
      return {
        name: this.asString(row?.name, 'Unnamed product'),
        revenue: this.asNumber(row?.revenue, 0),
      };
    });
  }

  private getInventoryItems(data: unknown): InventoryMetric[] {
    const obj = this.asObject(data);
    const list = obj?.items;
    if (!Array.isArray(list)) {
      return [];
    }

    return list.map((item) => {
      const row = this.asObject(item);
      return {
        name: this.asString(row?.name, 'Unnamed item'),
        quantity: this.asNumber(row?.quantity, 0),
        status: this.asString(row?.status, 'ok'),
      };
    });
  }

  private getTopCustomers(data: unknown): ProductMetric[] {
    const obj = this.asObject(data);
    const list = obj?.topCustomers;
    if (!Array.isArray(list)) {
      return [];
    }

    return list.map((item) => {
      const row = this.asObject(item);
      return {
        name: this.asString(row?.name, 'Unnamed customer'),
        revenue: this.asNumber(row?.revenue, 0),
      };
    });
  }

  async generateSalesChart(
    tenantId: string,
    branchId: string,
    chartType: 'line' | 'bar' | 'area' = 'line',
    period: '7days' | '30days' | '90days' | '1year' = '30days',
  ): Promise<ChartConfig> {
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
        const daysDiff = Math.floor(
          (date.getTime() - thirtyDaysAgo.getTime()) / (1000 * 60 * 60 * 24),
        );
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
        const monthKey = monthStart.toLocaleDateString('en-US', {
          month: 'short',
        });
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
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];

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
            backgroundColor:
              chartType === 'bar'
                ? 'rgba(59, 130, 246, 0.8)'
                : 'rgba(59, 130, 246, 0.15)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2,
            tension: 0.4, // Smooth curved lines
            fill: chartType === 'area' || chartType === 'line', // Fill under the line
            pointBackgroundColor: '#ffffff',
            pointBorderColor: 'rgba(59, 130, 246, 1)',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.9)',
            padding: 12,
            titleFont: { size: 13, family: "'Inter', sans-serif" },
            bodyFont: { size: 14, family: "'Inter', sans-serif" },
            cornerRadius: 8,
            displayColors: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.04)', drawBorder: false },
            border: { display: false },
            ticks: {
              font: { family: "'Inter', sans-serif", size: 11 },
              padding: 10,
              color: '#6B7280',
            },
          },
          x: {
            grid: { display: false, drawBorder: false },
            border: { display: false },
            ticks: {
              font: { family: "'Inter', sans-serif", size: 11 },
              color: '#6B7280',
            },
          },
        },
      },
    };
  }

  async generateProductPerformanceChart(
    tenantId: string,
    branchId: string,
    chartType: 'bar' | 'pie' | 'doughnut' = 'bar',
    limit: number = 10,
  ): Promise<ChartConfig> {
    const rawProductData: unknown = await this.dataService.getProductData(
      tenantId,
      branchId,
    );
    const topProducts = this.getTopProducts(rawProductData).slice(0, limit);

    const labels = topProducts.map((p) => p.name);
    const data = topProducts.map((p) => p.revenue);

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
            backgroundColor:
              chartType === 'bar' ? colors[0] : colors.slice(0, limit),
            borderColor:
              chartType === 'bar' ? 'rgba(59, 130, 246, 1)' : '#ffffff',
            borderWidth: chartType === 'bar' ? 0 : 2,
            borderRadius: chartType === 'bar' ? 6 : 0,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: chartType !== 'bar',
            position: 'right',
            labels: {
              font: { family: "'Inter', sans-serif", size: 12 },
              usePointStyle: true,
              padding: 20,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.9)',
            padding: 12,
            cornerRadius: 8,
          },
        },
        scales:
          chartType === 'bar'
            ? {
                y: {
                  beginAtZero: true,
                  grid: { color: 'rgba(0, 0, 0, 0.04)' },
                  border: { display: false },
                  ticks: {
                    font: { family: "'Inter', sans-serif", size: 11 },
                    color: '#6B7280',
                  },
                },
                x: {
                  grid: { display: false },
                  border: { display: false },
                  ticks: {
                    font: { family: "'Inter', sans-serif", size: 11 },
                    color: '#6B7280',
                    maxRotation: 45,
                    minRotation: 45,
                  },
                },
              }
            : undefined,
      },
    };
  }

  async generateInventoryChart(
    tenantId: string,
    branchId: string,
    chartType: 'bar' | 'pie' = 'bar',
  ): Promise<ChartConfig> {
    const rawInventoryData: unknown = await this.dataService.getInventoryData(
      tenantId,
      branchId,
    );
    const items = this.getInventoryItems(rawInventoryData).slice(0, 15);

    const labels = items.map((item) => item.name);
    const data = items.map((item) => item.quantity);

    return {
      type: chartType,
      title: 'Inventory Stock Levels',
      data: {
        labels,
        datasets: [
          {
            label: 'Stock Quantity',
            data,
            backgroundColor: items.map((item) => {
              if (item.status === 'out') return 'rgba(239, 68, 68, 0.85)';
              if (item.status === 'low') return 'rgba(245, 158, 11, 0.85)';
              return 'rgba(16, 185, 129, 0.85)';
            }),
            borderWidth: 0,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.9)',
            padding: 12,
            cornerRadius: 8,
          },
        },
        scales:
          chartType === 'bar'
            ? {
                y: {
                  beginAtZero: true,
                  grid: { color: 'rgba(0, 0, 0, 0.04)' },
                  border: { display: false },
                  ticks: {
                    font: { family: "'Inter', sans-serif", size: 11 },
                    color: '#6B7280',
                  },
                },
                x: {
                  grid: { display: false },
                  border: { display: false },
                  ticks: {
                    font: { family: "'Inter', sans-serif", size: 11 },
                    color: '#6B7280',
                    maxRotation: 45,
                    minRotation: 45,
                  },
                },
              }
            : undefined,
      },
    };
  }

  async generateCustomerChart(
    tenantId: string,
    branchId: string,
    chartType: 'bar' | 'pie' | 'doughnut' = 'bar',
    limit: number = 10,
  ): Promise<ChartConfig> {
    const rawCustomerData: unknown = await this.dataService.getCustomerData(
      tenantId,
      branchId,
    );
    const topCustomers = this.getTopCustomers(rawCustomerData).slice(0, limit);

    const labels = topCustomers.map((c) => c.name);
    const data = topCustomers.map((c) => c.revenue);

    return {
      type: chartType,
      title: `Top ${limit} Customers by Revenue`,
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue',
            data,
            backgroundColor: 'rgba(139, 92, 246, 0.85)',
            borderWidth: 0,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.9)',
            padding: 12,
            cornerRadius: 8,
          },
        },
        scales:
          chartType === 'bar'
            ? {
                y: {
                  beginAtZero: true,
                  grid: { color: 'rgba(0, 0, 0, 0.04)' },
                  border: { display: false },
                  ticks: {
                    font: { family: "'Inter', sans-serif", size: 11 },
                    color: '#6B7280',
                  },
                },
                x: {
                  grid: { display: false },
                  border: { display: false },
                  ticks: {
                    font: { family: "'Inter', sans-serif", size: 11 },
                    color: '#6B7280',
                    maxRotation: 45,
                    minRotation: 45,
                  },
                },
              }
            : undefined,
      },
    };
  }
}
