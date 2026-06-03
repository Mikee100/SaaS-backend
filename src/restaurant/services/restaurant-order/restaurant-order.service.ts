import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { SalesService } from '../../../sales/sales.service';

const VALID_TRANSITIONS = {
  'Open': ['SentToKitchen', 'Voided'],
  'SentToKitchen': ['Served', 'Voided'],
  'Served': ['Closed', 'Voided'],
  'Closed': [],
  'Voided': [],
};

@Injectable()
export class RestaurantOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesService: SalesService,
  ) {}

  async findAllActive(tenantId: string, branchId?: string) {
    return this.prisma.restaurantOrder.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        status: { notIn: ['Closed', 'Voided'] },
      },
      include: {
        table: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const order = await this.prisma.restaurantOrder.findUnique({
      where: { id },
      include: {
        table: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!order || order.tenantId !== tenantId) {
      throw new NotFoundException(`Restaurant order with ID ${id} not found`);
    }

    return order;
  }

  async create(tenantId: string, branchId: string, data: { tableId?: string; waiterId?: string; customerName?: string; customerPhone?: string; total: number; items: any[] }) {
    // Basic idempotency: handled by the controller/client passing idempotency key if needed,
    // but for order creation it's simpler.
    
    return this.prisma.$transaction(async (prisma) => {
      const order = await prisma.restaurantOrder.create({
        data: {
          tenantId,
          branchId,
          tableId: data.tableId,
          waiterId: data.waiterId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          total: data.total,
          status: 'Open',
          items: {
            create: data.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              notes: item.notes,
              modifierSelections: item.modifierSelections || [],
              prepStatus: 'pending'
            })),
          },
        },
        include: { items: true },
      });

      if (data.tableId) {
        await prisma.diningTable.update({
          where: { id: data.tableId },
          data: { status: 'occupied' },
        });
      }

      return order;
    });
  }

  async updateStatus(id: string, tenantId: string, newStatus: string, isManagerOverride: boolean = false) {
    const order = await this.findOne(id, tenantId);

    if (!isManagerOverride) {
      const allowedNextStates = VALID_TRANSITIONS[order.status] || [];
      if (!allowedNextStates.includes(newStatus)) {
        throw new BadRequestException(`Invalid state transition from ${order.status} to ${newStatus}`);
      }
    }

    return this.prisma.$transaction(async (prisma) => {
      const updatedOrder = await prisma.restaurantOrder.update({
        where: { id },
        data: {
          status: newStatus,
          ticketVersion: newStatus === 'SentToKitchen' ? { increment: 1 } : undefined,
        },
      });

      // Free table if closed or voided
      if ((newStatus === 'Closed' || newStatus === 'Voided') && updatedOrder.tableId) {
        await prisma.diningTable.update({
          where: { id: updatedOrder.tableId },
          data: { status: 'open' },
        });
      }

      return updatedOrder;
    });
  }

  async addItems(
    id: string,
    tenantId: string,
    items: Array<{
      productId: string;
      quantity: number;
      price: number;
      notes?: string;
      modifierSelections?: any;
    }>,
  ) {
    const order = await this.findOne(id, tenantId);

    if (order.status !== 'Open') {
      throw new BadRequestException('Items can only be added when order is in Open state');
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const createdItems = await Promise.all(
        items.map((item) =>
          tx.restaurantOrderItem.create({
            data: {
              orderId: id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              notes: item.notes,
              modifierSelections: item.modifierSelections || [],
              prepStatus: 'pending',
            },
          }),
        ),
      );

      const addedTotal = items.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      );

      await tx.restaurantOrder.update({
        where: { id },
        data: { total: { increment: addedTotal } },
      });

      const updated = await tx.restaurantOrder.findUnique({
        where: { id },
        include: {
          table: true,
          items: true,
        },
      });

      return { order: updated, createdItems };
    });
  }

  async checkoutToSale(
    orderId: string,
    tenantId: string,
    userId: string,
    payload: {
      paymentMethod: 'cash' | 'mpesa' | 'credit' | 'split';
      amountReceived?: number;
      customerName?: string;
      customerPhone?: string;
      idempotencyKey?: string;
      isManagerOverride?: boolean;
      splitPayments?: Array<{
        method: 'cash' | 'mpesa' | 'credit';
        amount: number;
        amountReceived?: number;
        mpesaTransactionId?: string;
        mpesaReceipt?: string;
        creditDueDate?: string;
        creditNotes?: string;
      }>;
    },
  ) {
    const order = await this.findOne(orderId, tenantId);

    if (!payload.isManagerOverride && order.status !== 'Served') {
      throw new BadRequestException(
        `Order must be in Served state before checkout. Current state: ${order.status}`,
      );
    }

    const existingSale = await this.prisma.sale.findFirst({
      where: {
        tenantId,
        restaurantOrderId: orderId,
      },
    });

    if (existingSale) {
      return this.salesService.getReceipt(existingSale.id, tenantId, order.branchId, 'customer');
    }

    if (!order.items?.length) {
      throw new BadRequestException('Cannot checkout an empty restaurant order');
    }

    const idempotencyKey = payload.idempotencyKey || `restaurant-checkout:${orderId}`;

    const receipt = await this.salesService.createSale(
      {
        items: order.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        paymentMethod: payload.paymentMethod,
        amountReceived: payload.amountReceived,
        customerName: payload.customerName || order.customerName || undefined,
        customerPhone: payload.customerPhone || order.customerPhone || undefined,
        branchId: order.branchId,
        restaurantOrderId: orderId,
        idempotencyKey,
        isSplitPayment: payload.paymentMethod === 'split',
        splitPayments: payload.paymentMethod === 'split' ? payload.splitPayments : undefined,
      },
      tenantId,
      userId,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.restaurantOrder.update({
        where: { id: orderId },
        data: { status: 'Closed' },
      });

      if (order.tableId) {
        await tx.diningTable.update({
          where: { id: order.tableId },
          data: { status: 'open' },
        });
      }
    });

    return receipt;
  }
}
