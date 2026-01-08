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

  async generateSalesReport(
    tenantId: string,
    branchId: string,
    format: 'xlsx' | 'csv' = 'xlsx',
    period: '7days' | '30days' | '90days' | '1year' | 'all' = '30days',
    specificMonth?: { year: number; month: number }, // Optional: for specific month reports
  ): Promise<{ filePath: string; filename: string }> {
    const salesData = await this.dataService.getSalesData(tenantId, branchId);
    const tenantInfo = await this.dataService.getTenantInfo(tenantId);
    const branchInfo = await this.dataService.getBranchInfo(tenantId, branchId);

    // Calculate date range
    let endDate = new Date();
    let startDate = new Date();
    
    if (specificMonth) {
      // For specific month reports
      startDate = new Date(specificMonth.year, specificMonth.month, 1);
      endDate = new Date(specificMonth.year, specificMonth.month + 1, 0, 23, 59, 59, 999);
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
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    let periodLabel: string = period;
    if (specificMonth) {
      periodLabel = `${monthNames[specificMonth.month]} ${specificMonth.year}`;
    }

    // Prepare data for export
    const reportData = [
      ['Sales Report'],
      [`Business: ${tenantInfo.name || 'N/A'}`],
      [`Branch: ${branchInfo.name || 'N/A'}`],
      [`Period: ${periodLabel}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Summary'],
      ['Total Revenue', salesData.totalRevenue || 0],
      ['Total Sales', salesData.totalSales || 0],
      ['Average Sale', salesData.averageSale || 0],
      ['Highest Sale', salesData.highestSale || 0],
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

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(reportData);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Date
      { wch: 20 }, // Sale ID
      { wch: 20 }, // Customer
      { wch: 12 }, // Total
      { wch: 12 }, // Items Count
      { wch: 15 }, // Payment Method
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let periodSuffix: string = period;
    if (specificMonth) {
      periodSuffix = `${monthNames[specificMonth.month].toLowerCase()}-${specificMonth.year}`;
    }
    const filename = `sales-report-${periodSuffix}-${timestamp}.${format}`;

    // Ensure reports directory exists
    const reportsDir = join(process.cwd(), 'reports');
    if (!existsSync(reportsDir)) {
      await mkdir(reportsDir, { recursive: true });
    }

    const filePath = join(reportsDir, filename);

    if (format === 'xlsx') {
      XLSX.writeFile(wb, filePath);
    } else {
      // CSV format
      const csv = XLSX.utils.sheet_to_csv(ws);
      await writeFile(filePath, csv, 'utf-8');
    }

    return { filePath, filename };
  }

  async generateInventoryReport(
    tenantId: string,
    branchId: string,
    format: 'xlsx' | 'csv' = 'xlsx',
  ): Promise<{ filePath: string; filename: string }> {
    const inventoryData = await this.dataService.getInventoryData(tenantId, branchId);
    const tenantInfo = await this.dataService.getTenantInfo(tenantId);
    const branchInfo = await this.dataService.getBranchInfo(tenantId, branchId);

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
      [`Business: ${tenantInfo.name || 'N/A'}`],
      [`Branch: ${branchInfo.name || 'N/A'}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Summary'],
      ['Total Items', inventoryData.totalItems],
      ['Low Stock Items', inventoryData.lowStockCount],
      ['Out of Stock Items', inventoryData.outOfStockCount],
      ['Total Inventory Value', inventoryData.totalValue],
      [],
      ['Detailed Inventory'],
      ['Product Name', 'SKU', 'Quantity', 'Min Stock', 'Max Stock', 'Status', 'Unit Price', 'Total Value'],
    ];

    inventory.forEach((item) => {
      const status = item.quantity === 0 ? 'Out of Stock' : item.quantity <= item.minStock ? 'Low Stock' : 'In Stock';
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

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(reportData);

    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Product Name
      { wch: 15 }, // SKU
      { wch: 10 }, // Quantity
      { wch: 10 }, // Min Stock
      { wch: 10 }, // Max Stock
      { wch: 12 }, // Status
      { wch: 12 }, // Unit Price
      { wch: 12 }, // Total Value
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Report');

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `inventory-report-${timestamp}.${format}`;

    // Ensure reports directory exists
    const reportsDir = join(process.cwd(), 'reports');
    if (!existsSync(reportsDir)) {
      await mkdir(reportsDir, { recursive: true });
    }

    const filePath = join(reportsDir, filename);

    if (format === 'xlsx') {
      XLSX.writeFile(wb, filePath);
    } else {
      // CSV format
      const csv = XLSX.utils.sheet_to_csv(ws);
      await writeFile(filePath, csv, 'utf-8');
    }

    return { filePath, filename };
  }

  async generateProductReport(
    tenantId: string,
    branchId: string,
    format: 'xlsx' | 'csv' = 'xlsx',
  ): Promise<{ filePath: string; filename: string }> {
    const productData = await this.dataService.getProductData(tenantId, branchId);
    const tenantInfo = await this.dataService.getTenantInfo(tenantId);

    // Prepare data for export
    const reportData = [
      ['Product Performance Report'],
      [`Business: ${tenantInfo.name || 'N/A'}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Summary'],
      ['Total Products', productData.totalProducts],
      ['Total Product Revenue', productData.metrics?.totalProductRevenue || 0],
      ['Average Product Revenue', productData.metrics?.averageProductRevenue || 0],
      [],
      ['Top Products'],
      ['Product Name', 'Revenue', 'Units Sold', 'Sales Count', 'Average Price'],
    ];

    productData.topProducts.forEach((product: any) => {
      reportData.push([
        product.name,
        product.revenue || 0,
        product.quantity || 0,
        product.salesCount || 0,
        product.averagePrice || product.price || 0,
      ]);
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(reportData);

    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // Product Name
      { wch: 15 }, // Revenue
      { wch: 12 }, // Units Sold
      { wch: 12 }, // Sales Count
      { wch: 15 }, // Average Price
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Product Report');

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `product-report-${timestamp}.${format}`;

    // Ensure reports directory exists
    const reportsDir = join(process.cwd(), 'reports');
    if (!existsSync(reportsDir)) {
      await mkdir(reportsDir, { recursive: true });
    }

    const filePath = join(reportsDir, filename);

    if (format === 'xlsx') {
      XLSX.writeFile(wb, filePath);
    } else {
      // CSV format
      const csv = XLSX.utils.sheet_to_csv(ws);
      await writeFile(filePath, csv, 'utf-8');
    }

    return { filePath, filename };
  }
}

