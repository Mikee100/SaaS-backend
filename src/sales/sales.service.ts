import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Sale, SaleItem as PrismaSaleItem } from '@prisma/client';
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
  cost: number;
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
export interface TransformedSale
  extends Omit<RawSaleResult, 'branchId' | 'branchName' | 'branchAddress'> {
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
import { SubscriptionService } from '../billing/subscription.service';
import axios from 'axios';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private realtimeGateway: RealtimeGateway, // Inject gateway
    private configurationService: ConfigurationService,
    private subscriptionService: SubscriptionService,
  ) {}

  async createSale(
    dto: CreateSaleDto & {
      mpesaTransactionId?: string;
      idempotencyKey: string;
    },
    tenantId: string,
    userId: string,
  ): Promise<SaleReceiptDto> {
    if (!dto.idempotencyKey)
      throw new BadRequestException('Missing idempotency key');
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

    // Check plan limits for sales
    const canCreateSale =
      await this.subscriptionService.canCreateSale(tenantId);
    if (!canCreateSale) {
      const subscription =
        await this.subscriptionService.getCurrentSubscription(tenantId);
      const maxSalesPerMonth = subscription.plan?.maxSalesPerMonth || 0;
      throw new ForbiddenException(
        `Sales limit exceeded. Your plan allows up to ${maxSalesPerMonth} sales per month. Please upgrade your plan to create more sales.`,
      );
    }

    const saleId = uuidv4();
    const now = new Date();
    let subtotal = 0;
    const receiptItems: {
      productId: string;
      variationId?: string;
      name: string;
      price: number;
      quantity: number;
    }[] = [];
    // Validate items and build receipt items
    for (const item of dto.items) {
      // Try to find product, including soft-deleted ones to give better error message
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          price: true,
          tenantId: true,
          deletedAt: true,
        },
      });

      if (!product) {
        this.logger.error(`Product not found: ${item.productId}`, {
          productId: item.productId,
          tenantId,
        });
        throw new BadRequestException(
          `Product with ID ${item.productId} not found. Please sync your product catalog or use a different product.`
        );
      }

      // Check if product is soft-deleted
      if (product.deletedAt) {
        this.logger.warn(`Attempted to sell soft-deleted product: ${item.productId}`, {
          productId: item.productId,
          deletedAt: product.deletedAt,
        });
        throw new BadRequestException(
          `Product "${product.name || item.productId}" has been deleted and cannot be sold. Please sync your product catalog.`
        );
      }
      // In multi-tenant setups we normally enforce tenant ownership.
      // However, some legacy data may have products without a matching tenantId.
      // To avoid blocking valid POS usage, log a warning instead of throwing.
      if (product.tenantId !== tenantId) {
        this.logger.warn(
          `Product tenant mismatch when creating sale. Using product anyway.`,
          {
            productId: product.id,
            productTenantId: product.tenantId,
            requestTenantId: tenantId,
          },
        );
      }

      let itemPrice = product.price;
      let itemName = product.name;

      if (item.variationId) {
        try {
          const variation = await this.prisma.productVariation.findFirst({
            where: {
              id: item.variationId,
              productId: item.productId,
              tenantId,
              isActive: true,
            },
            select: { id: true, sku: true, price: true, stock: true, attributes: true },
          });
          if (!variation) {
            this.logger.error(`Variation not found: ${item.variationId} for product ${item.productId}`, {
              variationId: item.variationId,
              productId: item.productId,
              tenantId,
            });
            throw new BadRequestException(`Invalid variation: ${item.variationId}`);
          }
          if (variation.stock < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for variation ${variation.sku}. Available: ${variation.stock}, Requested: ${item.quantity}`,
            );
          }
          itemPrice = item.price ?? variation.price ?? product.price;
          const attrStr =
            variation.attributes && typeof variation.attributes === 'object'
              ? Object.values(variation.attributes).join(', ')
              : variation.sku;
          itemName = `${product.name} - ${attrStr}`;
        } catch (error) {
          this.logger.error(`Error fetching variation ${item.variationId}:`, error);
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw new BadRequestException(`Failed to fetch variation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      subtotal += itemPrice * item.quantity;
      receiptItems.push({
        productId: product.id,
        ...(item.variationId && { variationId: item.variationId }),
        name: itemName,
        price: itemPrice,
        quantity: item.quantity,
      });
    }
    // Validate branchId if provided
    let validBranchId: string | null = dto.branchId || null;
    if (dto.branchId) {
      const branchExists = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
        select: { id: true, tenantId: true },
      });
      if (!branchExists || branchExists.tenantId !== tenantId) {
        this.logger.warn(
          `Invalid branchId ${dto.branchId} for tenant ${tenantId}, setting to null`,
        );
        validBranchId = null;
      }
    }

    // Apply discount (optional): cap at subtotal, then VAT on discounted subtotal
    const discountAmount = Math.max(
      0,
      Math.min(dto.discountAmount ?? 0, subtotal),
    );
    const subtotalAfterDiscount = subtotal - discountAmount;
    // Calculate VAT (16%) on discounted subtotal
    const vatRate = 0.16; // 16% VAT rate
    const vatAmount = Math.round(subtotalAfterDiscount * vatRate * 100) / 100;
    const total = Math.round((subtotalAfterDiscount + vatAmount) * 100) / 100;
    
    // Handle split payments (declare outside transaction so it's accessible in return statement)
    let paymentType = dto.paymentMethod;
    let creditCreateData: any = null;
    let mpesaTransactionId = dto.mpesaTransactionId;
    let amountReceived = dto.amountReceived;

    if (dto.isSplitPayment && dto.splitPayments && dto.splitPayments.length > 0) {
      // For split payments, set paymentType to 'split'
      paymentType = 'split';
      
      // Calculate total amount received (sum of cash amounts)
      amountReceived = dto.splitPayments
        .filter(p => p.method === 'cash')
        .reduce((sum, p) => sum + (p.amountReceived || p.amount), 0);

      // Get M-Pesa transaction ID from split payments if any
      const mpesaPayment = dto.splitPayments.find(p => p.method === 'mpesa');
      if (mpesaPayment?.mpesaTransactionId) {
        mpesaTransactionId = mpesaPayment.mpesaTransactionId;
      }

      // Handle credit portion of split payment
      const creditPayment = dto.splitPayments.find(p => p.method === 'credit');
      if (creditPayment) {
        creditCreateData = {
          tenantId,
          customerName: dto.customerName || '',
          customerPhone: dto.customerPhone,
          totalAmount: creditPayment.amount,
          balance: creditPayment.amount,
          dueDate: creditPayment.creditDueDate
            ? new Date(creditPayment.creditDueDate)
            : null,
          notes: creditPayment.creditNotes || dto.creditNotes,
        };
      }
    } else if (dto.paymentMethod === 'credit') {
      // Single credit payment
      creditCreateData = {
        tenantId,
        customerName: dto.customerName || '',
        customerPhone: dto.customerPhone,
        totalAmount: dto.creditAmount || total,
        balance: dto.creditAmount || total,
        dueDate: dto.creditDueDate
          ? new Date(dto.creditDueDate)
          : null,
        notes: dto.creditNotes,
      };
    }

    // Transaction: update stock, create sale and sale items, handle credit if applicable
    await this.prisma.$transaction(async (prisma) => {
      for (const item of dto.items) {
        try {
          if (item.variationId) {
            // Verify variation exists and is active before updating
            const variation = await prisma.productVariation.findFirst({
              where: {
                id: item.variationId,
                productId: item.productId,
                tenantId,
                isActive: true,
              },
              select: { id: true, stock: true },
            });
            
            if (!variation) {
              throw new BadRequestException(
                `Variation ${item.variationId} not found or inactive`
              );
            }
            
            if (variation.stock < item.quantity) {
              throw new BadRequestException(
                `Insufficient stock for variation. Available: ${variation.stock}, Requested: ${item.quantity}`
              );
            }
            
            await prisma.productVariation.update({
              where: { id: item.variationId },
              data: { stock: { decrement: item.quantity } },
            });
          } else {
            // Verify product exists before updating
            const product = await prisma.product.findUnique({
              where: { id: item.productId },
              select: { id: true, stock: true },
            });
            
            if (!product) {
              throw new BadRequestException(
                `Product ${item.productId} not found`
              );
            }
            
            if (product.stock < item.quantity) {
              throw new BadRequestException(
                `Insufficient stock for product. Available: ${product.stock}, Requested: ${item.quantity}`
              );
            }
            
            await prisma.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            });
          }
        } catch (error) {
          this.logger.error(`Error updating stock for item:`, {
            productId: item.productId,
            variationId: item.variationId,
            quantity: item.quantity,
            tenantId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
          // Re-throw BadRequestException as-is
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw new BadRequestException(
            `Failed to update stock: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      if (dto.isSplitPayment && dto.splitPayments && dto.splitPayments.length > 0) {
        // For split payments, set paymentType to 'split'
        paymentType = 'split';
        
        // Calculate total amount received (sum of cash amounts)
        amountReceived = dto.splitPayments
          .filter(p => p.method === 'cash')
          .reduce((sum, p) => sum + (p.amountReceived || p.amount), 0);

        // Get M-Pesa transaction ID from split payments if any
        const mpesaPayment = dto.splitPayments.find(p => p.method === 'mpesa');
        if (mpesaPayment?.mpesaTransactionId) {
          mpesaTransactionId = mpesaPayment.mpesaTransactionId;
        }

        // Handle credit portion of split payment
        const creditPayment = dto.splitPayments.find(p => p.method === 'credit');
        if (creditPayment) {
          creditCreateData = {
            tenantId,
            customerName: dto.customerName || '',
            customerPhone: dto.customerPhone,
            totalAmount: creditPayment.amount,
            balance: creditPayment.amount,
            dueDate: creditPayment.creditDueDate
              ? new Date(creditPayment.creditDueDate)
              : null,
            notes: creditPayment.creditNotes || dto.creditNotes,
          };
        }
      } else if (dto.paymentMethod === 'credit') {
        // Single credit payment
        creditCreateData = {
          tenantId,
          customerName: dto.customerName || '',
          customerPhone: dto.customerPhone,
          totalAmount: dto.creditAmount || total,
          balance: dto.creditAmount || total,
          dueDate: dto.creditDueDate
            ? new Date(dto.creditDueDate)
            : null,
          notes: dto.creditNotes,
        };
      }

      // Create the sale record with nested credit if applicable
      const saleData: any = {
        id: saleId,
        tenantId,
        userId,
        total,
        vatAmount,
        paymentType,
        createdAt: now,
        mpesaTransactionId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        idempotencyKey: dto.idempotencyKey,
        branchId: validBranchId,
        ...(creditCreateData
          ? {
              credit: {
                create: creditCreateData,
              },
            }
          : {}),
      };

      await prisma.sale.create({
        data: saleData,
      });

      // Create sale items separately
      for (const item of dto.items) {
        const receiptItem = receiptItems.find(
          (r) =>
            r.productId === item.productId &&
            (r.variationId || null) === (item.variationId || null),
        );
        await prisma.saleItem.create({
          data: {
            id: uuidv4(),
            saleId,
            productId: item.productId,
            variationId: item.variationId ?? null,
            quantity: item.quantity,
            price: receiptItem?.price ?? 0,
          },
        });
      }
    });
    // Audit log
    if (this.auditLogService) {
      await this.auditLogService.log(
        userId,
        'sale_created',
        { saleId, items: dto.items, total },
        undefined,
      );
    }
    // Emit real-time events
    this.realtimeGateway.emitSalesUpdate({ saleId, items: dto.items, total });
    for (const item of dto.items) {
      this.realtimeGateway.emitInventoryUpdate({ productId: item.productId });
    }
    // Calculate change for split payments
    let change = 0;
    let finalAmountReceived = dto.amountReceived ?? 0;
    
    if (dto.isSplitPayment && dto.splitPayments) {
      // For split payments, calculate change from cash portions
      const cashPayments = dto.splitPayments.filter(p => p.method === 'cash');
      const totalCashReceived = cashPayments.reduce((sum, p) => sum + (p.amountReceived || p.amount), 0);
      const totalCashAmount = cashPayments.reduce((sum, p) => sum + p.amount, 0);
      change = totalCashReceived - totalCashAmount;
      finalAmountReceived = totalCashReceived;
    } else {
      change = (dto.amountReceived ?? 0) - total;
    }

    return {
      saleId,
      date: now,
      items: receiptItems,
      subtotal,
      total,
      vatAmount,
      paymentMethod: paymentType,
      amountReceived: finalAmountReceived,
      change,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      isSplitPayment: dto.isSplitPayment || false,
      splitPayments: dto.splitPayments || undefined,
    };
  }

  async createReturn(
    saleId: string,
    tenantId: string,
    userId: string,
    items: { productId: string; quantity: number; unitPrice: number }[],
    reason?: string,
  ) {
    if (!saleId) throw new BadRequestException('Sale ID is required');
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Return must include at least one item');
    }

    const originalSale = await this.prisma.sale.findUnique({
      where: { id: saleId, tenantId },
      include: {
        SaleItem: true,
      },
    });

    if (!originalSale) {
      throw new NotFoundException('Original sale not found');
    }

    // Map original quantities by product for simple validation
    const originalQuantities = new Map<string, number>();
    for (const item of originalSale.SaleItem) {
      const prev = originalQuantities.get(item.productId) ?? 0;
      originalQuantities.set(item.productId, prev + item.quantity);
    }

    let refundSubtotal = 0;
    for (const item of items) {
      if (!item.productId) {
        throw new BadRequestException('Each return item must include productId');
      }
      if (!item.quantity || item.quantity <= 0) {
        throw new BadRequestException('Return quantity must be greater than 0');
      }
      if (item.unitPrice == null || item.unitPrice < 0) {
        throw new BadRequestException('Return unitPrice must be a non-negative number');
      }

      const soldQty = originalQuantities.get(item.productId) ?? 0;
      if (soldQty <= 0) {
        throw new BadRequestException(
          `Product ${item.productId} does not exist on the original sale`,
        );
      }
      if (item.quantity > soldQty) {
        throw new BadRequestException(
          `Return quantity for product ${item.productId} cannot exceed sold quantity (${soldQty})`,
        );
      }

      refundSubtotal += item.unitPrice * item.quantity;
    }

    // Use same VAT logic as createSale
    const vatRate = 0.16;
    const refundVat = Math.round(refundSubtotal * vatRate * 100) / 100;
    const refundTotal = Math.round((refundSubtotal + refundVat) * 100) / 100;

    const returnId = uuidv4();
    const now = new Date();

    await this.prisma.$transaction(async (prisma) => {
      // Restock products (basic: product-level only)
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      // Create a negative sale to represent the return
      await prisma.sale.create({
        data: {
          id: returnId,
          tenantId,
          userId,
          total: -refundTotal,
          vatAmount: -refundVat,
          paymentType: 'refund',
          createdAt: now,
          customerName: originalSale.customerName,
          customerPhone: originalSale.customerPhone,
          branchId: originalSale.branchId,
        },
      });

      for (const item of items) {
        await prisma.saleItem.create({
          data: {
            id: uuidv4(),
            saleId: returnId,
            productId: item.productId,
            variationId: null,
            quantity: item.quantity,
            price: -item.unitPrice,
          },
        });
      }

      if (this.auditLogService) {
        await this.auditLogService.log(
          userId,
          'sale_return_created',
          {
            originalSaleId: saleId,
            returnSaleId: returnId,
            items,
            refundSubtotal,
            refundVat,
            refundTotal,
            reason,
          },
          undefined,
          prisma,
        );
      }

      this.realtimeGateway.emitSalesUpdate({
        saleId: returnId,
        items,
        total: -refundTotal,
      });
      for (const item of items) {
        this.realtimeGateway.emitInventoryUpdate({ productId: item.productId });
      }
    });

    return {
      returnId,
      originalSaleId: saleId,
      date: now,
      subtotal: refundSubtotal,
      vatAmount: refundVat,
      total: refundTotal,
    };
  }

  async getSaleById(id: string, tenantId: string) {
    if (!id) throw new BadRequestException('Sale ID is required');
    if (!tenantId) throw new BadRequestException('Tenant ID is required');

    try {
      this.logger.debug(`Fetching sale with ID: ${id} for tenant: ${tenantId}`);

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
                  sku: true,
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
              mpesaReceipt: true,
              responseDesc: true,
              createdAt: true,
            },
          },
          credit: {
            select: {
              id: true,
              totalAmount: true,
              balance: true,
              paidAmount: true,
              dueDate: true,
              notes: true,
              status: true,
            },
          },
          Tenant: true,
          Branch: true,
        },
      });

      if (!sale) {
        this.logger.warn(`Sale not found with ID: ${id} for tenant: ${tenantId}`);
        throw new NotFoundException('Sale not found');
      }

      // Transform the data to match the expected response format
      const result = {
        ...sale,
        saleId: sale.id,
        cashier: sale.User
          ? {
              id: sale.User.id,
              name: sale.User.name,
              email: sale.User.email,
            }
          : null,
        mpesaTransaction: sale.mpesaTransaction
          ? {
              phoneNumber: sale.mpesaTransaction.phoneNumber,
              amount: sale.mpesaTransaction.amount,
              status: sale.mpesaTransaction.status,
              mpesaReceipt: sale.mpesaTransaction.mpesaReceipt || sale.mpesaTransaction.transactionId || '',
              message: sale.mpesaTransaction.responseDesc || '',
              transactionDate: sale.mpesaTransaction.createdAt,
            }
          : null,
        items: sale.SaleItem.map((item) => ({
          ...item,
          name: item.product?.name || 'Unknown Product',
          price: item.price || 0,
          productId: item.product?.id || '',
        })),
        branch: sale.Branch
          ? {
              id: sale.Branch.id,
              name: sale.Branch.name,
              address: sale.Branch.address,
            }
          : null,
        credit: sale.credit
          ? {
              totalAmount: sale.credit.totalAmount,
              balance: sale.credit.balance,
              paidAmount: sale.credit.paidAmount,
              dueDate: sale.credit.dueDate,
              notes: sale.credit.notes,
              status: sale.credit.status,
            }
          : null,
      };

      return result;
    } catch (error) {
      console.error('Error in getSaleById:', error);
      throw error;
    }
  }

  /**
   * Get receipt data for a sale. When type=merchant, includes cost and profit for internal copy.
   */
  async getReceipt(
    saleId: string,
    tenantId: string,
    type: 'customer' | 'merchant' = 'customer',
  ) {
    if (!saleId) throw new BadRequestException('Sale ID is required');
    if (!tenantId) throw new BadRequestException('Tenant ID is required');

    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId, tenantId },
      include: {
        SaleItem: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                sku: true,
                cost: true,
              },
            },
          },
        },
        credit: { select: { dueDate: true, notes: true, balance: true, status: true } },
        Branch: true,
      },
    });

    if (!sale) throw new NotFoundException('Sale not found');

    const tenant = await this.getTenantInfo(tenantId);
    if (!tenant) throw new NotFoundException('Business information not found');

    const items = sale.SaleItem.map((item) => {
      const base: { productId: string; name: string; price: number; quantity: number } = {
        productId: item.productId,
        name: item.product?.name || 'Unknown Product',
        price: item.price,
        quantity: item.quantity,
      };
      if (type === 'merchant' && item.product && 'cost' in item.product) {
        (base as any).cost = item.product.cost ?? 0;
      }
      return base;
    });

    let totalCost = 0;
    let totalProfit = 0;
    if (type === 'merchant') {
      for (const item of sale.SaleItem) {
        const cost = (item.product as any)?.cost ?? 0;
        totalCost += cost * item.quantity;
        totalProfit += (item.price - cost) * item.quantity;
      }
    }

    const response: any = {
      id: sale.id,
      saleId: sale.id,
      date: sale.createdAt,
      receiptType: type,
      customerName: sale.customerName || 'Walk-in Customer',
      customerPhone: sale.customerPhone || 'N/A',
      items,
      total: sale.total,
      paymentMethod: sale.paymentType,
      amountReceived: sale.paymentType === 'cash' ? sale.total : sale.total,
      change: 0,
      businessInfo: {
        name: tenant.name,
        businessType: tenant.businessType ?? null,
        address: tenant.address,
        phone: tenant.contactPhone,
        email: tenant.contactEmail,
        receiptLogo: tenant.receiptLogo || tenant.logoUrl || null,
        logoUrl: tenant.logoUrl || null,
        watermark: tenant.watermark ?? null,
        kraEnabled: tenant.kraEnabled ?? false,
        kraPin: tenant.kraPin ?? null,
        vatNumber: tenant.vatNumber ?? null,
        etimsQrUrl: tenant.etimsQrUrl ?? null,
      },
      branch: sale.Branch
        ? { id: sale.Branch.id, name: sale.Branch.name, address: sale.Branch.address || '' }
        : null,
    };

    if (type === 'merchant') {
      response.totalCost = totalCost;
      response.totalProfit = totalProfit;
    }

    if (sale.paymentType === 'credit' && sale.credit) {
      response.creditDueDate = sale.credit.dueDate;
      response.creditNotes = sale.credit.notes;
      response.creditBalance = sale.credit.balance;
      response.creditStatus = sale.credit.status;
    }

    return response;
  }

  async getSales(
    tenantId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: TransformedSale[];
    meta: { total: number; page: number; lastPage: number };
  }> {
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
    const saleIds = sales.map((sale) => sale.id);
    const saleItems = await this.prisma.saleItem.findMany({
      where: {
        saleId: { in: saleIds },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            sku: true,
          },
        },
      },
    });

    // Get M-Pesa transactions for each sale
    const mpesaTransactions = await this.prisma.mpesaTransaction.findMany({
      where: {
        saleId: { in: saleIds },
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
      },
    });

    // Transform the data to match the expected response type
    const transformedSales = sales.map((sale) => {
      const items = saleItems
        .filter((item) => item.saleId === sale.id)
        .map((item) => ({
          ...item,
          productName: item.product?.name || 'Unknown',
        }));

      const mpesaTransaction = mpesaTransactions.find(
        (tx) => tx.saleId === sale.id,
      );

      return {
        ...sale,
        cashier: sale.userName || null,
        mpesaTransaction: mpesaTransaction
          ? {
              phoneNumber: mpesaTransaction.phoneNumber,
              amount: mpesaTransaction.amount,
              status: mpesaTransaction.status,
            }
          : null,
        items,
        branch: sale.branchId
          ? {
              id: sale.branchId,
              name: sale.branchName || 'Unknown Branch',
              address: sale.branchAddress,
            }
          : null,
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

  async listSales(tenantId: string, branchId?: string, limit: number = 100) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    if (limit < 1 || limit > 1000) limit = 100; // Enforce reasonable limit

    const whereClause: any = { tenantId };
    if (branchId && branchId !== 'all') {
      whereClause.branchId = branchId;
    }

    const sales = await this.prisma.sale.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        User: true,
        SaleItem: {
          include: {
            product: true,
          },
        },
        mpesaTransaction: true,
        Branch: true,
        Tenant: true,
        credit: true,
      },
    });
    return sales.map((sale) => {
      // Reconstruct split payments if paymentType is 'split'
      let splitPayments: any[] | undefined = undefined;
      const isSplitPayment = sale.paymentType === 'split';
      
      if (isSplitPayment) {
        splitPayments = [];
        
        // Add M-Pesa payment if exists
        if (sale.mpesaTransaction) {
          splitPayments.push({
            method: 'mpesa',
            amount: sale.mpesaTransaction.amount,
            mpesaTransactionId: sale.mpesaTransaction.id,
            mpesaReceipt: sale.mpesaTransaction.mpesaReceipt || sale.mpesaTransaction.transactionId,
          });
        }
        
        // Add credit payment if exists
        if (sale.credit) {
          splitPayments.push({
            method: 'credit',
            amount: sale.credit.totalAmount,
            creditDueDate: sale.credit.dueDate?.toISOString(),
            creditNotes: sale.credit.notes,
          });
        }
        
        // Calculate cash amount (total - mpesa - credit)
        const mpesaAmount = sale.mpesaTransaction?.amount || 0;
        const creditAmount = sale.credit?.totalAmount || 0;
        const cashAmount = sale.total - mpesaAmount - creditAmount;
        
        if (cashAmount > 0) {
          splitPayments.push({
            method: 'cash',
            amount: cashAmount,
          });
        }
      }

      return {
        saleId: sale.id,
        date: sale.createdAt,
        total: sale.total,
        paymentType: sale.paymentType,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone,
        cashier: sale.User ? sale.User.name : null,
        mpesaTransaction: sale.mpesaTransaction
          ? {
              phoneNumber: sale.mpesaTransaction.phoneNumber,
              amount: sale.mpesaTransaction.amount,
              status: sale.mpesaTransaction.status,
              mpesaReceipt: sale.mpesaTransaction.mpesaReceipt,
              checkoutRequestID: sale.mpesaTransaction.checkoutRequestID,
            }
          : null,
        items: sale.SaleItem.map((item) => ({
          productId: item.productId,
          name: item.product?.name || '',
          price: item.price,
          quantity: item.quantity,
        })),
        branch: sale.Branch
          ? {
              id: sale.Branch.id,
              name: sale.Branch.name,
              address: sale.Branch.address,
            }
          : null,
        isSplitPayment,
        splitPayments,
      };
    });
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
          lte: end,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Then, get all sale items for these sales with their products
    const saleItems = await this.prisma.saleItem.findMany({
      where: {
        saleId: {
          in: sales.map((sale) => sale.id),
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            sku: true,
            cost: true,
          },
        },
      },
    });

    // Group sale items by sale ID
    const saleItemsBySaleId: Record<
      string,
      Array<{
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
          cost: number;
        } | null;
      }>
    > = {};

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
          product: item.product
            ? {
                id: item.product.id,
                name: item.product.name || 'Unknown',
                price: item.product.price || 0,
                sku: item.product.sku || '',
                cost: item.product.cost || 0,
              }
            : null,
        });
      }
    }

    // Combine sales with their items
    const salesWithItems: SaleWithItems[] = sales.map((sale) => {
      const items = saleItemsBySaleId[sale.id] || [];
      return {
        ...sale,
        SaleItem: items.map((item) => ({
          id: item.id,
          saleId: item.saleId,
          productId: item.productId,
          variationId: null, // Add variationId field
          quantity: item.quantity,
          price: item.price,
          product: item.product
            ? {
                id: item.product.id,
                name: item.product.name || 'Unknown',
                price: item.product.price || 0,
                sku: item.product.sku || '',
                cost: item.product.cost || 0,
              }
            : null,
        })),
      };
    });
    // Total sales count
    const totalSales = salesWithItems.length;
    // Total revenue
    const totalRevenue = salesWithItems.reduce(
      (sum, s) => sum + (s.total || 0),
      0,
    );
    // Average sale value
    const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Calculate total profit
    let totalProfit = 0;
    for (const sale of salesWithItems) {
      if (!sale.SaleItem || !Array.isArray(sale.SaleItem)) continue;
      for (const item of sale.SaleItem) {
        if (item.product && item.product.cost !== undefined) {
          totalProfit += (item.price - item.product.cost) * item.quantity;
        }
      }
    }
    const avgProfitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Sales by product
    const salesByProduct: Record<
      string,
      { name: string; quantity: number; revenue: number; profit: number }
    > = {};
    for (const sale of salesWithItems) {
      if (!sale.SaleItem || !Array.isArray(sale.SaleItem)) continue;

      for (const item of sale.SaleItem) {
        const productId = item.productId;
        if (item.product) {
          // Only process items with valid products
          const productName = item.product.name || 'N/A';
          if (!salesByProduct[productId]) {
            salesByProduct[productId] = {
              name: productName,
              quantity: 0,
              revenue: 0,
              profit: 0,
            };
          }
          salesByProduct[productId].quantity += item.quantity;
          salesByProduct[productId].revenue += item.price * item.quantity;
          if (item.product.cost !== undefined) {
            salesByProduct[productId].profit +=
              (item.price - item.product.cost) * item.quantity;
          }
        }
      }
    }
    const topProducts = Object.entries(salesByProduct)
      .map(([id, data]) => ({
        id,
        name: data.name,
        unitsSold: data.quantity,
        revenue: data.revenue,
        profit: data.profit,
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
        paymentBreakdown[sale.paymentType] =
          (paymentBreakdown[sale.paymentType] || 0) + 1;
      }
    }
    // Top customers (by name/phone)
    const customerMap: Record<
      string,
      {
        name: string;
        phone: string;
        total: number;
        count: number;
        lastPurchase?: Date;
      }
    > = {};
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
      if (
        !customerMap[key].lastPurchase ||
        new Date(sale.createdAt) > new Date(customerMap[key].lastPurchase)
      ) {
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
        stock: { lt: 10 }, // Low stock threshold
      },
      select: {
        id: true,
        name: true,
        stock: true,
        sku: true,
      },
      orderBy: { stock: 'asc' },
    });
    // AI service removed - customer segmentation disabled
    const customerSegments: unknown[] = [];
    // AI service removed - forecast disabled
    const forecast: { forecast_months: unknown[]; forecast_sales: unknown[] } = {
      forecast_months: [],
      forecast_sales: [],
    };
    return {
      totalSales,
      totalRevenue,
      avgSaleValue,
      totalProfit,
      avgProfitMargin,
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
        businessType: true,
        address: true,
        contactEmail: true,
        contactPhone: true,
        receiptLogo: true,
        logoUrl: true,
        watermark: true,
        kraEnabled: true,
        kraPin: true,
        vatNumber: true,
        etimsQrUrl: true,
      },
    });
    return tenant;
  }

  async getRecentSales(tenantId: string, limit: number = 10) {
    try {
      this.logger.debug(`Fetching recent sales for tenant: ${tenantId}`);

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
      return recentSales.map((sale) => ({
        id: sale.id,
        total: sale.total,
        paymentMethod: sale.paymentType,
        customerName: sale.customerName || null,
        customerPhone: sale.customerPhone || null,
        date: sale.createdAt,
        items: sale.SaleItem.map((item) => ({
          productId: item.product?.id || '',
          productName: item.product?.name || 'Unknown',
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
        })),
      }));
    } catch {
      // Return empty array instead of throwing to prevent frontend errors
      return [];
    }
  }

  // Credit management methods
  async getCredits(tenantId: string) {
    return this.prisma.credit.findMany({
      where: { tenantId },
      include: {
        payments: true,
        sale: {
          select: {
            id: true,
            total: true,
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
            Branch: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCreditById(id: string, tenantId: string) {
    return this.prisma.credit.findFirst({
      where: { id, tenantId },
      include: {
        payments: true,
        sale: {
          select: {
            id: true,
            total: true,
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
        },
      },
    });
  }

  async makeCreditPayment(
    creditId: string,
    amount: number,
    paymentMethod: string,
    tenantId: string,
    notes?: string,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      // Get current credit
      const credit = await prisma.credit.findFirst({
        where: { id: creditId, tenantId },
      });

      if (!credit) {
        throw new NotFoundException('Credit not found');
      }

      if (credit.balance <= 0) {
        throw new BadRequestException('Credit is already fully paid');
      }

      if (amount > credit.balance) {
        throw new BadRequestException(
          'Payment amount exceeds remaining balance',
        );
      }

      // Create payment record
      await prisma.creditPayment.create({
        data: {
          creditId,
          amount,
          paymentMethod,
          notes,
        },
      });

      // Update credit balance
      const newBalance = credit.balance - amount;
      const newStatus = newBalance <= 0 ? 'paid' : 'active';

      return prisma.credit.update({
        where: { id: creditId },
        data: {
          paidAmount: credit.paidAmount + amount,
          balance: newBalance,
          status: newStatus,
        },
      });
    });
  }

  async getCustomerCreditBalance(
    tenantId: string,
    customerName: string,
    customerPhone?: string,
  ) {
    const credits = await this.prisma.credit.findMany({
      where: {
        tenantId,
        customerName: customerName.trim(),
        ...(customerPhone && { customerPhone: customerPhone.trim() }),
        status: { in: ['active', 'overdue'] },
      },
      select: {
        balance: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        dueDate: true,
      },
    });

    const totalOutstanding = credits.reduce(
      (sum, credit) => sum + credit.balance,
      0,
    );
    const totalCredit = credits.reduce(
      (sum, credit) => sum + credit.totalAmount,
      0,
    );
    const totalPaid = credits.reduce(
      (sum, credit) => sum + credit.paidAmount,
      0,
    );

    return {
      totalOutstanding,
      totalCredit,
      totalPaid,
      activeCredits: credits.length,
      hasOverdue: credits.some((credit) => credit.status === 'overdue'),
      credits: credits.map((credit) => ({
        balance: credit.balance,
        totalAmount: credit.totalAmount,
        paidAmount: credit.paidAmount,
        status: credit.status,
        dueDate: credit.dueDate,
      })),
    };
  }

  // Credit Scoring System
  async calculateCustomerCreditScore(
    tenantId: string,
    customerName: string,
    customerPhone?: string,
  ) {
    this.logger.debug('calculateCustomerCreditScore called', {
      tenantId,
      customerName,
      customerPhone,
    });

    // Get all credits for the customer
    const credits = await this.prisma.credit.findMany({
      where: {
        tenantId,
        customerName: customerName.trim(),
        ...(customerPhone && { customerPhone: customerPhone.trim() }),
      },
      include: {
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('Found credits:', credits.length);

    if (credits.length === 0) {
      this.logger.debug('No credits found, returning default score');
      return {
        score: 100, // New customers start with perfect score
        riskLevel: 'low',
        factors: {
          totalCredits: 0,
          paidCredits: 0,
          overdueCredits: 0,
          averagePaymentDays: 0,
          totalCreditAmount: 0,
        },
      };
    }

    const totalCredits = credits.length;
    const paidCredits = credits.filter((c) => c.status === 'paid').length;
    const overdueCredits = credits.filter((c) => c.status === 'overdue').length;
    const totalCreditAmount = credits.reduce(
      (sum, c) => sum + c.totalAmount,
      0,
    );

    this.logger.debug('Credit stats', {
      totalCredits,
      paidCredits,
      overdueCredits,
      totalCreditAmount,
    });

    // Calculate average payment time
    let totalPaymentDays = 0;
    let paymentCount = 0;

    for (const credit of credits) {
      if (credit.payments.length > 0) {
        for (const payment of credit.payments) {
          const daysToPay = Math.ceil(
            (payment.createdAt.getTime() - credit.createdAt.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          totalPaymentDays += daysToPay;
          paymentCount++;
        }
      } else if (credit.status === 'paid' && credit.dueDate) {
        // If paid but no payments recorded, assume paid on due date
        const daysToPay = Math.ceil(
          (credit.dueDate.getTime() - credit.createdAt.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        totalPaymentDays += Math.max(0, daysToPay);
        paymentCount++;
      }
    }

    const averagePaymentDays =
      paymentCount > 0 ? totalPaymentDays / paymentCount : 30; // Default 30 days

    this.logger.debug('Payment stats', {
      totalPaymentDays,
      paymentCount,
      averagePaymentDays,
    });

    // Calculate score (0-100, higher is better)
    let score = 100;

    // Deduct for overdue credits
    score -= overdueCredits * 20;

    // Deduct for high credit utilization
    const avgCreditAmount = totalCreditAmount / totalCredits;
    if (avgCreditAmount > 5000) score -= 10;
    if (avgCreditAmount > 10000) score -= 20;

    // Deduct for slow payments
    if (averagePaymentDays > 30)
      score -= Math.min(20, (averagePaymentDays - 30) / 2);
    if (averagePaymentDays > 60)
      score -= Math.min(30, (averagePaymentDays - 60) / 2);

    // Bonus for good payment history
    const paymentRatio = paidCredits / totalCredits;
    score += paymentRatio * 10;

    score = Math.max(0, Math.min(100, score));

    this.logger.debug(`Calculated credit score: ${score}`);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (score >= 70) riskLevel = 'low';
    else if (score >= 40) riskLevel = 'medium';
    else riskLevel = 'high';

    const result = {
      score: Math.round(score),
      riskLevel,
      factors: {
        totalCredits,
        paidCredits,
        overdueCredits,
        averagePaymentDays: Math.round(averagePaymentDays),
        totalCreditAmount,
      },
    };

    this.logger.debug('Credit score calculation complete', { score: result.score });
    return result;
  }

  // Multi-tenant Credit Policies
  async setTenantCreditPolicy(
    tenantId: string,
    maxCreditPerCustomer: number,
    maxOverdueDays: number = 30,
  ) {
    // Store in configuration service
    await this.configurationService.setConfiguration(
      `credit_policy_${tenantId}`,
      JSON.stringify({
        maxCreditPerCustomer,
        maxOverdueDays,
      }),
      {
        description: `Credit policy for tenant ${tenantId}`,
        category: 'general',
        isEncrypted: false,
        isPublic: false,
      },
    );

    return { maxCreditPerCustomer, maxOverdueDays };
  }

  async getTenantCreditPolicy(tenantId: string) {
    const policyStr = await this.configurationService.getConfiguration(
      `credit_policy_${tenantId}`,
    );
    if (policyStr) {
      try {
        return JSON.parse(policyStr) as {
          maxCreditPerCustomer: number;
          maxOverdueDays: number;
        };
      } catch {
        // If parsing fails, return defaults
      }
    }
    return { maxCreditPerCustomer: 10000, maxOverdueDays: 30 }; // Default values
  }

  async checkCreditEligibility(
    tenantId: string,
    customerName: string,
    requestedAmount: number,
    customerPhone?: string,
  ) {
    this.logger.debug('checkCreditEligibility called', {
      tenantId,
      customerName,
      requestedAmount,
      customerPhone,
    });

    const policy = await this.getTenantCreditPolicy(tenantId);
    this.logger.debug('Credit policy', { policy });

    const balance = await this.getCustomerCreditBalance(
      tenantId,
      customerName,
      customerPhone,
    );
    this.logger.debug(`Customer balance: ${balance}`);

    const score = await this.calculateCustomerCreditScore(
      tenantId,
      customerName,
      customerPhone,
    );
    this.logger.debug(`Credit score: ${score}`);

    const currentOutstanding = balance.totalOutstanding;
    const maxAllowed = (policy as { maxCreditPerCustomer: number })
      .maxCreditPerCustomer;
    const availableCredit = maxAllowed - currentOutstanding;

    const isEligible = requestedAmount <= availableCredit && score.score >= 30; // Minimum score requirement

    const result = {
      isEligible,
      availableCredit,
      requestedAmount,
      currentOutstanding,
      creditScore: score.score,
      riskLevel: score.riskLevel,
      reasons: [
        ...(requestedAmount > availableCredit
          ? [
              `Requested amount exceeds available credit limit (${availableCredit})`,
            ]
          : []),
        ...(score.score < 30 ? ['Credit score too low for approval'] : []),
        ...(balance.hasOverdue ? ['Customer has overdue credits'] : []),
      ],
    };

    this.logger.debug('Credit eligibility check complete', { eligible: result.isEligible });
    return result;
  }

  // Cross-tenant credit reporting (admin only)
  async getCrossTenantCreditReport() {
    // This would typically require admin privileges
    const allCredits = await this.prisma.credit.findMany({
      include: {
        tenant: {
          select: { name: true },
        },
      },
    });

    type TenantReport = {
      totalCredits: number;
      totalOutstanding: number;
      totalPaid: number;
      overdueCount: number;
    };

    const report = allCredits.reduce<Record<string, TenantReport>>(
      (acc, credit) => {
        const tenantName = credit.tenant?.name || 'Unknown';
        if (!acc[tenantName]) {
          acc[tenantName] = {
            totalCredits: 0,
            totalOutstanding: 0,
            totalPaid: 0,
            overdueCount: 0,
          };
        }
        acc[tenantName].totalCredits++;
        acc[tenantName].totalOutstanding += credit.balance;
        acc[tenantName].totalPaid += credit.paidAmount;
        if (credit.status === 'overdue') acc[tenantName].overdueCount++;
        return acc;
      },
      {},
    );

    return report;
  }

  // Credit Analytics Dashboard
  async getCreditAnalytics(tenantId: string, startDate?: Date, endDate?: Date) {
    this.logger.debug('getCreditAnalytics called', {
      tenantId,
      startDate,
      endDate,
    });

    // Set default date range if not provided (last 30 days)
    const end = endDate || new Date();
    const start = startDate || new Date();
    start.setDate(start.getDate() - 30);

    this.logger.debug('Date range for credit analytics', { start, end });

    // Get all credits for the tenant
    const credits = await this.prisma.credit.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        payments: true,
        sale: {
          select: {
            id: true,
            total: true,
            createdAt: true,
            Branch: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('Found credits:', credits.length);

    // Calculate key metrics
    const totalCredits = credits.length;
    const totalOutstanding = credits.reduce(
      (sum, credit) => sum + credit.balance,
      0,
    );
    const totalPaid = credits.reduce(
      (sum, credit) => sum + credit.paidAmount,
      0,
    );
    const totalCreditAmount = credits.reduce(
      (sum, credit) => sum + credit.totalAmount,
      0,
    );
    const paidCredits = credits.filter(
      (credit) => credit.status === 'paid',
    ).length;
    const overdueCredits = credits.filter(
      (credit) => credit.status === 'overdue',
    ).length;
    const activeCredits = credits.filter(
      (credit) => credit.status === 'active',
    ).length;

    this.logger.debug('Credit metrics calculated', {
      totalCredits,
      totalOutstanding,
      totalPaid,
      totalCreditAmount,
      paidCredits,
      overdueCredits,
      activeCredits,
    });

    // Calculate payment trends (by month)
    const paymentTrends: Record<string, number> = {};
    credits.forEach((credit) => {
      credit.payments.forEach((payment) => {
        const month = payment.createdAt.toISOString().slice(0, 7); // YYYY-MM
        paymentTrends[month] = (paymentTrends[month] || 0) + payment.amount;
      });
    });

    this.logger.debug('Payment trends calculated', { trendCount: paymentTrends.length });

    // Calculate outstanding amounts by month
    const outstandingByMonth: Record<string, number> = {};
    credits.forEach((credit) => {
      const month = credit.createdAt.toISOString().slice(0, 7); // YYYY-MM
      outstandingByMonth[month] =
        (outstandingByMonth[month] || 0) + credit.balance;
    });

    console.log('Outstanding by month:', outstandingByMonth);

    // Calculate overdue credits by month
    const overdueByMonth: Record<string, number> = {};
    credits
      .filter((credit) => credit.status === 'overdue')
      .forEach((credit) => {
        const month = credit.createdAt.toISOString().slice(0, 7); // YYYY-MM
        overdueByMonth[month] = (overdueByMonth[month] || 0) + 1;
      });

    this.logger.debug('Overdue by month calculated', { monthCount: overdueByMonth.length });

    // Calculate credits by branch
    const creditsByBranch: Record<string, { name: string; total: number; count: number }> = {};
    credits.forEach((credit) => {
      const branchName = credit.sale?.Branch?.name || 'No Branch';
      const branchId = credit.sale?.Branch?.id || 'no-branch';
      if (!creditsByBranch[branchId]) {
        creditsByBranch[branchId] = { name: branchName, total: 0, count: 0 };
      }
      creditsByBranch[branchId].total += credit.totalAmount;
      creditsByBranch[branchId].count += 1;
    });

    this.logger.debug('Credits by branch calculated', { branchCount: creditsByBranch.length });

    // Calculate average payment time
    let totalPaymentDays = 0;
    let paymentCount = 0;
    credits.forEach((credit) => {
      credit.payments.forEach((payment) => {
        const daysToPay = Math.ceil(
          (payment.createdAt.getTime() - credit.createdAt.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        totalPaymentDays += daysToPay;
        paymentCount++;
      });
    });
    const avgPaymentTime =
      paymentCount > 0 ? totalPaymentDays / paymentCount : 0;

    this.logger.debug(`Average payment time: ${avgPaymentTime} days`);

    return {
      summary: {
        totalCredits,
        totalOutstanding,
        totalPaid,
        totalCreditAmount,
        paidCredits,
        overdueCredits,
        activeCredits,
        avgPaymentTime: Math.round(avgPaymentTime),
      },
      trends: {
        paymentTrends,
        outstandingByMonth,
        overdueByMonth,
        creditsByBranch: Object.values(creditsByBranch),
      },
    };
  }

  // Customer Credit History
  async getCustomerCreditHistory(
    tenantId: string,
    customerName: string,
    customerPhone?: string,
  ) {
    this.logger.debug('getCustomerCreditHistory called', {
      tenantId,
      customerName,
      customerPhone,
    });

    const credits = await this.prisma.credit.findMany({
      where: {
        tenantId,
        customerName: customerName.trim(),
        ...(customerPhone && { customerPhone: customerPhone.trim() }),
      },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        sale: {
          select: {
            id: true,
            total: true,
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
            Branch: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.debug(`Found ${credits.length} customer credits`);

    // Calculate customer summary
    const totalCredits = credits.length;
    const totalCreditAmount = credits.reduce(
      (sum, credit) => sum + credit.totalAmount,
      0,
    );
    const totalPaid = credits.reduce(
      (sum, credit) => sum + credit.paidAmount,
      0,
    );
    const totalOutstanding = credits.reduce(
      (sum, credit) => sum + credit.balance,
      0,
    );
    const paidCredits = credits.filter(
      (credit) => credit.status === 'paid',
    ).length;
    const overdueCredits = credits.filter(
      (credit) => credit.status === 'overdue',
    ).length;

    this.logger.debug('Customer summary calculated', {
      totalCredits,
      totalCreditAmount,
      totalPaid,
      totalOutstanding,
      paidCredits,
      overdueCredits,
    });

    // Transform credits with detailed history
    const creditHistory = credits.map((credit) => ({
      id: credit.id,
      saleId: credit.saleId,
      totalAmount: credit.totalAmount,
      paidAmount: credit.paidAmount,
      balance: credit.balance,
      status: credit.status,
      dueDate: credit.dueDate,
      notes: credit.notes,
      createdAt: credit.createdAt,
      updatedAt: credit.updatedAt,
      sale: credit.sale
        ? {
            id: credit.sale.id,
            total: credit.sale.total,
            createdAt: credit.sale.createdAt,
            items: credit.sale.SaleItem.map((item) => ({
              productId: item.product?.id || '',
              productName: item.product?.name || 'Unknown Product',
              quantity: item.quantity,
              price: item.price,
              total: item.quantity * item.price,
            })),
            branch: credit.sale.Branch
              ? {
                  id: credit.sale.Branch.id,
                  name: credit.sale.Branch.name,
                  address: credit.sale.Branch.address,
                }
              : null,
          }
        : null,
      payments: credit.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        notes: payment.notes,
        createdAt: payment.createdAt,
      })),
    }));

    this.logger.debug('Credit history transformation complete');

    return {
      customer: {
        name: customerName,
        phone: customerPhone,
      },
      summary: {
        totalCredits,
        totalCreditAmount,
        totalPaid,
        totalOutstanding,
        paidCredits,
        overdueCredits,
        paymentRatio: totalCredits > 0 ? (paidCredits / totalCredits) * 100 : 0,
      },
      creditHistory,
    };
  }

  // Credit Aging Analysis
  async getCreditAgingAnalysis(tenantId: string) {
    this.logger.debug('getCreditAgingAnalysis called', { tenantId });

    const credits = await this.prisma.credit.findMany({
      where: {
        tenantId,
        status: { in: ['active', 'overdue'] },
        balance: { gt: 0 },
      },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        balance: true,
        dueDate: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.debug(`Found ${credits.length} aging credits`);

    const now = new Date();
    const agingBuckets = {
      current: 0, // 0-30 days
      '31-60': 0,
      '61-90': 0,
      '91+': 0,
    };

    const agingDetails = {
      current: [] as any[],
      '31-60': [] as any[],
      '61-90': [] as any[],
      '91+': [] as any[],
    };

    credits.forEach((credit) => {
      const dueDate = credit.dueDate
        ? new Date(credit.dueDate)
        : new Date(credit.createdAt);
      const daysOverdue = Math.ceil(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      let bucket: keyof typeof agingBuckets;
      if (daysOverdue <= 0) {
        bucket = 'current';
      } else if (daysOverdue <= 60) {
        bucket = '31-60';
      } else if (daysOverdue <= 90) {
        bucket = '61-90';
      } else {
        bucket = '91+';
      }

      agingBuckets[bucket] += credit.balance;
      agingDetails[bucket].push({
        id: credit.id,
        customerName: credit.customerName,
        customerPhone: credit.customerPhone,
        balance: credit.balance,
        dueDate: credit.dueDate,
        daysOverdue,
        status: credit.status,
      });
    });

    this.logger.debug('Aging analysis complete', {
      agingBuckets,
      detailsCount: Object.values(agingDetails).flat().length,
    });

    return {
      summary: agingBuckets,
      details: agingDetails,
      totalOutstanding: Object.values(agingBuckets).reduce(
        (sum, amount) => sum + amount,
        0,
      ),
    };
  }
}
