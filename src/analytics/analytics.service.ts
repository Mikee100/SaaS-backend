import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  private toNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value === 'bigint') {
      return Number(value);
    }
    return 0;
  }

  private toText(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private toDateKey(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    if (typeof value === 'string') {
      return value.split('T')[0];
    }
    return '';
  }

  private parseTimeRange(
    timeRange: string | undefined,
    startDate: string | undefined,
    endDate: string | undefined,
  ): { start: Date; end: Date; label: string } {
    const now = new Date();

    const hasCustomRange =
      typeof startDate === 'string' &&
      startDate.length > 0 &&
      typeof endDate === 'string' &&
      endDate.length > 0;

    if (hasCustomRange) {
      const parsedStart = new Date(startDate);
      const parsedEnd = new Date(endDate);
      if (
        !Number.isNaN(parsedStart.getTime()) &&
        !Number.isNaN(parsedEnd.getTime())
      ) {
        const normalizedStart = new Date(parsedStart);
        normalizedStart.setHours(0, 0, 0, 0);

        const normalizedEnd = new Date(parsedEnd);
        normalizedEnd.setHours(23, 59, 59, 999);

        return {
          start: normalizedStart,
          end: normalizedEnd,
          label: 'custom',
        };
      }
    }

    const resolved = typeof timeRange === 'string' ? timeRange : '30days';
    const start = new Date(now);

    switch (resolved) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case '7days':
        start.setDate(now.getDate() - 7);
        break;
      case '90days':
        start.setDate(now.getDate() - 90);
        break;
      case '1year':
        start.setFullYear(now.getFullYear() - 1);
        break;
      case '30days':
      default:
        start.setDate(now.getDate() - 30);
        break;
    }

    return {
      start,
      end: now,
      label: resolved,
    };
  }

  private async buildPaymentMethodBreakdown(
    whereClause: Prisma.SaleWhereInput,
  ): Promise<
    Array<{
      method: string;
      amount: number;
      count: number;
      componentCount: number;
      transactionCount: number;
    }>
  > {
    const sales = await this.prisma.sale.findMany({
      where: whereClause,
      select: {
        paymentType: true,
        total: true,
        mpesaTransaction: {
          select: {
            amount: true,
          },
        },
        credit: {
          select: {
            totalAmount: true,
          },
        },
      },
    });

    const methodMap = new Map<
      string,
      { componentCount: number; transactionCount: number; amount: number }
    >();
    const addMethod = (methodRaw: string, amountRaw: number, count = 1) => {
      const method = String(methodRaw || 'unknown').toLowerCase();
      const amount = this.toNumber(amountRaw);
      const current = methodMap.get(method) || {
        componentCount: 0,
        transactionCount: 0,
        amount: 0,
      };
      current.componentCount += count;
      current.amount += amount;
      methodMap.set(method, current);
    };

    // Transaction count by sale record primary payment type.
    for (const sale of sales) {
      const method = String(sale.paymentType || 'unknown').toLowerCase();
      const current = methodMap.get(method) || {
        componentCount: 0,
        transactionCount: 0,
        amount: 0,
      };
      current.transactionCount += 1;
      methodMap.set(method, current);
    }

    for (const sale of sales) {
      const paymentType = String(sale.paymentType || '').toLowerCase();
      const saleTotal = this.toNumber(sale.total);

      if (paymentType !== 'split') {
        addMethod(paymentType || 'unknown', saleTotal);
        continue;
      }

      const mpesaAmount = this.toNumber(sale.mpesaTransaction?.amount);
      const creditAmount = this.toNumber(sale.credit?.totalAmount);
      const cashAmount = Math.max(0, saleTotal - mpesaAmount - creditAmount);

      let componentCount = 0;
      if (cashAmount > 0) {
        addMethod('cash', cashAmount);
        componentCount += 1;
      }
      if (mpesaAmount > 0) {
        addMethod('mpesa', mpesaAmount);
        componentCount += 1;
      }
      if (creditAmount > 0) {
        addMethod('credit', creditAmount);
        componentCount += 1;
      }

      // Defensive fallback in case old/malformed split records have no components.
      if (componentCount === 0) {
        addMethod('split', saleTotal);
      }
    }

    return Array.from(methodMap.entries())
      .map(([method, value]) => ({
        method,
        count: value.componentCount,
        componentCount: value.componentCount,
        transactionCount: value.transactionCount,
        amount: Number(value.amount.toFixed(2)),
      }))
      .filter((row) => row.amount > 0 || row.componentCount > 0)
      .sort((a, b) => b.amount - a.amount);
  }

  async getRetailReportsCenter(
    tenantId: string,
    options: {
      timeRange?: string;
      branchId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    try {
      const range = this.parseTimeRange(
        options.timeRange,
        options.startDate,
        options.endDate,
      );

      const buildSnapshot = async (start: Date, end: Date) => {
        const whereClause: Prisma.SaleWhereInput = {
          tenantId,
          createdAt: {
            gte: start,
            lte: end,
          },
          ...(options.branchId ? { branchId: options.branchId } : {}),
        };

        const [aggregate, paymentMethods] = await Promise.all([
          this.prisma.sale.aggregate({
            where: whereClause,
            _sum: {
              total: true,
            },
            _count: {
              _all: true,
            },
          }),
          this.buildPaymentMethodBreakdown(whereClause),
        ]);

        const totalOrders = this.toNumber(aggregate._count?._all);
        const totalSales = this.toNumber(aggregate._sum?.total);
        const avgTicket =
          totalOrders > 0 ? Number((totalSales / totalOrders).toFixed(2)) : 0;

        const cashTotal = paymentMethods
          .filter((row) => row.method.toLowerCase() === 'cash')
          .reduce((sum, row) => sum + row.amount, 0);
        const nonCashTotal = Math.max(0, totalSales - cashTotal);

        return {
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
          totalOrders,
          totalSales,
          avgTicket,
          cashTotal,
          nonCashTotal,
          paymentMethods,
        };
      };

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const yesterdayEnd = new Date(todayStart);
      yesterdayEnd.setMilliseconds(yesterdayEnd.getMilliseconds() - 1);

      const selectedWhereClause: Prisma.SaleWhereInput = {
        tenantId,
        createdAt: {
          gte: range.start,
          lte: range.end,
        },
        ...(options.branchId ? { branchId: options.branchId } : {}),
      };
      const todayWhereClause: Prisma.SaleWhereInput = {
        tenantId,
        createdAt: {
          gte: todayStart,
          lte: now,
        },
        ...(options.branchId ? { branchId: options.branchId } : {}),
      };

      const [
        xReport,
        zReport,
        paymentMethodsRange,
        cashierRaw,
        todayCashierRaw,
      ] = await Promise.all([
        buildSnapshot(todayStart, now),
        buildSnapshot(yesterdayStart, yesterdayEnd),
        this.buildPaymentMethodBreakdown(selectedWhereClause),
        this.prisma.sale.groupBy({
          by: ['userId'],
          where: selectedWhereClause,
          _count: {
            _all: true,
          },
          _sum: {
            total: true,
          },
          orderBy: {
            _sum: {
              total: 'desc',
            },
          },
        }),
        this.prisma.sale.groupBy({
          by: ['userId'],
          where: todayWhereClause,
          _count: {
            _all: true,
          },
          _sum: {
            total: true,
          },
          orderBy: {
            _sum: {
              total: 'desc',
            },
          },
        }),
      ]);

      const paymentTotal = paymentMethodsRange.reduce(
        (sum, row) => sum + this.toNumber(row.amount),
        0,
      );

      const byPaymentMethod = paymentMethodsRange.map((row) => {
        const amount = this.toNumber(row.amount);
        return {
          method: this.toText(row.method || 'unknown'),
          count: this.toNumber(row.count),
          componentCount: this.toNumber(row.componentCount),
          transactionCount: this.toNumber(row.transactionCount),
          amount,
          sharePct:
            paymentTotal > 0
              ? Number(((amount / paymentTotal) * 100).toFixed(2))
              : 0,
        };
      });

      const cashierIds = [...cashierRaw, ...todayCashierRaw]
        .map((row) => row.userId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
      const cashierUsers = cashierIds.length
        ? await this.prisma.user.findMany({
            where: {
              id: { in: cashierIds },
            },
            select: {
              id: true,
              name: true,
              email: true,
            },
          })
        : [];
      const cashierMap = new Map(
        cashierUsers.map((user) => [
          user.id,
          user.name || user.email || user.id,
        ]),
      );

      const byCashier = cashierRaw.map((row) => {
        const sales = this.toNumber(row._sum?.total);
        const orders = this.toNumber(row._count?._all);
        return {
          userId: row.userId,
          cashier: cashierMap.get(row.userId) || row.userId,
          orders,
          sales,
          avgTicket: orders > 0 ? Number((sales / orders).toFixed(2)) : 0,
        };
      });

      const todayByCashier = todayCashierRaw.map((row) => {
        const sales = this.toNumber(row._sum?.total);
        const orders = this.toNumber(row._count?._all);
        return {
          userId: row.userId,
          cashier: cashierMap.get(row.userId) || row.userId,
          orders,
          sales,
          avgTicket: orders > 0 ? Number((sales / orders).toFixed(2)) : 0,
        };
      });

      const currentAggregate = await this.prisma.sale.aggregate({
        where: selectedWhereClause,
        _sum: { total: true },
        _count: { _all: true },
      });

      const durationMs = Math.max(
        1,
        range.end.getTime() - range.start.getTime(),
      );
      const previousEnd = new Date(range.start);
      previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);
      const previousStart = new Date(range.start.getTime() - durationMs);

      const previousAggregate = await this.prisma.sale.aggregate({
        where: {
          tenantId,
          createdAt: {
            gte: previousStart,
            lte: previousEnd,
          },
          ...(options.branchId ? { branchId: options.branchId } : {}),
        },
        _sum: { total: true },
        _count: { _all: true },
      });

      const currentSales = this.toNumber(currentAggregate._sum?.total);
      const previousSales = this.toNumber(previousAggregate._sum?.total);
      const currentOrders = this.toNumber(currentAggregate._count?._all);
      const previousOrders = this.toNumber(previousAggregate._count?._all);
      const currentAvg =
        currentOrders > 0
          ? Number((currentSales / currentOrders).toFixed(2))
          : 0;
      const previousAvg =
        previousOrders > 0
          ? Number((previousSales / previousOrders).toFixed(2))
          : 0;

      const pct = (current: number, previous: number): number => {
        if (!previous) return current > 0 ? 100 : 0;
        return Number((((current - previous) / previous) * 100).toFixed(2));
      };

      return {
        range: {
          label: range.label,
          start: range.start.toISOString(),
          end: range.end.toISOString(),
        },
        xReport,
        zReport,
        byPaymentMethod,
        byCashier,
        todayByCashier,
        variance: {
          todayVsYesterday: {
            salesDelta: Number(
              (xReport.totalSales - zReport.totalSales).toFixed(2),
            ),
            salesDeltaPct: pct(xReport.totalSales, zReport.totalSales),
            ordersDelta: xReport.totalOrders - zReport.totalOrders,
            ordersDeltaPct: pct(xReport.totalOrders, zReport.totalOrders),
            avgTicketDelta: Number(
              (xReport.avgTicket - zReport.avgTicket).toFixed(2),
            ),
            avgTicketDeltaPct: pct(xReport.avgTicket, zReport.avgTicket),
            comparedTo: {
              start: zReport.periodStart,
              end: zReport.periodEnd,
            },
          },
          periodOverPeriod: {
            salesDelta: Number((currentSales - previousSales).toFixed(2)),
            salesDeltaPct: pct(currentSales, previousSales),
            ordersDelta: currentOrders - previousOrders,
            ordersDeltaPct: pct(currentOrders, previousOrders),
            avgTicketDelta: Number((currentAvg - previousAvg).toFixed(2)),
            avgTicketDeltaPct: pct(currentAvg, previousAvg),
            comparedTo: {
              start: previousStart.toISOString(),
              end: previousEnd.toISOString(),
            },
          },
        },
      };
    } catch (error) {
      this.logger.error('Error in getRetailReportsCenter', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error('Failed to fetch retail reports center data');
    }
  }

  async getDashboardAnalytics(tenantId: string, branchId?: string) {
    const cacheKey = `analytics:dashboard:${tenantId}:${branchId || 'all'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get current date and calculate date ranges
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
      grossProfitTrend,
      salesByHourHeatmap,
    ] = await Promise.all([
      // Total Sales (count of sales in the last 30 days)

      this.prisma.sale.count({
        where: {
          tenantId,
          createdAt: { gte: thirtyDaysAgo },
          ...(branchId ? { branchId } : {}),
        },
      }),

      // Total Revenue (sum of sales in the last 30 days)

      this.prisma.sale.aggregate({
        where: {
          tenantId,
          createdAt: { gte: thirtyDaysAgo },
          ...(branchId ? { branchId } : {}),
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
          ...(branchId ? { branchId } : {}),
        },
        _count: true,
      }),

      // Sales by day (last 7 days)

      this.getSalesByTimePeriod(tenantId, 'day', branchId),

      // Sales by week (last 4 weeks)
      this.getSalesByTimePeriod(tenantId, 'week', branchId),

      // Sales by month (last 6 months)
      this.getSalesByTimePeriod(tenantId, 'month', branchId),

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

      this.getTopProducts(tenantId, 5, branchId),

      // Branch top products
      this.getBranchTopProducts(tenantId),

      // Inventory analytics

      this.getInventoryAnalytics(tenantId),

      // Sales forecasting
      this.generateSalesForecast(tenantId, branchId),

      // Gross profit trend (daily)
      this.getGrossProfitTrend(tenantId, branchId),

      // Hour-of-day heatmap buckets
      this.getSalesByHourHeatmap(tenantId, branchId),
    ]);

    const [customerSegments, locationSegments] = await Promise.all([
      this.getCustomerSegments(tenantId, branchId),
      this.getLocationSegments(tenantId, branchId),
    ]);

    // Calculate customer retention (simplified)
    const repeatCustomers = await this.getRepeatCustomers(tenantId, branchId);
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
      grossProfitTrend,
      salesByHourHeatmap,
      performanceMetrics,
      realTimeData: await this.getRealTimeData(tenantId),
      forecast: forecastData,
      customerSegments,
      advancedSegments: {
        byLocation: locationSegments,
      },
      predictiveAnalytics: {
        nextMonthForecast: forecastData.hasEnoughData
          ? forecastData.forecast_sales[0]
          : null,
        growthRate: forecastData.growthRate,
        hasEnoughData: forecastData.hasEnoughData,
      },
    };

    // Add recent activity data
    const recentSales = await this.prisma.sale.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        total: true,
        customerName: true,
        createdAt: true,
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

    const result = {
      ...analyticsData,
      recentActivity,
    };

    // Cache full dashboard payload for a short time window.
    // This endpoint is read-heavy and can tolerate slight staleness.
    this.cache.set(cacheKey, result, 60);
    return result;
  }

  private async getGrossProfitTrend(tenantId: string, branchId?: string) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14);

    const rows = await this.prisma.$queryRaw<
      Array<{
        day: string;
        revenue: string | number | bigint;
        cost: string | number | bigint;
      }>
    >(Prisma.sql`
      SELECT
        TO_CHAR(s."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') as day,
        COALESCE(SUM(si.quantity * si.price), 0) as revenue,
        COALESCE(SUM(COALESCE(p.cost, 0) * si.quantity), 0) as cost
      FROM "SaleItem" si
      INNER JOIN "Sale" s ON s.id = si."saleId"
      LEFT JOIN "Product" p ON p.id = si."productId"
      WHERE s."tenantId" = ${tenantId}
        AND s."createdAt" >= ${startDate}
        ${branchId ? Prisma.sql`AND s."branchId" = ${branchId}` : Prisma.empty}
      GROUP BY day
      ORDER BY day ASC
    `);

    const trend = rows.map((row) => {
      const revenue = this.toNumber(row.revenue);
      const cost = this.toNumber(row.cost);
      const profit = revenue - cost;
      return {
        day: row.day,
        revenue: Number(revenue.toFixed(2)),
        cost: Number(cost.toFixed(2)),
        profit: Number(profit.toFixed(2)),
      };
    });

    return trend;
  }

  private async getSalesByHourHeatmap(tenantId: string, branchId?: string) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { timezone: true },
    });

    const businessTimezone = tenant?.timezone || 'Africa/Nairobi';

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
        ...(branchId ? { branchId } : {}),
      },
      select: {
        createdAt: true,
        total: true,
      },
    });

    const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: businessTimezone,
      weekday: 'short',
    });
    const hourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: businessTimezone,
      hour: '2-digit',
      hourCycle: 'h23',
    });

    const dowMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    const buckets = new Map<
      string,
      { dow: number; hour: number; orders: number; revenue: number }
    >();

    for (const sale of sales) {
      const dayShort = weekdayFormatter.format(sale.createdAt);
      const hourText = hourFormatter.format(sale.createdAt);
      const dow = dowMap[dayShort];
      const hour = Number.parseInt(hourText, 10);

      if (!Number.isFinite(dow) || !Number.isFinite(hour)) {
        continue;
      }

      const key = `${dow}-${hour}`;
      const existing = buckets.get(key) || {
        dow,
        hour,
        orders: 0,
        revenue: 0,
      };

      existing.orders += 1;
      existing.revenue += Number(sale.total || 0);
      buckets.set(key, existing);
    }

    return Array.from(buckets.values())
      .sort((a, b) => a.dow - b.dow || a.hour - b.hour)
      .map((row) => ({
        dow: row.dow,
        hour: row.hour,
        orders: row.orders,
        revenue: Number(row.revenue.toFixed(2)),
      }));
  }

  private async getSalesByTimePeriod(
    tenantId: string,
    period: 'day' | 'week' | 'month' | 'year',
    branchId?: string,
  ) {
    const date = new Date();
    if (period === 'day') date.setDate(date.getDate() - 7);
    else if (period === 'week')
      date.setDate(date.getDate() - 28); // 4 weeks
    else if (period === 'month')
      date.setMonth(date.getMonth() - 6); // 6 months
    else date.setFullYear(date.getFullYear() - 5); // 5 years

    if (period === 'week') {
      const sales = await this.prisma.$queryRaw<
        { period: string; total: string }[]
      >(Prisma.sql`
        SELECT
          TO_CHAR(week_start, 'DD Mon') || ' - ' || TO_CHAR(week_start + interval '6 days', 'DD Mon YYYY') as period,
          COALESCE(SUM(total), 0)::text as total
        FROM (
          SELECT
            date_trunc('week', "createdAt" AT TIME ZONE 'UTC')::date as week_start,
            total
          FROM "Sale"
          WHERE "tenantId" = ${tenantId}
            AND "createdAt" >= ${date}
            ${branchId ? Prisma.sql`AND "branchId" = ${branchId}` : Prisma.empty}
        ) sub
        GROUP BY week_start
        ORDER BY week_start ASC
      `);
      return sales.reduce<Record<string, number>>(
        (acc, curr) => ({
          ...acc,
          [curr.period]: parseFloat(curr.total),
        }),
        {},
      );
    }

    const format =
      period === 'day' ? 'YYYY-MM-DD' : period === 'month' ? 'YYYY-MM' : 'YYYY';

    const sales = await this.prisma.$queryRaw(
      Prisma.sql`
        SELECT
          TO_CHAR("createdAt" AT TIME ZONE 'UTC', ${format}) as period,
          COUNT(*) as count,
          COALESCE(SUM(total), 0) as total
        FROM "Sale"
        WHERE "tenantId" = ${tenantId}
          AND "createdAt" >= ${date}
          ${branchId ? Prisma.sql`AND "branchId" = ${branchId}` : Prisma.empty}
        GROUP BY period
        ORDER BY period ASC
      `,
    );

    type SalesData = { period: string; total: string };
    return (sales as SalesData[]).reduce<Record<string, number>>(
      (acc, curr) => ({
        ...acc,
        [curr.period]: parseFloat(curr.total),
      }),
      {},
    );
  }

  async getDailySales(tenantId: string, branchId?: string) {
    return this.getSalesByTimePeriod(tenantId, 'day', branchId);
  }

  async getWeeklySales(tenantId: string, branchId?: string) {
    return this.getSalesByTimePeriod(tenantId, 'week', branchId);
  }

  async getYearlySales(tenantId: string, branchId?: string) {
    return this.getSalesByTimePeriod(tenantId, 'year', branchId);
  }

  async getStockoutLostSales(tenantId: string, branchId?: string) {
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        inventory: {
          where: branchId ? { branchId } : undefined,
          select: {
            quantity: true,
            reorderPoint: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stockoutItems: Array<{
      id: string;
      productName: string;
      stockoutDate: string;
      daysOutOfStock: number;
      estimatedLostSales: number;
      lastSalePrice: number;
      reorderPoint: number;
    }> = [];

    for (const product of products) {
      const inventoryStock = product.inventory.reduce(
        (sum, inv) => sum + inv.quantity,
        0,
      );

      // If there is no inventory row for this scope, fall back to product-level stock.
      const currentStock =
        product.inventory.length > 0
          ? inventoryStock
          : typeof product.stock === 'number'
            ? product.stock
            : 0;

      if (currentStock > 0) {
        continue;
      }

      const latestSaleItem = await this.prisma.saleItem.findFirst({
        where: {
          productId: product.id,
          sale: {
            tenantId,
            ...(branchId ? { branchId } : {}),
          },
        },
        orderBy: { sale: { createdAt: 'desc' } },
        select: {
          price: true,
          quantity: true,
          sale: { select: { createdAt: true } },
        },
      });

      const salesStats = await this.prisma.saleItem.aggregate({
        where: {
          productId: product.id,
          sale: {
            tenantId,
            createdAt: { gte: thirtyDaysAgo },
            ...(branchId ? { branchId } : {}),
          },
        },
        _sum: { quantity: true },
      });

      const totalQtyLast30Days = Number(salesStats._sum.quantity || 0);
      const avgDailyDemand = totalQtyLast30Days / 30;
      const lastSalePrice = latestSaleItem?.price || product.price || 0;

      const stockoutStartDate =
        product.inventory[0]?.updatedAt ||
        latestSaleItem?.sale?.createdAt ||
        product.updatedAt;

      const daysOutOfStock = Math.max(
        1,
        Math.ceil(
          (now.getTime() - new Date(stockoutStartDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );

      const estimatedLostSales = Math.max(
        0,
        Math.round(avgDailyDemand * daysOutOfStock * lastSalePrice),
      );

      const reorderPoint =
        product.inventory.length > 0
          ? Number(product.inventory[0]?.reorderPoint || 10)
          : 10;

      stockoutItems.push({
        id: product.id,
        productName: product.name,
        stockoutDate: new Date(stockoutStartDate).toISOString(),
        daysOutOfStock,
        estimatedLostSales,
        lastSalePrice,
        reorderPoint,
      });
    }

    return stockoutItems.sort(
      (a, b) => b.estimatedLostSales - a.estimatedLostSales,
    );
  }

  private resolvePeriod(
    from?: string,
    to?: string,
  ): { start: Date; end: Date } {
    const end = to ? new Date(to) : new Date();
    const start = from
      ? new Date(from)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      start: Number.isNaN(start.getTime())
        ? new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
        : start,
      end: Number.isNaN(end.getTime()) ? new Date() : end,
    };
  }

  async getInventoryMovement(
    tenantId: string,
    branchId?: string,
    from?: string,
    to?: string,
  ) {
    const { start, end } = this.resolvePeriod(from, to);

    const movements = await this.prisma.inventoryMovement.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        createdAt: { gte: start, lte: end },
      },
      select: {
        type: true,
        previousQuantity: true,
        newQuantity: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const byDate = new Map<
      string,
      {
        date: string;
        receipts: number;
        issues: number;
        adjustments: number;
        netMovement: number;
      }
    >();

    for (const m of movements) {
      const date = m.createdAt.toISOString().slice(0, 10);
      const entry = byDate.get(date) ?? {
        date,
        receipts: 0,
        issues: 0,
        adjustments: 0,
        netMovement: 0,
      };
      const netChange = m.newQuantity - m.previousQuantity;

      if (m.type === 'in') entry.receipts += Math.abs(netChange);
      else if (m.type === 'out') entry.issues += Math.abs(netChange);
      else if (m.type === 'adjustment') entry.adjustments += netChange;
      // 'transfer' movements net to zero tenant-wide but still affect this
      // location's balance, so they're folded into netMovement only.

      entry.netMovement += netChange;
      byDate.set(date, entry);
    }

    return Array.from(byDate.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  async getInventoryValuation(tenantId: string, branchId?: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, deletedAt: null, ...(branchId ? { branchId } : {}) },
      select: {
        id: true,
        name: true,
        price: true,
        cost: true,
        stock: true,
        inventory: {
          where: branchId ? { branchId } : undefined,
          select: { quantity: true },
        },
      },
    });

    return products.map((product) => {
      const stockQty =
        product.inventory.length > 0
          ? product.inventory.reduce((sum, inv) => sum + inv.quantity, 0)
          : product.stock;
      const costPrice = product.cost || 0;
      const sellingPrice = product.price || 0;
      const stockValue = stockQty * costPrice;
      const potentialRevenue = stockQty * sellingPrice;
      const marginPct =
        sellingPrice > 0
          ? ((sellingPrice - costPrice) / sellingPrice) * 100
          : 0;

      return {
        id: product.id,
        productName: product.name,
        stock: stockQty,
        costPrice,
        sellingPrice,
        stockValue,
        potentialRevenue,
        profitMargin: Math.round(marginPct * 100) / 100,
      };
    });
  }

  async getInventoryAging(tenantId: string, branchId?: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, deletedAt: null, ...(branchId ? { branchId } : {}) },
      select: {
        id: true,
        name: true,
        cost: true,
        stock: true,
        updatedAt: true,
        inventory: {
          where: branchId ? { branchId } : undefined,
          select: { quantity: true, updatedAt: true },
        },
      },
    });

    const now = new Date();
    const results: Array<{
      id: string;
      productName: string;
      stock: number;
      lastReceived: string;
      daysInStock: number;
      ageBucket: '0-30' | '31-60' | '61-90' | '90+';
      unitCost: number;
      stockValue: number;
    }> = [];

    for (const product of products) {
      const stockQty =
        product.inventory.length > 0
          ? product.inventory.reduce((sum, inv) => sum + inv.quantity, 0)
          : product.stock;

      if (stockQty <= 0) continue;

      const lastInMovement = await this.prisma.inventoryMovement.findFirst({
        where: {
          productId: product.id,
          type: 'in',
          ...(branchId ? { branchId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      const lastReceivedAt =
        lastInMovement?.createdAt ||
        product.inventory[0]?.updatedAt ||
        product.updatedAt;

      const daysInStock = Math.max(
        0,
        Math.floor(
          (now.getTime() - new Date(lastReceivedAt).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );

      const ageBucket =
        daysInStock <= 30
          ? '0-30'
          : daysInStock <= 60
            ? '31-60'
            : daysInStock <= 90
              ? '61-90'
              : '90+';

      const unitCost = product.cost || 0;

      results.push({
        id: product.id,
        productName: product.name,
        stock: stockQty,
        lastReceived: new Date(lastReceivedAt).toISOString(),
        daysInStock,
        ageBucket,
        unitCost,
        stockValue: stockQty * unitCost,
      });
    }

    return results.sort((a, b) => b.daysInStock - a.daysInStock);
  }

  async getInventoryTurnover(
    tenantId: string,
    branchId?: string,
    from?: string,
    to?: string,
  ) {
    const { start, end } = this.resolvePeriod(from, to);

    const products = await this.prisma.product.findMany({
      where: { tenantId, deletedAt: null, ...(branchId ? { branchId } : {}) },
      select: {
        id: true,
        name: true,
        stock: true,
        inventory: {
          where: branchId ? { branchId } : undefined,
          select: { quantity: true },
        },
      },
    });

    const results: Array<{
      id: string;
      product: string;
      sold: number;
      avgStock: number;
      turnover: number;
      periodStart: string;
      periodEnd: string;
    }> = [];
    for (const productRow of products) {
      const salesAgg = await this.prisma.saleItem.aggregate({
        where: {
          productId: productRow.id,
          sale: {
            tenantId,
            createdAt: { gte: start, lte: end },
            ...(branchId ? { branchId } : {}),
          },
        },
        _sum: { quantity: true },
      });

      const sold = salesAgg._sum.quantity || 0;
      // No historical stock snapshots are recorded, so current on-hand
      // quantity is used as the average-stock denominator.
      const avgStock =
        productRow.inventory.length > 0
          ? productRow.inventory.reduce((sum, inv) => sum + inv.quantity, 0)
          : productRow.stock;

      const turnover = avgStock > 0 ? sold / avgStock : 0;

      results.push({
        id: productRow.id,
        product: productRow.name,
        sold,
        avgStock,
        turnover: Math.round(turnover * 100) / 100,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      });
    }

    return results.sort((a, b) => b.turnover - a.turnover);
  }

  private extractProductCategory(customFields: unknown): string {
    if (
      !customFields ||
      typeof customFields !== 'object' ||
      Array.isArray(customFields)
    ) {
      return 'Uncategorized';
    }
    const raw = (customFields as Record<string, unknown>).category;
    const name = typeof raw === 'string' ? raw.trim() : '';
    return name || 'Uncategorized';
  }

  async getProductCategoryAnalysis(
    tenantId: string,
    branchId?: string,
    from?: string,
    to?: string,
  ) {
    const { start, end } = this.resolvePeriod(from, to);

    const products = await this.prisma.product.findMany({
      where: { tenantId, deletedAt: null, ...(branchId ? { branchId } : {}) },
      select: {
        id: true,
        cost: true,
        stock: true,
        customFields: true,
        inventory: {
          where: branchId ? { branchId } : undefined,
          select: { quantity: true },
        },
      },
    });

    const categories = new Map<
      string,
      { revenue: number; unitsSold: number; cogs: number; stockValue: number }
    >();

    for (const product of products) {
      const categoryName = this.extractProductCategory(product.customFields);
      const entry = categories.get(categoryName) ?? {
        revenue: 0,
        unitsSold: 0,
        cogs: 0,
        stockValue: 0,
      };

      const salesAgg = await this.prisma.saleItem.aggregate({
        where: {
          productId: product.id,
          sale: {
            tenantId,
            createdAt: { gte: start, lte: end },
            ...(branchId ? { branchId } : {}),
          },
        },
        _sum: { quantity: true },
      });
      // Revenue is computed from actual sale line prices, not current list
      // price, so historical discounts/price changes are reflected.
      const saleItems = await this.prisma.saleItem.findMany({
        where: {
          productId: product.id,
          sale: {
            tenantId,
            createdAt: { gte: start, lte: end },
            ...(branchId ? { branchId } : {}),
          },
        },
        select: { price: true, quantity: true },
      });

      const revenue = saleItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const unitsSold = salesAgg._sum.quantity || 0;
      const cogs = unitsSold * (product.cost || 0);
      const stockQty =
        product.inventory.length > 0
          ? product.inventory.reduce((sum, inv) => sum + inv.quantity, 0)
          : product.stock;

      entry.revenue += revenue;
      entry.unitsSold += unitsSold;
      entry.cogs += cogs;
      entry.stockValue += stockQty * (product.cost || 0);
      categories.set(categoryName, entry);
    }

    return Array.from(categories.entries())
      .map(([categoryName, data]) => ({
        categoryId: categoryName.toLowerCase().replace(/\s+/g, '-'),
        categoryName,
        revenue: data.revenue,
        unitsSold: data.unitsSold,
        marginPct:
          data.revenue > 0
            ? Math.round(((data.revenue - data.cogs) / data.revenue) * 10000) /
              100
            : 0,
        stockValue: data.stockValue,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private async getBranchSalesByTimePeriod(
    tenantId: string,
    period: 'day' | 'week' | 'month' | 'year',
  ) {
    const date = new Date();
    if (period === 'day') date.setDate(date.getDate() - 7);
    else if (period === 'week')
      date.setDate(date.getDate() - 28); // 4 weeks
    else if (period === 'month')
      date.setMonth(date.getMonth() - 6); // 6 months
    else date.setFullYear(date.getFullYear() - 5); // 5 years

    if (period === 'week') {
      const sales = await this.prisma.$queryRaw<
        { branchId: string; period: string; total: string }[]
      >(Prisma.sql`
        SELECT
          "branchId",
          TO_CHAR(week_start, 'DD Mon') || ' - ' || TO_CHAR(week_start + interval '6 days', 'DD Mon YYYY') as period,
          COALESCE(SUM(total), 0)::text as total
        FROM (
          SELECT
            "branchId",
            date_trunc('week', "createdAt" AT TIME ZONE 'UTC')::date as week_start,
            total
          FROM "Sale"
          WHERE "tenantId" = ${tenantId}
            AND "createdAt" >= ${date}
            AND "branchId" IS NOT NULL
        ) sub
        GROUP BY "branchId", week_start
        ORDER BY "branchId", week_start ASC
      `);
      const branchSales: Record<string, Record<string, number>> = {};
      sales.forEach((item) => {
        if (!branchSales[item.branchId]) branchSales[item.branchId] = {};
        branchSales[item.branchId][item.period] = parseFloat(item.total);
      });
      return branchSales;
    }

    const format =
      period === 'day' ? 'YYYY-MM-DD' : period === 'month' ? 'YYYY-MM' : 'YYYY';

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

  private async getTopProducts(
    tenantId: string,
    limit: number,
    branchId?: string,
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        name: string;
        sales: number | string | bigint;
        revenue: number | string | bigint;
        cost: number | string | bigint;
      }>
    >(Prisma.sql`
      SELECT
        COALESCE(p.name, 'Unknown Product') as name,
        COALESCE(SUM(si.quantity), 0) as sales,
        COALESCE(SUM(si.quantity * si.price), 0) as revenue,
        COALESCE(SUM(COALESCE(p.cost, 0) * si.quantity), 0) as cost
      FROM "SaleItem" si
      INNER JOIN "Sale" s ON s.id = si."saleId"
      LEFT JOIN "Product" p ON p.id = si."productId"
      WHERE s."tenantId" = ${tenantId}
      ${branchId ? Prisma.sql`AND s."branchId" = ${branchId}` : Prisma.empty}
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
      LIMIT ${limit}
    `);

    return rows.map((row) => {
      const revenue = this.toNumber(row.revenue);
      const cost = this.toNumber(row.cost);
      const margin = revenue > 0 ? (revenue - cost) / revenue : 0;

      return {
        name: row.name || 'Unknown Product',
        sales: this.toNumber(row.sales),
        revenue: Number(revenue.toFixed(2)),
        margin: Number(margin.toFixed(2)),
        cost: Number(cost.toFixed(2)),
      };
    });
  }

  private async getBranchTopProducts(tenantId: string) {
    // Get all branches for this tenant
    const branches = await this.prisma.branch.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });

    const branchTopProducts: Record<
      string,
      Array<{
        name: string;
        sales: number;
        revenue: number;
        margin?: number;
        cost?: number;
      }>
    > = {};

    // For each branch, get top 3 products
    for (const branch of branches) {
      const rows = await this.prisma.$queryRaw<
        Array<{
          name: string;
          sales: number | string | bigint;
          revenue: number | string | bigint;
          cost: number | string | bigint;
        }>
      >(Prisma.sql`
        SELECT
          COALESCE(p.name, 'Unknown Product') as name,
          COALESCE(SUM(si.quantity), 0) as sales,
          COALESCE(SUM(si.quantity * si.price), 0) as revenue,
          COALESCE(SUM(COALESCE(p.cost, 0) * si.quantity), 0) as cost
        FROM "SaleItem" si
        INNER JOIN "Sale" s ON s.id = si."saleId"
        LEFT JOIN "Product" p ON p.id = si."productId"
        WHERE s."tenantId" = ${tenantId}
          AND s."branchId" = ${branch.id}
        GROUP BY p.id, p.name
        ORDER BY revenue DESC
        LIMIT 3
      `);

      branchTopProducts[branch.id] = rows.map((row) => {
        const revenue = this.toNumber(row.revenue);
        const cost = this.toNumber(row.cost);
        const margin = revenue > 0 ? (revenue - cost) / revenue : 0;

        return {
          name: row.name || 'Unknown Product',
          sales: this.toNumber(row.sales),
          revenue: Number(revenue.toFixed(2)),
          margin: Number(margin.toFixed(2)),
          cost: Number(cost.toFixed(2)),
        };
      });
    }

    return branchTopProducts;
  }

  private async getInventoryAnalytics(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId },
      select: {
        id: true,
        stock: true,
        price: true,
        cost: true,
      },
    });

    // Compatibility path for older databases that may miss newer Inventory columns.
    // We only need quantity totals here, so avoid Prisma relation include on Inventory.
    const inventoryRows = await this.prisma.$queryRaw<
      { productId: string; totalQuantity: number }[]
    >(Prisma.sql`
      SELECT "productId", COALESCE(SUM(quantity), 0)::float AS "totalQuantity"
      FROM "Inventory"
      WHERE "tenantId" = ${tenantId}
      GROUP BY "productId"
    `);

    const inventoryByProduct = new Map<string, number>(
      inventoryRows.map((row) => [
        row.productId,
        Number(row.totalQuantity) || 0,
      ]),
    );

    const lowStockThreshold = 10; // Items below this are considered low stock
    const overstockThreshold = 100; // Items above this are considered overstocked

    let lowStockItems = 0;
    let overstockItems = 0;
    let totalStockValue = 0;
    let totalCost = 0;
    let outOfStockItems = 0;

    // Calculate inventory metrics
    products.forEach((product) => {
      // Prefer Inventory totals. Fall back to product.stock if no Inventory rows exist.
      const inventoryStock = inventoryByProduct.get(product.id);
      const stock =
        typeof inventoryStock === 'number'
          ? inventoryStock
          : typeof product.stock === 'number'
            ? product.stock
            : 0;
      const value = stock * (product.price || 0);
      const cost = stock * (product.cost || 0);

      totalStockValue += value;
      totalCost += cost;

      if (stock <= lowStockThreshold) lowStockItems++;
      if (stock >= overstockThreshold) overstockItems++;
      if (stock <= 0) outOfStockItems++;
    });

    // Calculate inventory turnover (simplified)
    const cogs = await this.getCostOfGoodsSold(tenantId, 30); // Last 30 days
    const avgInventoryValue = totalCost / 2; // Simplified average
    const inventoryTurnover =
      avgInventoryValue > 0 ? cogs / avgInventoryValue : 0;

    // Calculate stockout rate (simplified)
    const stockoutRate =
      products.length > 0 ? outOfStockItems / products.length : 0;

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
      select: {
        quantity: true,
        product: {
          select: {
            cost: true,
          },
        },
      },
    });

    return sales.reduce((sum, item) => {
      const cost = item.product?.cost || 0;
      return sum + cost * item.quantity;
    }, 0);
  }

  private async getRepeatCustomers(tenantId: string, branchId?: string) {
    const repeatCustomers = await this.prisma.$queryRaw(
      Prisma.sql`
        SELECT "customerPhone", COUNT(*) as purchase_count
        FROM "Sale"
        WHERE "tenantId" = ${tenantId}
          AND "customerPhone" IS NOT NULL
          ${branchId ? Prisma.sql`AND "branchId" = ${branchId}` : Prisma.empty}
        GROUP BY "customerPhone"
        HAVING COUNT(*) > 1
      `,
    );

    type RepeatCustomer = { customerPhone: string; purchase_count: bigint };
    return (repeatCustomers as RepeatCustomer[]).length;
  }

  private async getCustomerSegments(tenantId: string, branchId?: string) {
    const rows = await this.prisma.$queryRaw(
      Prisma.sql`
        SELECT "customerPhone", COUNT(*) as purchase_count, COALESCE(SUM(total), 0) as total_revenue
        FROM "Sale"
        WHERE "tenantId" = ${tenantId}
          AND "customerPhone" IS NOT NULL
          ${branchId ? Prisma.sql`AND "branchId" = ${branchId}` : Prisma.empty}
        GROUP BY "customerPhone"
      `,
    );

    type CustomerRow = {
      customerPhone: string;
      purchase_count: bigint;
      total_revenue: string;
    };

    const segments = {
      new: { count: 0, revenue: 0 },
      returning: { count: 0, revenue: 0 },
      loyal: { count: 0, revenue: 0 },
    };

    for (const row of rows as CustomerRow[]) {
      const purchases = Number(row.purchase_count);
      const revenue = parseFloat(row.total_revenue);
      const bucket =
        purchases === 1 ? 'new' : purchases <= 4 ? 'returning' : 'loyal';
      segments[bucket].count += 1;
      segments[bucket].revenue += revenue;
    }

    return [
      {
        segment: 'New Customers',
        count: segments.new.count,
        revenue: parseFloat(segments.new.revenue.toFixed(2)),
      },
      {
        segment: 'Returning Customers',
        count: segments.returning.count,
        revenue: parseFloat(segments.returning.revenue.toFixed(2)),
      },
      {
        segment: 'Loyal Customers',
        count: segments.loyal.count,
        revenue: parseFloat(segments.loyal.revenue.toFixed(2)),
      },
    ].filter((segment) => segment.count > 0);
  }

  private async getLocationSegments(tenantId: string, branchId?: string) {
    const rows = await this.prisma.$queryRaw(
      Prisma.sql`
        SELECT
          COALESCE(b.city, b.name, 'Unknown') as location,
          COUNT(DISTINCT s."customerPhone") as customers,
          COALESCE(SUM(s.total), 0) as revenue
        FROM "Sale" s
        LEFT JOIN "Branch" b ON b.id = s."branchId"
        WHERE s."tenantId" = ${tenantId}
          ${branchId ? Prisma.sql`AND s."branchId" = ${branchId}` : Prisma.empty}
        GROUP BY COALESCE(b.city, b.name, 'Unknown')
        ORDER BY revenue DESC
      `,
    );

    type LocationRow = { location: string; customers: bigint; revenue: string };

    return (rows as LocationRow[]).map((row) => ({
      location: row.location,
      customers: Number(row.customers),
      revenue: Number(parseFloat(row.revenue).toFixed(2)),
    }));
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

  private async generateSalesForecast(tenantId: string, branchId?: string) {
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
          ${branchId ? Prisma.sql`AND "branchId" = ${branchId}` : Prisma.empty}
        GROUP BY month
        ORDER BY month ASC
      `,
    );

    type HistoricalData = {
      month: string;
      sales_count: bigint;
      total_revenue: string;
    };

    // Not enough history to fit a trend - be honest that there's no forecast yet
    // rather than fabricating numbers.
    if ((historicalSales as HistoricalData[]).length < 3) {
      return {
        forecast_months: [],
        forecast_sales: [],
        hasEnoughData: false,
        growthRate: 0,
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

      // Predict sales using linear regression, floored at 0
      const predictedSales = Math.max(
        0,
        Math.round(intercept + slope * (n + i - 1)),
      );

      forecastSales.push(predictedSales);
    }

    const lastActualSales = salesData[salesData.length - 1].sales;
    const growthRate =
      lastActualSales > 0
        ? ((forecastSales[0] - lastActualSales) / lastActualSales) * 100
        : 0;

    return {
      forecast_months: forecastMonths,
      forecast_sales: forecastSales,
      hasEnoughData: true,
      growthRate: parseFloat(growthRate.toFixed(1)),
    };
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
      const whereClause: Prisma.SaleWhereInput = {
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

      const paymentMethods =
        await this.buildPaymentMethodBreakdown(whereClause);

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
      type TopProductsRow = {
        productId: string;
        productName: string;
        quantitySold: number | string | bigint;
        totalRevenue: number | string | bigint;
      };
      type SalesTrendRow = {
        date: Date | string;
        sales: number | string | bigint;
        orders: number | string | bigint;
      };

      const topProducts = (topProductsData as TopProductsRow[]).map((p) => ({
        productId: p.productId,
        productName: p.productName,
        quantitySold: this.toNumber(p.quantitySold),
        totalRevenue: this.toNumber(p.totalRevenue),
      }));

      const totalPaymentComponents = paymentMethods.reduce(
        (sum, method) => sum + this.toNumber(method.componentCount),
        0,
      );

      const salesTrend = (salesTrendData as SalesTrendRow[]).map((st) => ({
        date: this.toDateKey(st.date),
        sales: this.toNumber(st.sales),
        orders: this.toNumber(st.orders),
      }));

      return {
        totalOrders,
        totalSales: Number(totalSales),
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        topProducts,
        paymentMethods,
        paymentMethodSummary: {
          totalTransactions: totalOrders,
          totalPaymentComponents,
        },
        salesTrend,
      };
    } catch (error) {
      this.logger.error('Error in getBranchSales', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error('Failed to fetch branch sales data');
    }
  }

  async getBranchComparisonTimeSeries(
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
        format = '"Week" WW YYYY';
      } else if (timeRange === '1year') {
        dateTrunc = 'month';
        format = 'YYYY-MM';
      } else {
        dateTrunc = 'day';
        format = 'YYYY-MM-DD';
      }

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
          ${branchId ? Prisma.sql`AND b.id = ${branchId}` : Prisma.empty}
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
          ${branchId ? Prisma.sql`AND b.id = ${branchId}` : Prisma.empty}
        GROUP BY b.id, b.name
        ORDER BY total_sales DESC
      `;

      // Process time series data
      type BranchTimeSeriesRow = {
        branchId: string;
        branchName: string;
        period: string;
        orders: number | string | bigint;
        sales: number | string | bigint;
      };

      type BranchSeries = {
        branchId: string;
        branchName: string;
        data: Array<{ period: string; orders: number; sales: number }>;
      };

      const processedData: Record<string, BranchSeries> = {};
      for (const item of timeSeriesData as BranchTimeSeriesRow[]) {
        const rowBranchId = this.toText(item.branchId);
        const rowPeriod = this.toText(item.period);
        if (!rowBranchId || !rowPeriod) {
          continue;
        }

        if (!processedData[rowBranchId]) {
          processedData[rowBranchId] = {
            branchId: rowBranchId,
            branchName: this.toText(item.branchName),
            data: [],
          };
        }

        processedData[rowBranchId].data.push({
          period: rowPeriod,
          orders: this.toNumber(item.orders),
          sales: this.toNumber(item.sales),
        });
      }

      // Convert to array and sort by total sales
      const branchComparison = Object.values(processedData).sort((a, b) => {
        const aTotal = a.data.reduce((sum, item) => sum + item.sales, 0);
        const bTotal = b.data.reduce((sum, item) => sum + item.sales, 0);
        return bTotal - aTotal;
      });

      // Process branch totals
      type BranchTotalsRow = {
        branchId: string;
        branchName: string;
        total_orders: number | string | bigint;
        total_sales: number | string | bigint;
      };
      const totals = (branchTotals as BranchTotalsRow[]).map((item) => ({
        branchId: item.branchId,
        branchName: item.branchName,
        totalOrders: this.toNumber(item.total_orders),
        totalSales: this.toNumber(item.total_sales),
      }));

      return {
        timeRange,
        branches: branchComparison,
        totals,
        periodType: dateTrunc,
      };
    } catch (error) {
      this.logger.error('Error in getBranchComparisonTimeSeries', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error('Failed to fetch branch comparison time series data');
    }
  }

  async getBranchProductComparison(
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
          ${branchId ? Prisma.sql`AND b.id = ${branchId}` : Prisma.empty}
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
          ${branchId ? Prisma.sql`AND s."branchId" = ${branchId}` : Prisma.empty}
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
          ${branchId ? Prisma.sql`AND b.id = ${branchId}` : Prisma.empty}
        GROUP BY b.id, b.name
        ORDER BY "totalSales" DESC
      `;

      // Process product comparison data
      type ProductComparisonRow = {
        productId: string;
        productName: string;
        branchId: string;
        branchName: string;
        quantitySold: number | string | bigint;
        totalRevenue: number | string | bigint;
        orderCount: number | string | bigint;
      };
      type OverallProductTotalsRow = {
        productId: string;
        productName: string;
        totalQuantitySold: number | string | bigint;
        totalRevenue: number | string | bigint;
        totalOrders: number | string | bigint;
        branchCount: number | string | bigint;
      };

      const productComparisonRows =
        productComparisonData as ProductComparisonRow[];
      const overallProductRows =
        overallProductTotals as OverallProductTotalsRow[];

      const products = overallProductRows.map((product) => {
        const branchData = productComparisonRows
          .filter((item) => item.productId === product.productId)
          .map((item) => ({
            branchId: item.branchId,
            branchName: item.branchName,
            quantitySold: this.toNumber(item.quantitySold),
            totalRevenue: this.toNumber(item.totalRevenue),
            orderCount: this.toNumber(item.orderCount),
          }));

        return {
          productId: product.productId,
          productName: product.productName,
          totalQuantitySold: this.toNumber(product.totalQuantitySold),
          totalRevenue: this.toNumber(product.totalRevenue),
          totalOrders: this.toNumber(product.totalOrders),
          branchCount: this.toNumber(product.branchCount),
          branchBreakdown: branchData,
        };
      });

      // Process branch totals
      type ProductBranchTotalsRow = {
        branchId: string;
        branchName: string;
        totalOrders: number | string | bigint;
        totalSales: number | string | bigint;
      };
      const branches = (branchTotals as ProductBranchTotalsRow[]).map(
        (branch) => ({
          branchId: branch.branchId,
          branchName: branch.branchName,
          totalOrders: this.toNumber(branch.totalOrders),
          totalSales: this.toNumber(branch.totalSales),
        }),
      );

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
      this.logger.error('Error in getBranchProductComparison', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error('Failed to fetch branch product comparison data');
    }
  }

  /**
   * Returns a time series of total sales per branch per month,
   * suitable for a combined bar/line chart (bar: branch sales, line: total sales).
   */
  async getBranchMonthlySalesComparison(
    tenantId: string,
    months: number = 6,
    branchId?: string,
  ) {
    // Calculate date range
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - months + 1,
      1,
    );

    // Get all branches for this tenant
    const branches = await this.prisma.branch.findMany({
      where: {
        tenantId,
        ...(branchId ? { id: branchId } : {}),
      },
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
        ${branchId ? Prisma.sql`AND b.id = ${branchId}` : Prisma.empty}
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
        ${branchId ? Prisma.sql`AND "branchId" = ${branchId}` : Prisma.empty}
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
    const branchMap: Record<
      string,
      { branchId: string; branchName: string; sales: Record<string, number> }
    > = {};
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
    type BranchMonthlySalesRow = {
      branchId: string;
      branchName: string;
      month: string;
      sales: number | string | bigint;
    };
    for (const row of salesData as BranchMonthlySalesRow[]) {
      if (row.branchId && row.month && branchMap[row.branchId]) {
        branchMap[row.branchId].sales[row.month] = this.toNumber(row.sales);
      }
    }

    // Prepare total sales per month
    const totalSalesMap: Record<string, number> = {};
    for (const m of monthsArr) totalSalesMap[m] = 0;
    type TotalMonthlySalesRow = {
      month: string;
      sales: number | string | bigint;
    };
    for (const row of totalSalesData as TotalMonthlySalesRow[]) {
      if (row.month) totalSalesMap[row.month] = this.toNumber(row.sales);
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

  async getRevenueForPeriod(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    branchId?: string,
  ): Promise<number> {
    const result = await this.prisma.sale.aggregate({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
        ...(branchId ? { branchId } : {}),
      },
      _sum: { total: true },
    });
    return result._sum.total || 0;
  }

  async getSalesCountForPeriod(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    branchId?: string,
  ): Promise<number> {
    return this.prisma.sale.count({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
        ...(branchId ? { branchId } : {}),
      },
    });
  }
}
