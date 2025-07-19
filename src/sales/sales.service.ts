import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSaleDto } from './create-sale.dto';
import { SaleReceiptDto } from './sale-receipt.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async createSale(dto: CreateSaleDto & { mpesaTransactionId?: string }, tenantId: string, userId: string): Promise<SaleReceiptDto> {
    const saleId = uuidv4();
    const now = new Date();
    let total = 0;
    const receiptItems: { productId: string; name: string; price: number; quantity: number }[] = [];
    // Validate and update stock
    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || product.tenantId !== tenantId) throw new BadRequestException('Invalid product');
      if (product.stock < item.quantity) throw new BadRequestException(`Insufficient stock for ${product.name}`);
      total += product.price * item.quantity;
      receiptItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });
    }
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
          paymentType: dto.paymentMethod,
          createdAt: now,
          mpesaTransactionId: dto.mpesaTransactionId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
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
    return {
      saleId,
      date: now,
      items: receiptItems,
      total,
      paymentMethod: dto.paymentMethod,
      amountReceived: dto.amountReceived,
      change: dto.amountReceived - total,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
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
    // Total sales and revenue
    const sales = await this.prisma.sale.findMany({
      where: { tenantId },
      include: { items: true },
    });
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);

    // Top products
    const productStats: Record<string, { name: string; unitsSold: number; revenue: number }> = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;
        if (!productStats[product.id]) {
          productStats[product.id] = { name: product.name, unitsSold: 0, revenue: 0 };
        }
        productStats[product.id].unitsSold += item.quantity;
        productStats[product.id].revenue += item.price * item.quantity;
      }
    }
    const topProducts = Object.entries(productStats)
      .map(([id, stat]) => ({ id, ...stat }))
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);

    // Low stock products
    const lowStock = await this.prisma.product.findMany({
      where: { tenantId, stock: { lt: 5 } },
      select: { id: true, name: true, stock: true },
    });

    // Payment method breakdown
    const paymentBreakdown: Record<string, number> = {};
    for (const sale of sales) {
      paymentBreakdown[sale.paymentType] = (paymentBreakdown[sale.paymentType] || 0) + 1;
    }

    return {
      totalSales,
      totalRevenue,
      topProducts,
      lowStock,
      paymentBreakdown,
    };
  }
} 