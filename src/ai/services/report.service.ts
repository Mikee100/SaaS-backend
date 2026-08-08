import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DataService } from './data.service';
import * as XLSX from 'xlsx';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataService: DataService,
  ) {}

  private asObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : null;
  }

  private asNumber(value: unknown): number {
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

  private asString(value: unknown, fallback: string = ''): string {
    return typeof value === 'string' ? value : fallback;
  }

  /** Builds the workbook, writes it (xlsx or csv), and returns its path. */
  private async writeReportWorkbook(
    rows: (string | number)[][],
    colWidths: number[],
    sheetName: string,
    filenamePrefix: string,
    format: 'xlsx' | 'csv',
  ): Promise<{ filePath: string; filename: string }> {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = colWidths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${filenamePrefix}-${timestamp}.${format}`;

    const reportsDir = join(process.cwd(), 'reports');
    if (!existsSync(reportsDir)) {
      await mkdir(reportsDir, { recursive: true });
    }
    const filePath = join(reportsDir, filename);

    if (format === 'xlsx') {
      XLSX.writeFile(wb, filePath);
    } else {
      const csv = XLSX.utils.sheet_to_csv(ws);
      await writeFile(filePath, csv, 'utf-8');
    }

    return { filePath, filename };
  }

  async generateSalesReport(
    tenantId: string,
    branchId: string,
    format: 'xlsx' | 'csv' = 'xlsx',
    period: '7days' | '30days' | '90days' | '1year' | 'all' = '30days',
    specificMonth?: { year: number; month: number }, // Optional: for specific month reports
  ): Promise<{ filePath: string; filename: string }> {
    const salesDataRaw: unknown = await this.dataService.getSalesData(
      tenantId,
      branchId,
    );
    const tenantInfoRaw: unknown =
      await this.dataService.getTenantInfo(tenantId);
    const branchInfoRaw: unknown = await this.dataService.getBranchInfo(
      tenantId,
      branchId,
    );
    const salesData = this.asObject(salesDataRaw) ?? {};
    const tenantInfo = this.asObject(tenantInfoRaw) ?? {};
    const branchInfo = this.asObject(branchInfoRaw) ?? {};

    // Calculate date range
    let endDate = new Date();
    let startDate = new Date();

    if (specificMonth) {
      // For specific month reports
      startDate = new Date(specificMonth.year, specificMonth.month, 1);
      endDate = new Date(
        specificMonth.year,
        specificMonth.month + 1,
        0,
        23,
        59,
        59,
        999,
      );
    } else {
      // For period-based reports
      switch (period) {
        case '7days':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '90days':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case 'all':
          startDate.setFullYear(2000); // Very old date
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }
    }

    // Get detailed sales
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        branchId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        SaleItem: {
          include: {
            product: {
              select: {
                name: true,
                sku: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Prepare month name for title
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    let periodLabel: string = period;
    if (specificMonth) {
      periodLabel = `${monthNames[specificMonth.month]} ${specificMonth.year}`;
    }

    // Prepare data for export
    const reportData = [
      ['Sales Report'],
      [`Business: ${this.asString(tenantInfo.name, 'N/A')}`],
      [`Branch: ${this.asString(branchInfo.name, 'N/A')}`],
      [`Period: ${periodLabel}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Summary'],
      ['Total Revenue', this.asNumber(salesData.totalRevenue)],
      ['Total Sales', this.asNumber(salesData.totalSales)],
      ['Average Sale', this.asNumber(salesData.averageSale)],
      ['Highest Sale', this.asNumber(salesData.highestSale)],
      [],
      ['Detailed Sales'],
      ['Date', 'Sale ID', 'Customer', 'Total', 'Items Count', 'Payment Method'],
    ];

    sales.forEach((sale) => {
      reportData.push([
        sale.createdAt.toLocaleDateString(),
        sale.id,
        sale.customerName || 'Walk-in',
        sale.total,
        sale.SaleItem.length,
        sale.paymentType || 'N/A',
      ]);
    });

    let periodSuffix: string = period;
    if (specificMonth) {
      periodSuffix = `${monthNames[specificMonth.month].toLowerCase()}-${specificMonth.year}`;
    }

    return this.writeReportWorkbook(
      reportData,
      [12, 20, 20, 12, 12, 15],
      'Sales Report',
      `sales-report-${periodSuffix}`,
      format,
    );
  }

  async generateInventoryReport(
    tenantId: string,
    branchId: string,
    format: 'xlsx' | 'csv' = 'xlsx',
  ): Promise<{ filePath: string; filename: string }> {
    const inventoryDataRaw: unknown = await this.dataService.getInventoryData(
      tenantId,
      branchId,
    );
    const tenantInfoRaw: unknown =
      await this.dataService.getTenantInfo(tenantId);
    const branchInfoRaw: unknown = await this.dataService.getBranchInfo(
      tenantId,
      branchId,
    );
    const inventoryData = this.asObject(inventoryDataRaw) ?? {};
    const tenantInfo = this.asObject(tenantInfoRaw) ?? {};
    const branchInfo = this.asObject(branchInfoRaw) ?? {};

    // Get detailed inventory
    const inventory = await this.prisma.inventory.findMany({
      where: { tenantId, branchId },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
            price: true,
          },
        },
      },
      orderBy: { quantity: 'asc' },
    });

    // Prepare data for export
    const reportData = [
      ['Inventory Report'],
      [`Business: ${this.asString(tenantInfo.name, 'N/A')}`],
      [`Branch: ${this.asString(branchInfo.name, 'N/A')}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Summary'],
      ['Total Items', this.asNumber(inventoryData.totalItems)],
      ['Low Stock Items', this.asNumber(inventoryData.lowStockCount)],
      ['Out of Stock Items', this.asNumber(inventoryData.outOfStockCount)],
      ['Total Inventory Value', this.asNumber(inventoryData.totalValue)],
      [],
      ['Detailed Inventory'],
      [
        'Product Name',
        'SKU',
        'Quantity',
        'Min Stock',
        'Max Stock',
        'Status',
        'Unit Price',
        'Total Value',
      ],
    ];

    inventory.forEach((item) => {
      const status =
        item.quantity === 0
          ? 'Out of Stock'
          : item.quantity <= item.minStock
            ? 'Low Stock'
            : 'In Stock';
      const totalValue = item.quantity * (item.product.price || 0);
      reportData.push([
        item.product.name,
        item.product.sku,
        item.quantity,
        item.minStock,
        item.maxStock,
        status,
        item.product.price || 0,
        totalValue,
      ]);
    });

    return this.writeReportWorkbook(
      reportData,
      [25, 15, 10, 10, 10, 12, 12, 12],
      'Inventory Report',
      'inventory-report',
      format,
    );
  }

  async generateProductReport(
    tenantId: string,
    branchId: string,
    format: 'xlsx' | 'csv' = 'xlsx',
  ): Promise<{ filePath: string; filename: string }> {
    const productDataRaw: unknown = await this.dataService.getProductData(
      tenantId,
      branchId,
    );
    const tenantInfoRaw: unknown =
      await this.dataService.getTenantInfo(tenantId);
    const productData = this.asObject(productDataRaw) ?? {};
    const productMetrics = this.asObject(productData.metrics) ?? {};
    const tenantInfo = this.asObject(tenantInfoRaw) ?? {};

    // Prepare data for export
    const reportData = [
      ['Product Performance Report'],
      [`Business: ${this.asString(tenantInfo.name, 'N/A')}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Summary'],
      ['Total Products', this.asNumber(productData.totalProducts)],
      [
        'Total Product Revenue',
        this.asNumber(productMetrics.totalProductRevenue),
      ],
      [
        'Average Product Revenue',
        this.asNumber(productMetrics.averageProductRevenue),
      ],
      [],
      ['Top Products'],
      ['Product Name', 'Revenue', 'Units Sold', 'Sales Count', 'Average Price'],
    ];

    const topProducts = Array.isArray(productData.topProducts)
      ? productData.topProducts
      : [];
    topProducts.forEach((product) => {
      const row = this.asObject(product) ?? {};
      reportData.push([
        this.asString(row.name, 'Unknown Product'),
        this.asNumber(row.revenue),
        this.asNumber(row.quantity),
        this.asNumber(row.salesCount),
        this.asNumber(row.averagePrice) || this.asNumber(row.price),
      ]);
    });

    return this.writeReportWorkbook(
      reportData,
      [30, 15, 12, 12, 15],
      'Product Report',
      'product-report',
      format,
    );
  }

  async generatePayrollReport(
    tenantId: string,
    branchId: string,
    format: 'xlsx' | 'csv' = 'xlsx',
  ): Promise<{ filePath: string; filename: string }> {
    const payrollDataRaw: unknown = await this.dataService.getPayrollData(
      tenantId,
      branchId,
    );
    const tenantInfoRaw: unknown =
      await this.dataService.getTenantInfo(tenantId);
    const payrollData = this.asObject(payrollDataRaw) ?? {};
    const tenantInfo = this.asObject(tenantInfoRaw) ?? {};

    const reportData: (string | number)[][] = [
      ['Payroll Report'],
      [`Business: ${this.asString(tenantInfo.name, 'N/A')}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Summary'],
      ['Active Employees', this.asNumber(payrollData.employeeCount)],
      [
        'Total Active Salaries (per pay period)',
        this.asNumber(payrollData.totalActiveSalaries),
      ],
      [
        'Estimated Monthly Payroll Cost',
        this.asNumber(payrollData.monthlyPayrollTotal),
      ],
      [],
      ['Salary Schemes'],
      ['Employee', 'Salary Amount', 'Frequency', 'Next Due Date'],
    ];

    const schemes = Array.isArray(payrollData.schemes)
      ? payrollData.schemes
      : [];
    schemes.forEach((scheme) => {
      const row = this.asObject(scheme) ?? {};
      const nextDueDate = row.nextDueDate;
      reportData.push([
        this.asString(row.employeeName, 'Unknown'),
        this.asNumber(row.salaryAmount),
        this.asString(row.frequency, 'monthly'),
        nextDueDate ? new Date(nextDueDate as string).toLocaleDateString() : 'N/A',
      ]);
    });

    return this.writeReportWorkbook(
      reportData,
      [25, 15, 12, 15],
      'Payroll Report',
      'payroll-report',
      format,
    );
  }

  async generateRestaurantReport(
    tenantId: string,
    branchId: string,
    format: 'xlsx' | 'csv' = 'xlsx',
  ): Promise<{ filePath: string; filename: string }> {
    const restaurantDataRaw: unknown =
      await this.dataService.getRestaurantData(tenantId, branchId);
    const tenantInfoRaw: unknown =
      await this.dataService.getTenantInfo(tenantId);
    const restaurantData = this.asObject(restaurantDataRaw) ?? {};
    const tenantInfo = this.asObject(tenantInfoRaw) ?? {};

    const reportData: (string | number)[][] = [
      ['Restaurant Operations Report'],
      [`Business: ${this.asString(tenantInfo.name, 'N/A')}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Summary'],
      ['Total Tables', this.asNumber(restaurantData.totalTables)],
      [
        'Orders (Last 30 Days)',
        this.asNumber(restaurantData.totalOrdersLast30Days),
      ],
      [
        'Revenue (Last 30 Days)',
        this.asNumber(restaurantData.revenueLast30Days),
      ],
      [],
      ['Top Dishes (Last 30 Days)'],
      ['Dish', 'Units Sold'],
    ];

    const topItems = Array.isArray(restaurantData.topItems)
      ? restaurantData.topItems
      : [];
    topItems.forEach((item) => {
      const row = this.asObject(item) ?? {};
      reportData.push([
        this.asString(row.product, 'Unknown'),
        this.asNumber(row.quantitySold),
      ]);
    });

    return this.writeReportWorkbook(
      reportData,
      [30, 15],
      'Restaurant Report',
      'restaurant-report',
      format,
    );
  }

  async generateSalesTargetReport(
    tenantId: string,
    branchId: string,
    format: 'xlsx' | 'csv' = 'xlsx',
  ): Promise<{ filePath: string; filename: string }> {
    const targetDataRaw: unknown = await this.dataService.getSalesTargetData(
      tenantId,
      branchId,
    );
    const tenantInfoRaw: unknown =
      await this.dataService.getTenantInfo(tenantId);
    const targetData = this.asObject(targetDataRaw) ?? {};
    const tenantInfo = this.asObject(tenantInfoRaw) ?? {};

    const reportData: (string | number)[][] = [
      ['Sales Target Report'],
      [`Business: ${this.asString(tenantInfo.name, 'N/A')}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      [
        'Actual Revenue This Month So Far',
        this.asNumber(targetData.actualThisMonth),
      ],
      [],
      ['Targets'],
      ['Target Name', 'Monthly Goal', 'Actual This Month', 'Progress %'],
    ];

    const targets = Array.isArray(targetData.targets)
      ? targetData.targets
      : [];
    targets.forEach((target) => {
      const row = this.asObject(target) ?? {};
      reportData.push([
        this.asString(row.name, 'Target'),
        this.asNumber(row.monthly),
        this.asNumber(row.actualThisMonth),
        this.asNumber(row.progressPercent),
      ]);
    });

    return this.writeReportWorkbook(
      reportData,
      [25, 15, 18, 12],
      'Sales Targets',
      'sales-target-report',
      format,
    );
  }
}
