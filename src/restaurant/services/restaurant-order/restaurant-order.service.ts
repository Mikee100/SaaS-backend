import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma.service';
import { SalesService } from '../../../sales/sales.service';
import { RealtimeGateway } from '../../../realtime.gateway';

const VALID_TRANSITIONS: Record<string, string[]> = {
  Open: ['SentToKitchen', 'Voided'],
  SentToKitchen: ['Served', 'Voided'],
  Served: ['Closed', 'Voided'],
  Closed: [],
  Voided: [],
};

type TxClient = Prisma.TransactionClient;

interface RestaurantOrderItemInput {
  productId: string;
  quantity: number;
  price: number;
  notes?: string | null;
  modifierSelections?: unknown;
}

interface BomOrderContext {
  id: string;
  tenantId: string;
  branchId: string;
  items: RestaurantOrderItemInput[];
}

interface BomDeductionLine {
  ingredientProductId?: unknown;
  appliedQuantity?: unknown;
}

interface ActivityActorContext {
  userId?: string;
  name?: string;
  roles?: string[];
}

interface ResolvedActivityActor {
  userId?: string;
  name?: string;
  roles?: string[];
}

@Injectable()
export class RestaurantOrderService {
  private readonly logger = new Logger(RestaurantOrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly salesService: SalesService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  private createAuditId() {
    return `audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private async resolveActivityActorForOrderCreate(
    tenantId: string,
    waiterId?: string,
    fallback?: ActivityActorContext,
  ): Promise<ResolvedActivityActor | undefined> {
    const trimmedWaiterId = String(waiterId || '').trim();
    if (!trimmedWaiterId) {
      return fallback;
    }

    try {
      const waiterUser = await this.prisma.user.findFirst({
        where: {
          id: trimmedWaiterId,
          userRoles: {
            some: { tenantId },
          },
        },
        select: {
          id: true,
          name: true,
          userRoles: {
            where: { tenantId },
            select: {
              role: {
                select: { name: true },
              },
            },
          },
        },
      });

      if (!waiterUser) {
        return fallback;
      }

      const roles = waiterUser.userRoles
        .map((userRole) => String(userRole.role?.name || '').toLowerCase())
        .filter(Boolean);

      return {
        userId: waiterUser.id,
        name: waiterUser.name || fallback?.name,
        roles: roles.length > 0 ? roles : fallback?.roles || [],
      };
    } catch {
      return fallback;
    }
  }

  private async logRestaurantActivity(
    db: TxClient | PrismaService,
    payload: {
      tenantId: string;
      branchId: string;
      orderId?: string | null;
      actionType: string;
      fromStatus?: string | null;
      toStatus?: string | null;
      actor?: ActivityActorContext;
      details?: Prisma.InputJsonValue;
    },
  ) {
    const delegate =
      (db as any)?.restaurantActivityEvent ||
      (db as any)?.restaurantActivityEvents ||
      (this.prisma as any)?.restaurantActivityEvent;

    if (!delegate?.create) {
      this.logger.warn(
        'Skipping restaurant activity log because restaurantActivityEvent delegate is unavailable',
      );
      return;
    }

    try {
      await delegate.create({
        data: {
          tenantId: payload.tenantId,
          branchId: payload.branchId,
          orderId: payload.orderId || null,
          actorUserId: payload.actor?.userId || null,
          actionType: payload.actionType,
          fromStatus: payload.fromStatus || null,
          toStatus: payload.toStatus || null,
          details: {
            ...(typeof payload.details === 'object' && payload.details !== null
              ? (payload.details as Record<string, unknown>)
              : {}),
            actorName: payload.actor?.name || null,
            actorRoles: payload.actor?.roles || [],
          },
        },
      });
    } catch (error: unknown) {
      // Some production databases may be missing this optional table.
      // Never block order flow on activity logging if the table is absent.
      const errorLike = error as
        | {
            code?: unknown;
            meta?: Record<string, unknown>;
          }
        | undefined;
      const isMissingActivityTableError =
        String(errorLike?.code || '') === 'P2021' &&
        (`${errorLike?.meta?.table || ''}`.includes(
          'RestaurantActivityEvent',
        ) ||
          `${errorLike?.meta?.modelName || ''}`.includes(
            'RestaurantActivityEvent',
          ));

      if (isMissingActivityTableError) {
        this.logger.warn(
          'Skipping restaurant activity log because RestaurantActivityEvent table is missing in current database.',
        );
        return;
      }

      throw error;
    }
  }

  // Grams-per-unit for weight units, so a recipe line and the ingredient's
  // own inventory unit only need to share a family, not an exact string.
  private static readonly WEIGHT_TO_GRAMS: Record<string, number> = {
    mg: 0.001,
    g: 1,
    gram: 1,
    grams: 1,
    kg: 1000,
    kilogram: 1000,
    kilograms: 1000,
    oz: 28.3495,
    ounce: 28.3495,
    ounces: 28.3495,
    lb: 453.592,
    lbs: 453.592,
    pound: 453.592,
    pounds: 453.592,
  };

  // Millilitres-per-unit for volume units.
  private static readonly VOLUME_TO_ML: Record<string, number> = {
    ml: 1,
    milliliter: 1,
    milliliters: 1,
    millilitre: 1,
    millilitres: 1,
    cl: 10,
    l: 1000,
    liter: 1000,
    liters: 1000,
    litre: 1000,
    litres: 1000,
    tsp: 4.92892,
    teaspoon: 4.92892,
    tbsp: 14.7868,
    tablespoon: 14.7868,
    cup: 236.588,
  };

  private normalizeUnit(unit?: string | null): string {
    return String(unit || '').trim().toLowerCase();
  }

  // Converts `value` from `fromUnit` into `toUnit`. Returns the unchanged
  // value when either unit is unspecified or they're already identical
  // (preserves today's behavior for recipes that never set a unit, or that
  // already match the ingredient's inventory unit). Returns null when the
  // two units are both specified but not known to be convertible - callers
  // must treat that as "don't guess" rather than silently applying a wrong
  // number.
  private convertQuantity(
    value: number,
    fromUnitRaw?: string | null,
    toUnitRaw?: string | null,
  ): number | null {
    const from = this.normalizeUnit(fromUnitRaw);
    const to = this.normalizeUnit(toUnitRaw);

    if (!from || !to || from === to) {
      return value;
    }

    const weight = RestaurantOrderService.WEIGHT_TO_GRAMS;
    if (from in weight && to in weight) {
      return (value * weight[from]) / weight[to];
    }

    const volume = RestaurantOrderService.VOLUME_TO_ML;
    if (from in volume && to in volume) {
      return (value * volume[from]) / volume[to];
    }

    return null;
  }

  private async applyBomConsumptionIfNeeded(
    tx: TxClient,
    order: BomOrderContext,
    actorUserId?: string,
  ) {
    const consumedLog = await tx.auditLog.findFirst({
      where: {
        action: 'restaurant_order_bom_consumed',
        details: { path: ['orderId'], equals: order.id },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (consumedLog) {
      return;
    }

    const productIds = Array.from(
      new Set((order.items || []).map((item) => item.productId)),
    );
    if (productIds.length === 0) {
      return;
    }

    const recipes = await tx.bomRecipe.findMany({
      where: {
        tenantId: order.tenantId,
        isActive: true,
        productId: { in: productIds },
        OR: [{ branchId: order.branchId }, { branchId: null }],
      },
      include: {
        lines: {
          include: {
            ingredientProduct: { select: { id: true, unitAbbreviation: true } },
          },
        },
      },
      orderBy: [{ branchId: 'desc' }, { updatedAt: 'desc' }],
    });

    if (recipes.length === 0) {
      return;
    }

    const recipeByProductId = new Map<string, (typeof recipes)[number]>();
    for (const recipe of recipes) {
      if (!recipeByProductId.has(recipe.productId)) {
        recipeByProductId.set(recipe.productId, recipe);
      }
    }

    const ingredientDeductions: Array<{
      ingredientProductId: string;
      requestedQuantity: number;
      appliedQuantity: number;
      previousStock: number | null;
      newStock: number | null;
      skippedReason?: string;
    }> = [];

    const ingredientRequired = new Map<string, number>();
    for (const item of order.items || []) {
      const recipe = recipeByProductId.get(item.productId);
      if (!recipe) continue;

      const itemQty = Number(item.quantity || 0);
      const recipeYield = Math.max(0.0001, Number(recipe.yieldQty || 1));
      for (const line of recipe.lines || []) {
        const baseQty = (itemQty / recipeYield) * Number(line.quantity || 0);
        const wasteMultiplier =
          1 + Math.max(0, Number(line.wastePercent || 0)) / 100;
        const neededInLineUnit = Math.max(0, baseQty * wasteMultiplier);
        if (neededInLineUnit <= 0) continue;

        const ingredientUnit = line.ingredientProduct?.unitAbbreviation;
        const converted = this.convertQuantity(
          neededInLineUnit,
          line.unit,
          ingredientUnit,
        );

        if (converted === null) {
          // The recipe line's unit and the ingredient's inventory unit are
          // both set but not convertible (e.g. "ml" into an ingredient
          // tracked in "kg"). Deducting anyway would silently apply a wrong
          // factor to real stock, so skip this line and surface it instead.
          ingredientDeductions.push({
            ingredientProductId: line.ingredientProductId,
            requestedQuantity: neededInLineUnit,
            appliedQuantity: 0,
            previousStock: null,
            newStock: null,
            skippedReason: `unit_mismatch:${line.unit || 'unit'}->${ingredientUnit || 'unspecified'}`,
          });
          continue;
        }

        ingredientRequired.set(
          line.ingredientProductId,
          (ingredientRequired.get(line.ingredientProductId) || 0) + converted,
        );
      }
    }

    if (ingredientRequired.size === 0 && ingredientDeductions.length === 0) {
      return;
    }

    for (const [
      ingredientProductId,
      requested,
    ] of ingredientRequired.entries()) {
      if (requested <= 0) continue;

      const inventory = await tx.inventory.findFirst({
        where: {
          tenantId: order.tenantId,
          branchId: order.branchId,
          productId: ingredientProductId,
        },
      });

      if (!inventory) {
        ingredientDeductions.push({
          ingredientProductId,
          requestedQuantity: requested,
          appliedQuantity: 0,
          previousStock: null,
          newStock: null,
          skippedReason: 'inventory_record_missing',
        });
        continue;
      }

      const previousQuantity = Number(inventory.quantity || 0);
      const newQuantity = Math.max(0, previousQuantity - requested);
      const appliedQuantity = Math.max(0, previousQuantity - newQuantity);

      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: newQuantity,
          updatedAt: new Date(),
        },
      });

      // InventoryMovement's quantity columns are Int, so the audit-trail
      // entry rounds; the live `inventory.quantity` above (Float) keeps the
      // precise converted amount, which is what actually matters for stock
      // accuracy and for BOM reversal on a voided order.
      await tx.inventoryMovement.create({
        data: {
          productId: ingredientProductId,
          type: 'out',
          quantity: Math.round(appliedQuantity),
          previousQuantity: Math.round(previousQuantity),
          newQuantity: Math.round(newQuantity),
          reason: `BOM consumption for restaurant order ${order.id}`,
          location: 'Restaurant BOM',
          createdBy: actorUserId || '',
          branchId: order.branchId,
          tenantId: order.tenantId,
        },
      });

      ingredientDeductions.push({
        ingredientProductId,
        requestedQuantity: requested,
        appliedQuantity,
        previousStock: previousQuantity,
        newStock: newQuantity,
      });
    }

    await tx.auditLog.create({
      data: {
        id: this.createAuditId(),
        userId: actorUserId,
        action: 'restaurant_order_bom_consumed',
        details: {
          orderId: order.id,
          tenantId: order.tenantId,
          branchId: order.branchId,
          ingredientDeductions,
        },
      },
    });
  }

  private async applyBomReversalIfNeeded(
    tx: TxClient,
    order: BomOrderContext,
    actorUserId?: string,
  ) {
    const reversalLog = await tx.auditLog.findFirst({
      where: {
        action: 'restaurant_order_bom_reversed',
        details: { path: ['orderId'], equals: order.id },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (reversalLog) {
      return;
    }

    const consumedLog = await tx.auditLog.findFirst({
      where: {
        action: 'restaurant_order_bom_consumed',
        details: { path: ['orderId'], equals: order.id },
      },
      orderBy: { createdAt: 'desc' },
    });

    const consumedDetails = consumedLog?.details as {
      ingredientDeductions?: BomDeductionLine[];
    } | null;
    const consumedLines = Array.isArray(consumedDetails?.ingredientDeductions)
      ? consumedDetails.ingredientDeductions
      : [];

    if (consumedLines.length === 0) {
      return;
    }

    const restoredIngredients: Array<{
      ingredientProductId: string;
      restoredQuantity: number;
      previousStock: number | null;
      newStock: number | null;
      skippedReason?: string;
    }> = [];

    for (const line of consumedLines) {
      const ingredientProductId =
        typeof line.ingredientProductId === 'string'
          ? line.ingredientProductId
          : '';
      const appliedQuantity =
        typeof line.appliedQuantity === 'number' ? line.appliedQuantity : 0;
      const toRestore = Math.max(0, Number(appliedQuantity));
      if (!ingredientProductId || toRestore <= 0) continue;

      const inventory = await tx.inventory.findFirst({
        where: {
          tenantId: order.tenantId,
          branchId: order.branchId,
          productId: ingredientProductId,
        },
      });

      if (!inventory) {
        restoredIngredients.push({
          ingredientProductId,
          restoredQuantity: 0,
          previousStock: null,
          newStock: null,
          skippedReason: 'inventory_record_missing',
        });
        continue;
      }

      const previousQuantity = Number(inventory.quantity || 0);
      const newQuantity = previousQuantity + toRestore;

      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: newQuantity,
          updatedAt: new Date(),
        },
      });

      await tx.inventoryMovement.create({
        data: {
          productId: ingredientProductId,
          type: 'in',
          quantity: Math.round(toRestore),
          previousQuantity: Math.round(previousQuantity),
          newQuantity: Math.round(newQuantity),
          reason: `BOM reversal for voided restaurant order ${order.id}`,
          location: 'Restaurant BOM',
          createdBy: actorUserId || '',
          branchId: order.branchId,
          tenantId: order.tenantId,
        },
      });

      restoredIngredients.push({
        ingredientProductId,
        restoredQuantity: toRestore,
        previousStock: previousQuantity,
        newStock: newQuantity,
      });
    }

    await tx.auditLog.create({
      data: {
        id: this.createAuditId(),
        userId: actorUserId,
        action: 'restaurant_order_bom_reversed',
        details: {
          orderId: order.id,
          tenantId: order.tenantId,
          branchId: order.branchId,
          restoredIngredients,
        },
      },
    });
  }

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

  async findAll(
    tenantId: string,
    branchId?: string,
    filters?: {
      from?: Date;
      to?: Date;
      waiterId?: string;
      status?: string;
    },
  ) {
    const where: Prisma.RestaurantOrderWhereInput = {
      tenantId,
      ...(branchId ? { branchId } : {}),
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.waiterId) {
      where.waiterId = filters.waiterId;
    }

    if (filters?.from || filters?.to) {
      where.createdAt = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }

    return this.prisma.restaurantOrder.findMany({
      where,
      include: {
        table: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActivity(
    tenantId: string,
    branchId?: string,
    filters?: {
      from?: Date;
      to?: Date;
      actorUserId?: string;
      actionType?: string;
      orderId?: string;
      limit?: number;
    },
  ) {
    const activityDelegate =
      (this.prisma as any)?.restaurantActivityEvent ||
      (this.prisma as any)?.restaurantActivityEvents;

    if (!activityDelegate?.findMany) {
      this.logger.warn(
        'Restaurant activity delegate is unavailable; returning empty activity list',
      );
      return [];
    }

    const where: Prisma.RestaurantActivityEventWhereInput = {
      tenantId,
      ...(branchId ? { branchId } : {}),
      ...(filters?.actorUserId ? { actorUserId: filters.actorUserId } : {}),
      ...(filters?.actionType ? { actionType: filters.actionType } : {}),
      ...(filters?.orderId ? { orderId: filters.orderId } : {}),
      ...(filters?.from || filters?.to
        ? {
            createdAt: {
              ...(filters?.from ? { gte: filters.from } : {}),
              ...(filters?.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };

    return activityDelegate.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        order: {
          select: {
            id: true,
            status: true,
            tableId: true,
            total: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(filters?.limit ?? 100, 1), 500),
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

  async create(
    tenantId: string,
    branchId: string,
    data: {
      tableId?: string;
      waiterId?: string;
      customerName?: string;
      customerPhone?: string;
      total: number;
      items: RestaurantOrderItemInput[];
    },
    actor?: ActivityActorContext,
  ) {
    // Basic idempotency: handled by the controller/client passing idempotency key if needed,
    // but for order creation it's simpler.

    if (data.waiterId) {
      const waiterInTenant = await this.prisma.userRole.findFirst({
        where: {
          userId: data.waiterId,
          tenantId,
        },
        select: { id: true },
      });

      if (!waiterInTenant) {
        throw new BadRequestException(
          'Invalid waiter selected for this tenant',
        );
      }
    }

    const order = await this.prisma.$transaction(async (prisma) => {
      const activityActor = await this.resolveActivityActorForOrderCreate(
        tenantId,
        data.waiterId,
        actor,
      );

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
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              notes: item.notes,
              modifierSelections: item.modifierSelections || [],
              prepStatus: 'pending',
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

      await this.logRestaurantActivity(prisma, {
        tenantId,
        branchId,
        orderId: order.id,
        actionType: 'order_created',
        toStatus: 'Open',
        actor: activityActor,
        details: {
          tableId: data.tableId || null,
          waiterId: data.waiterId || null,
          total: Number(data.total || 0),
          itemsCount: data.items.length,
        },
      });

      return order;
    });

    this.realtimeGateway.emitRestaurantOrderEvent(tenantId, branchId, {
      type: 'created',
      orderId: order.id,
      status: order.status,
      order,
    });

    return order;
  }

  async updateStatus(
    id: string,
    tenantId: string,
    newStatus: string,
    isManagerOverride: boolean = false,
    actor?: ActivityActorContext,
    voidReason?: string,
  ) {
    const order = await this.findOne(id, tenantId);
    const actorUserId = actor?.userId;

    if (!isManagerOverride) {
      const allowedNextStates = VALID_TRANSITIONS[order.status] || [];
      if (!allowedNextStates.includes(newStatus)) {
        throw new BadRequestException(
          `Invalid state transition from ${order.status} to ${newStatus}`,
        );
      }
    }

    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      const updatedOrder = await prisma.restaurantOrder.update({
        where: { id },
        data: {
          status: newStatus,
          ticketVersion:
            newStatus === 'SentToKitchen' ? { increment: 1 } : undefined,
        },
      });

      if (newStatus === 'Served' || newStatus === 'Closed') {
        await this.applyBomConsumptionIfNeeded(prisma, order, actorUserId);
      }

      if (newStatus === 'Voided') {
        await this.applyBomReversalIfNeeded(prisma, order, actorUserId);
      }

      if (newStatus === 'Voided' && voidReason?.trim()) {
        await prisma.auditLog.create({
          data: {
            id: this.createAuditId(),
            userId: actorUserId,
            action: 'restaurant_order_voided',
            details: {
              tenantId,
              orderId: id,
              previousStatus: order.status,
              newStatus,
              voidReason: voidReason.trim(),
              tableId: order.tableId || null,
              total: order.total,
            },
          },
        });
      }

      await this.logRestaurantActivity(prisma, {
        tenantId,
        branchId: order.branchId,
        orderId: id,
        actionType: 'order_status_changed',
        fromStatus: order.status,
        toStatus: newStatus,
        actor,
        details: {
          isManagerOverride: !!isManagerOverride,
          voidReason: voidReason?.trim() || null,
          tableId: order.tableId || null,
          total: Number(order.total || 0),
        },
      });

      // Free table if closed or voided
      if (
        (newStatus === 'Closed' || newStatus === 'Voided') &&
        updatedOrder.tableId
      ) {
        await prisma.diningTable.update({
          where: { id: updatedOrder.tableId },
          data: { status: 'open' },
        });
      }

      return updatedOrder;
    });

    this.realtimeGateway.emitRestaurantOrderEvent(tenantId, order.branchId, {
      type: 'statusChanged',
      orderId: id,
      status: newStatus,
      order: updatedOrder,
    });

    return updatedOrder;
  }

  async addItems(
    id: string,
    tenantId: string,
    items: Array<{
      productId: string;
      quantity: number;
      price: number;
      notes?: string;
      modifierSelections?: unknown;
    }>,
    actor?: ActivityActorContext,
  ) {
    const order = await this.findOne(id, tenantId);

    if (order.status !== 'Open') {
      throw new BadRequestException(
        'Items can only be added when order is in Open state',
      );
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    const result = await this.prisma.$transaction(async (tx) => {
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
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 0),
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

      await this.logRestaurantActivity(tx, {
        tenantId,
        branchId: order.branchId,
        orderId: id,
        actionType: 'order_items_added',
        fromStatus: order.status,
        toStatus: order.status,
        actor,
        details: {
          addedItemsCount: items.length,
          addedTotal,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity || 0),
            price: Number(item.price || 0),
            notes: item.notes || null,
          })),
        },
      });

      return { order: updated, createdItems };
    });

    this.realtimeGateway.emitRestaurantOrderEvent(tenantId, order.branchId, {
      type: 'itemsAdded',
      orderId: id,
      status: result.order?.status,
      order: result.order,
    });

    return result;
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
    actor?: ActivityActorContext,
  ) {
    const order = await this.findOne(orderId, tenantId);

    if (
      !payload.isManagerOverride &&
      order.status !== 'Served' &&
      order.status !== 'SentToKitchen'
    ) {
      throw new BadRequestException(
        `Order must be in Served or SentToKitchen state before checkout. Current state: ${order.status}`,
      );
    }

    const existingSale = await this.prisma.sale.findFirst({
      where: {
        tenantId,
        restaurantOrderId: orderId,
      },
    });

    if (existingSale) {
      return this.salesService.getReceipt(
        existingSale.id,
        tenantId,
        order.branchId,
        'customer',
      );
    }

    if (!order.items?.length) {
      throw new BadRequestException(
        'Cannot checkout an empty restaurant order',
      );
    }

    const idempotencyKey =
      payload.idempotencyKey || `restaurant-checkout:${orderId}`;

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
        customerPhone:
          payload.customerPhone || order.customerPhone || undefined,
        branchId: order.branchId,
        restaurantOrderId: orderId,
        idempotencyKey,
        isSplitPayment: payload.paymentMethod === 'split',
        splitPayments:
          payload.paymentMethod === 'split' ? payload.splitPayments : undefined,
      },
      tenantId,
      userId,
    );

    await this.prisma.$transaction(async (tx) => {
      await this.applyBomConsumptionIfNeeded(tx, order, userId);

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

      await this.logRestaurantActivity(tx, {
        tenantId,
        branchId: order.branchId,
        orderId,
        actionType: 'order_checkout_completed',
        fromStatus: order.status,
        toStatus: 'Closed',
        actor,
        details: {
          paymentMethod: payload.paymentMethod,
          amountReceived:
            typeof payload.amountReceived === 'number'
              ? payload.amountReceived
              : null,
          splitPaymentsCount: Array.isArray(payload.splitPayments)
            ? payload.splitPayments.length
            : 0,
          customerName: payload.customerName || order.customerName || null,
          customerPhone: payload.customerPhone || order.customerPhone || null,
        },
      });
    });

    this.realtimeGateway.emitRestaurantOrderEvent(tenantId, order.branchId, {
      type: 'statusChanged',
      orderId,
      status: 'Closed',
    });

    return receipt;
  }
}
