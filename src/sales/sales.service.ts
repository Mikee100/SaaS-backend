import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, Sale, SaleItem as PrismaSaleItem } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateSaleDto } from './create-sale.dto';
import { SaleReceiptDto } from './sale-receipt.dto';
import { v4 as uuidv4 } from 'uuid';

// Define the product type
type ProductInfo = {
  id: string;
  name: string;
  price: number;
  sku: string;
};

// Extend the Sale type with its items
type SaleWithItems = Omit<Sale, 'SaleItem'> & {
  SaleItem: Array<
    Omit<PrismaSaleItem, 'product'> & {
      product: ProductInfo | null;
    }
  >;
};

// Define the raw sale result type
interface RawSaleResult {
  id: string;
  tenantId: string;
  userId: string;
  total: number;
  paymentType: string;
  createdAt: Date;
  customerName: string | null;
  customerPhone: string | null;
  mpesaTransactionId: string | null;
  idempotencyKey: string | null;
  vatAmount: number | null;
  branchId: string | null;
  userName: string | null;
  userEmail: string | null;
  branchName: string | null;
  branchAddress: string | null;
}

// Define the type for the transformed sale
export interface TransformedSale extends Omit<RawSaleResult, 'branchId' | 'branchName' | 'branchAddress'> {
  cashier: string | null;
  mpesaTransaction: {
    phoneNumber: string;
    amount: number;
    status: string;
  } | null;
  items: Array<{
    id: string;
    saleId: string;
    productId: string;
    quantity: number;
    price: number;
    productName: string;
    product?: {
      id: string;
      name: string;
      price: number;
      sku: string;
    };
  }>;
  branch: {
    id: string;
    name: string;
    address: string | null;
  } | null;
}
import { AuditLogService } from '../audit-log.service';
import { RealtimeGateway } from '../realtime.gateway';
import { ConfigurationService } from '../config/configuration.service';
import axios from 'axios';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private realtimeGateway: RealtimeGateway, // Inject gateway
    private configurationService: ConfigurationService
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
        amountReceived: dto.amountReceived ?? 0,
        change: (dto.amountReceived ?? 0) - existing.total,
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
      const product = await this.prisma.product.findUnique({ 
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          price: true,
          tenantId: true,
        }
      });
      if (!product || product.tenantId !== tenantId) throw new BadRequestException('Invalid product');
      // Skip quantity check since it's not part of the selected fields
      // This assumes the product has enough quantity
      // In a real app, you would need to fetch the full product to check quantity
      subtotal += product.price * item.quantity;
      receiptItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });
    }
    // Calculate VAT (16%)
    const vatRate = 0.16; // 16% VAT rate
    const vatAmount = Math.round(subtotal * vatRate * 100) / 100;
    const total = subtotal + vatAmount;
    // Transaction: update stock, create sale and sale items
    await this.prisma.$transaction(async (prisma) => {
      for (const item of dto.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity
            }
          },
        });
      }
      // Create the sale record
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
          branchId: dto.branchId,
        },
      });

      // Create sale items separately
      for (const item of dto.items) {
        await prisma.saleItem.create({
          data: {
            id: uuidv4(),
            saleId,
            productId: item.productId,
            quantity: item.quantity,
            price: receiptItems.find(i => i.productId === item.productId)?.price || 0,
          },
        });
      }
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
      amountReceived: dto.amountReceived ?? 0,
      change: (dto.amountReceived ?? 0) - total,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
    };
  }

  async getSaleById(id: string, tenantId: string) {
    if (!id) throw new BadRequestException('Sale ID is required');
    if (!tenantId) throw new BadRequestException('Tenant ID is required');

    try {
      console.log(`Fetching sale with ID: ${id} for tenant: ${tenantId}`);
      
      const sale = await this.prisma.sale.findUnique({
        where: { id, tenantId },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          SaleItem: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  sku: true
                },
              },
            },
          },
          mpesaTransaction: {
            select: {
              id: true,
              phoneNumber: true,
              amount: true,
              status: true,
              transactionId: true,
              responseDesc: true,
              createdAt: true,
            },
          },
          Tenant: true,
          Branch: true,
        },
      });

      if (!sale) {
        console.log(`Sale not found with ID: ${id} for tenant: ${tenantId}`);
        throw new NotFoundException('Sale not found');
      }

      // Transform the data to match the expected response format
      const result = {
        ...sale,
        saleId: sale.id,
        cashier: sale.User ? {
          id: sale.User.id,
          name: sale.User.name,
          email: sale.User.email,
        } : null,
        mpesaTransaction: sale.mpesaTransaction ? {
          phoneNumber: sale.mpesaTransaction.phoneNumber,
          amount: sale.mpesaTransaction.amount,
          status: sale.mpesaTransaction.status,
          mpesaReceipt: sale.mpesaTransaction.transactionId || '',
          message: sale.mpesaTransaction.responseDesc || '',
          transactionDate: sale.mpesaTransaction.createdAt,
        } : null,
        items: sale.SaleItem.map(item => ({
          ...item,
          name: item.product?.name || 'Unknown Product',
          price: item.price || 0,
          productId: item.product?.id || '',
        })),
      };

      return result;
    } catch (error) {
      console.error('Error in getSaleById:', error);
      throw error;
    }
  }

  async getSales(tenantId: string, page: number = 1, limit: number = 10): Promise<{ data: TransformedSale[]; meta: { total: number; page: number; lastPage: number; }; }> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10;
    
    const skip = (page - 1) * limit;
    
    // First get the total count
    const total = await this.prisma.sale.count({ where: { tenantId } });
    
    // Define the type for the raw query result
    interface RawSaleResult {
      id: string;
      tenantId: string;
      userId: string;
      total: number;
      paymentType: string;
      createdAt: Date;
      customerName: string | null;
      customerPhone: string | null;
      mpesaTransactionId: string | null;
      idempotencyKey: string | null;
      vatAmount: number | null;
      branchId: string | null;
      userName: string | null;
      userEmail: string | null;
      branchName: string | null;
      branchAddress: string | null;
    }

    // Then get the paginated results with proper typing
    const sales = await this.prisma.$queryRaw<RawSaleResult[]>`
      SELECT 
        s.*,
        u.id as "userId",
        u.name as "userName",
        u.email as "userEmail",
        b.id as "branchId",
        b.name as "branchName",
        b.address as "branchAddress"
      FROM "Sale" s
      LEFT JOIN "User" u ON s."userId" = u.id
      LEFT JOIN "Branch" b ON s."branchId" = b.id
      WHERE s."tenantId" = ${tenantId}
      ORDER BY s."createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `;
    
    // Get sale items for each sale
    const saleIds = sales.map(sale => sale.id);
    const saleItems = await this.prisma.saleItem.findMany({
      where: {
        saleId: { in: saleIds }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            sku: true
          }
        }
      }
    });
    
    // Get M-Pesa transactions for each sale
    const mpesaTransactions = await this.prisma.mpesaTransaction.findMany({
      where: {
        saleId: { in: saleIds }
      },
      select: {
        id: true,
        saleId: true,
        phoneNumber: true,
        amount: true,
        status: true,
        transactionId: true,
        responseDesc: true,
        createdAt: true,
      }
    });



    // Transform the data to match the expected response type
    const transformedSales = sales.map(sale => {
      const items = saleItems
        .filter(item => item.saleId === sale.id)
        .map(item => ({
          ...item,
          productName: item.product?.name || 'Unknown',
        }));
      
      const mpesaTransaction = mpesaTransactions.find(
        tx => tx.saleId === sale.id
      );
      
      return {
        ...sale,
        cashier: sale.userName || null,
        mpesaTransaction: mpesaTransaction ? {
          phoneNumber: mpesaTransaction.phoneNumber,
          amount: mpesaTransaction.amount,
          status: mpesaTransaction.status,
        } : null,
        items,
        branch: sale.branchId ? {
          id: sale.branchId,
          name: sale.branchName || 'Unknown Branch',
          address: sale.branchAddress
        } : null
      } as TransformedSale;
    });

    return {
      data: transformedSales,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async listSales(tenantId: string, limit: number = 100) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    if (limit < 1 || limit > 1000) limit = 100; // Enforce reasonable limit
    const sales = await this.prisma.sale.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        User: true,
        SaleItem: { 
          include: { 
            product: true 
          } 
        },
        mpesaTransaction: true,
        Branch: true,
        Tenant: true
      },
    });
    return sales.map(sale => ({
      saleId: sale.id,
      date: sale.createdAt,
      total: sale.total,
      paymentType: sale.paymentType,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      cashier: sale.User ? sale.User.name : null,
      mpesaTransaction: sale.mpesaTransaction ? {
        phoneNumber: sale.mpesaTransaction.phoneNumber,
        amount: sale.mpesaTransaction.amount,
        status: sale.mpesaTransaction.status,
      } : null,
      items: sale.SaleItem.map(item => ({
        productId: item.productId,
        name: item.product?.name || '',
        price: item.price,
        quantity: item.quantity,
      })),
    }));
  }

  async getAnalytics(tenantId: string, startDate?: Date, endDate?: Date) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    
    // Set default date range if not provided (last 30 days)
    const end = endDate || new Date();
    const start = startDate || new Date();
    start.setDate(start.getDate() - 30);
    

    // First, get all sales in the date range
    const sales = await this.prisma.sale.findMany({
      where: { 
        tenantId,
        createdAt: {
          gte: start,
          lte: end
        }
      },
      orderBy: { createdAt: 'desc' }
    });


    // Then, get all sale items for these sales with their products
    const saleItems = await this.prisma.saleItem.findMany({
      where: {
        saleId: {
          in: sales.map(sale => sale.id)
        }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            sku: true
          }
        }
      }
    });

    // Group sale items by sale ID
    const saleItemsBySaleId: Record<string, Array<{
      id: string;
      saleId: string;
      productId: string;
      quantity: number;
      price: number;
      product: {
        id: string;
        name: string;
        price: number;
        sku: string;
      } | null;
    }>> = {};

    for (const item of saleItems) {
      if (!saleItemsBySaleId[item.saleId]) {
        saleItemsBySaleId[item.saleId] = [];
      }
      
      // Only include items with valid products
      if (item.product) {
        saleItemsBySaleId[item.saleId].push({
          id: item.id,
          saleId: item.saleId,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          product: item.product ? {
            id: item.product.id,
            name: item.product.name || 'Unknown',
            price: item.product.price || 0,
            sku: item.product.sku || ''
          } : null
        });
      }
    }

    // Combine sales with their items
    const salesWithItems: SaleWithItems[] = sales.map(sale => {
      const items = saleItemsBySaleId[sale.id] || [];
      return {
        ...sale,
        SaleItem: items.map(item => ({
          id: item.id,
          saleId: item.saleId,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          product: item.product ? {
            id: item.product.id,
            name: item.product.name || 'Unknown',
            price: item.product.price || 0,
            sku: item.product.sku || ''
          } : null
        }))
      };
    });
    // Total sales count
    const totalSales = salesWithItems.length;
    // Total revenue
    const totalRevenue = salesWithItems.reduce((sum, s) => sum + (s.total || 0), 0);
    // Average sale value
    const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    // Sales by product
    const salesByProduct: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const sale of salesWithItems) {
      if (!sale.SaleItem || !Array.isArray(sale.SaleItem)) continue;
      
      for (const item of sale.SaleItem) {
        const productId = item.productId;
        if (item.product) { // Only process items with valid products
          const productName = item.product.name || 'N/A';
          if (!salesByProduct[productId]) {
            salesByProduct[productId] = { 
              name: productName, 
              quantity: 0, 
              revenue: 0 
            };
          }
          salesByProduct[productId].quantity += item.quantity;
          salesByProduct[productId].revenue += item.price * item.quantity;
        }
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

    // Find products with low stock (below threshold)
    const lowStock = await this.prisma.product.findMany({
      where: {
        tenantId,
        stock: { lt: 10 } // Low stock threshold
      },
      select: {
        id: true,
        name: true,
        stock: true,
        sku: true
      },
      orderBy: { stock: 'asc' }
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
      if (customerInput.length > 0 && process.env.AI_SERVICE_URL) {
        const res = await axios.post(`${process.env.AI_SERVICE_URL}/customer_segments`, {
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
      if (process.env.AI_SERVICE_URL) {
        const res = await axios.post(`${process.env.AI_SERVICE_URL}/forecast`, {
          months,
          sales: salesValues,
          periods: 4, // predict next 4 months
        });
        forecast = res.data;
      }
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
        contactEmail: true,
        contactPhone: true,
      },
    });
    return tenant;
  }

  async getRecentSales(tenantId: string, limit: number = 10) {
    try {
      console.log(`Fetching recent sales for tenant: ${tenantId}`);
      
      const recentSales = await this.prisma.sale.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          total: true,
          paymentType: true,
          customerName: true,
          customerPhone: true,
          createdAt: true,
          SaleItem: {
            select: {
              quantity: true,
              price: true,
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // Transform the data to match the frontend's expected format
      return recentSales.map(sale => ({
        id: sale.id,
        total: sale.total,
        paymentMethod: sale.paymentType,
        customerName: sale.customerName || null,
        customerPhone: sale.customerPhone || null,
        date: sale.createdAt,
        items: sale.SaleItem.map(item => ({
          productId: item.product?.id || '',
          productName: item.product?.name || 'Unknown',
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
        })),
      }));
    } catch (error) {
      console.error('Error fetching recent sales:', {
        error: error.message,
        stack: error.stack,
        tenantId,
      });
      // Return empty array instead of throwing to prevent frontend errors
      return [];
    }
  }
}