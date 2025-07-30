import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSaleDto } from './create-sale.dto';
import { SaleReceiptDto } from './sale-receipt.dto';
import { v4 as uuidv4 } from 'uuid';
import { AuditLogService } from '../audit-log.service';
import { RealtimeGateway } from '../realtime.gateway';
import axios from 'axios';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private realtimeGateway: RealtimeGateway // Inject gateway
  ) {}

  async createSale(
    dto: CreateSaleDto & { mpesaTransactionId?: string; idempotencyKey: string },
    tenantId: string,
    userId: string
  ): Promise<SaleReceiptDto> {
    if (!dto.idempotencyKey) throw new BadRequestException('Missing idempotency key');
    // Check for existing sale with this idempotencyKey for this user
    const existing = await this.prisma.sale.findFirst({
      where: { idempotencyKey: dto.idempotencyKey, userId },
    });
    if (existing) {
      // Optionally, return a receipt DTO for the existing sale
      return {
        saleId: existing.id,
        date: existing.createdAt,
        items: [], // Optionally fetch items if needed
        subtotal: (existing.total ?? 0) - (existing.vatAmount ?? 0),
        total: existing.total,
        vatAmount: existing.vatAmount ?? 0,
        paymentMethod: existing.paymentType,
        amountReceived: dto.amountReceived,
        change: dto.amountReceived - existing.total,
        customerName: existing.customerName || undefined,
        customerPhone: existing.customerPhone || undefined,
      };
    }
    const saleId = uuidv4();
    const now = new Date();
    let subtotal = 0;
    const receiptItems: { productId: string; name: string; price: number; quantity: number }[] = [];
    // Validate and update stock
    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || product.tenantId !== tenantId) throw new BadRequestException('Invalid product');
      if (product.stock < item.quantity) throw new BadRequestException(`Insufficient stock for ${product.name}`);
      subtotal += product.price * item.quantity;
      receiptItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });
    }
    // Calculate VAT (16%)
    const vatAmount = Math.round(subtotal * 0.16 * 100) / 100;
    const total = subtotal + vatAmount;
    // Transaction: update stock, create sale and sale items
    await this.prisma.$transaction(async (prisma) => {
      for (const item of dto.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
      await prisma.sale.create({
        data: {
          id: saleId,
          tenantId,
          userId,
          total,
          vatAmount,
          paymentType: dto.paymentMethod,
          createdAt: now,
          mpesaTransactionId: dto.mpesaTransactionId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          idempotencyKey: dto.idempotencyKey,
          items: {
            create: dto.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: receiptItems.find(i => i.productId === item.productId)?.price || 0,
            })),
          },
        },
      });
    });
    // Audit log
    if (this.auditLogService) {
      await this.auditLogService.log(userId, 'sale_created', { saleId, items: dto.items, total }, undefined);
    }
    // Emit real-time events
    this.realtimeGateway.emitSalesUpdate({ saleId, items: dto.items, total });
    for (const item of dto.items) {
      this.realtimeGateway.emitInventoryUpdate({ productId: item.productId });
    }
    return {
      saleId,
      date: now,
      items: receiptItems,
      subtotal,
      total,
      vatAmount,
      paymentMethod: dto.paymentMethod,
      amountReceived: dto.amountReceived,
      change: dto.amountReceived - total,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
    };
  }

  async getSaleById(id: string, tenantId: string) {
    console.log('getSaleById called with ID:', id, 'and tenantId:', tenantId);
    
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        user: true,
        items: { include: { product: true } },
        mpesaTransaction: true,
      },
    });
    
    console.log('Database query result:', sale);
    
    if (!sale) {
      console.log('Sale not found in database');
      throw new NotFoundException('Sale not found');
    }

    console.log('Sale found, returning data');
    return {
      saleId: sale.id,
      date: sale.createdAt,
      total: sale.total,
      paymentType: sale.paymentType,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      cashier: sale.user ? sale.user.name : null,
      mpesaTransaction: sale.mpesaTransaction ? {
        phoneNumber: sale.mpesaTransaction.phoneNumber,
        amount: sale.mpesaTransaction.amount,
        status: sale.mpesaTransaction.status,
        mpesaReceipt: sale.mpesaTransaction.mpesaReceipt,
        message: sale.mpesaTransaction.message,
      } : null,
      items: sale.items.map(item => ({
        productId: item.productId,
        name: item.product?.name || '',
        price: item.price,
        quantity: item.quantity,
      })),
    };
  }

  async listSales(tenantId: string) {
    const sales = await this.prisma.sale.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        items: { include: { product: true } },
        mpesaTransaction: true,
      },
    });
    return sales.map(sale => ({
      saleId: sale.id,
      date: sale.createdAt,
      total: sale.total,
      paymentType: sale.paymentType,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      cashier: sale.user ? sale.user.name : null,
      mpesaTransaction: sale.mpesaTransaction ? {
        phoneNumber: sale.mpesaTransaction.phoneNumber,
        amount: sale.mpesaTransaction.amount,
        status: sale.mpesaTransaction.status,
        mpesaReceipt: sale.mpesaTransaction.mpesaReceipt,
        message: sale.mpesaTransaction.message,
      } : null,
      items: sale.items.map(item => ({
        productId: item.productId,
        name: item.product?.name || '',
        price: item.price,
        quantity: item.quantity,
      })),
    }));
  }

  async getAnalytics(tenantId: string) {
    // Fetch all sales for the tenant
    const sales = await this.prisma.sale.findMany({
      where: { tenantId },
      include: { items: { include: { product: true } } },
    });
    // Total sales count
    const totalSales = sales.length;
    // Total revenue
    const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);
    // Average sale value
    const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    // Sales by product
    const salesByProduct: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        if (!salesByProduct[item.productId]) {
          // Optionally fetch product name if needed
          salesByProduct[item.productId] = { name: item.product?.name || 'N/A', quantity: 0, revenue: 0 };
        }
        salesByProduct[item.productId].quantity += item.quantity;
        salesByProduct[item.productId].revenue += item.price * item.quantity;
      }
    }
    const topProducts = Object.entries(salesByProduct)
      .map(([id, data]) => ({
        id,
        name: data.name,
        unitsSold: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    // Sales by month
    const salesByMonth: Record<string, number> = {};
    for (const sale of sales) {
      const month = sale.createdAt.toISOString().slice(0, 7); // YYYY-MM
      salesByMonth[month] = (salesByMonth[month] || 0) + (sale.total || 0);
    }
    const paymentBreakdown: Record<string, number> = {};
    for (const sale of sales) {
      if (sale.paymentType) {
        paymentBreakdown[sale.paymentType] = (paymentBreakdown[sale.paymentType] || 0) + 1;
      }
    }
    // Top customers (by name/phone)
    const customerMap: Record<string, { name: string; phone: string; total: number; count: number; lastPurchase?: Date }> = {};
    for (const sale of sales) {
      const key = (sale.customerName || '-') + (sale.customerPhone || '-');
      if (!customerMap[key]) {
        customerMap[key] = {
          name: sale.customerName || '-',
          phone: sale.customerPhone || '-',
          total: 0,
          count: 0,
        };
      }
      customerMap[key].total += sale.total || 0;
      customerMap[key].count += 1;
      // Track last purchase date for each customer
      if (!customerMap[key].lastPurchase || new Date(sale.createdAt) > new Date(customerMap[key].lastPurchase)) {
        customerMap[key].lastPurchase = sale.createdAt;
      }
    }
    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const lowStock = await this.prisma.product.findMany({
      where: {
        tenantId,
        stock: { lt: 10 }, // Low stock threshold
      },
    });
    // Prepare customer data for segmentation
    const customerInput = Object.values(customerMap).map(c => ({
      name: c.name,
      total: c.total,
      count: c.count,
      last_purchase: c.lastPurchase || new Date().toISOString(),
    }));
    let customerSegments = [];
    try {
      if (customerInput.length > 0) {
        const res = await axios.post('http://localhost:5000/customer_segments', {
          customers: customerInput,
        });
        customerSegments = res.data;
      }
    } catch (e) {
      // Segmentation service not available or error
    }
    // After calculating salesByMonth
    const months = Object.keys(salesByMonth);
    const salesValues = Object.values(salesByMonth);
    let forecast = { forecast_months: [], forecast_sales: [] };
    try {
      const res = await axios.post('http://localhost:5000/forecast', {
        months,
        sales: salesValues,
        periods: 4, // predict next 4 months
      });
      forecast = res.data;
    } catch (e) {
      // Forecasting service not available or error
    }
    return {
      totalSales,
      totalRevenue,
      avgSaleValue,
      topProducts,
      salesByMonth,
      topCustomers,
      forecast,
      customerSegments,
      paymentBreakdown,
      lowStock,
    };
  }

  async getTenantInfo(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        address: true,
        phone: true,
        email: true,
      },
    });
    return tenant;
  }
} 