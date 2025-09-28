import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateInventoryDto } from './create-inventory.dto';
import { UpdateInventoryDto } from './update-inventory.dto';
import { AuditLogService } from '../audit-log.service';
import { RealtimeGateway } from '../realtime.gateway';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private realtimeGateway: RealtimeGateway, // Inject gateway
  ) {}

  async findAllByBranch(tenantId: string, branchId: string) {
    return this.prisma.inventory.findMany({
      where: { tenantId, branchId },
      include: { product: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.inventory.findMany({
      where: { tenantId },
      include: { product: true, branch: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createInventory(
    dto: CreateInventoryDto,
    tenantId: string,
    actorUserId?: string,
    ip?: string,
  ) {
    // Use a transaction to update both inventory and product stock
    const result = await this.prisma.$transaction(async (prisma) => {
      // Check if inventory record already exists
      const existingInventory = await prisma.inventory.findFirst({
        where: {
          productId: dto.productId,
          tenantId: tenantId,
          branchId: dto.branchId,
        },
      });

      let inventory;
      if (existingInventory) {
        // Update existing inventory record
        inventory = await prisma.inventory.update({
          where: { id: existingInventory.id },
          data: { quantity: dto.quantity, branchId: dto.branchId },
        });
      } else {
        // Create new inventory record
        inventory = await prisma.inventory.create({
          data: {
            id: `inv_${Date.now()}`,
            productId: dto.productId,
            quantity: dto.quantity,
            tenantId,
            branchId: dto.branchId,
            updatedAt: new Date(),
          },
        });
      }

      // Update the product's stock field to match inventory
      await prisma.product.updateMany({
        where: {
          id: dto.productId,
          tenantId: tenantId,
        },
        data: {
          stock: dto.quantity,
        },
      });

      return inventory;
    });

    if (this.auditLogService) {
      await this.auditLogService.log(
        actorUserId || null,
        'inventory_created',
        { inventoryId: result.id, ...dto },
        ip,
      );
    }
    // Emit real-time event
    this.realtimeGateway.emitInventoryUpdate({
      productId: dto.productId,
      quantity: dto.quantity,
    });
    return result;
  }

  async updateInventory(
    id: string,
    dto: UpdateInventoryDto,
    tenantId: string,
    actorUserId?: string,
    ip?: string,
  ) {
    // Use a transaction to update both inventory and product stock
    const result = await this.prisma.$transaction(async (prisma) => {
      // Update inventory record
      const inventory = await prisma.inventory.updateMany({
        where: { id, tenantId },
        data: {
          quantity: dto.quantity,
          branchId: dto.branchId,
        },
      });

      // Get the inventory record to find the product ID
      const inventoryRecord = await prisma.inventory.findFirst({
        where: { id, tenantId },
      });

      if (inventoryRecord && dto.quantity !== undefined) {
        // Update the product's stock field to match inventory
        await prisma.product.updateMany({
          where: {
            id: inventoryRecord.productId,
            tenantId: tenantId,
          },
          data: {
            stock: dto.quantity,
          },
        });
      }

      return inventory;
    });

    if (this.auditLogService) {
      await this.auditLogService.log(
        actorUserId || null,
        'inventory_updated',
        { inventoryId: id, updatedFields: dto },
        ip,
      );
    }
    // Emit real-time event
    this.realtimeGateway.emitInventoryUpdate({ inventoryId: id, ...dto });
    return result;
  }

  async deleteInventory(
    id: string,
    tenantId: string,
    actorUserId?: string,
    ip?: string,
  ) {
    const result = await this.prisma.inventory.deleteMany({
      where: { id, tenantId },
    });
    if (this.auditLogService) {
      await this.auditLogService.log(
        actorUserId || null,
        'inventory_deleted',
        { inventoryId: id },
        ip,
      );
    }
    return result;
  }

  async findAdvanced(tenantId: string, branchId?: string) {
    const where = branchId ? { tenantId, branchId } : { tenantId };
    return this.prisma.inventory.findMany({
      where,
      include: {
        product: true,
        branch: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMovements(tenantId: string, branchId?: string) {
    const where = branchId ? { tenantId, branchId } : { tenantId };
    return this.prisma.inventoryMovement.findMany({
      where,
      include: {
        product: true,
        branch: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to recent movements
    });
  }

  async getAlerts(tenantId: string, branchId?: string) {
    const where = branchId ? { tenantId, branchId } : { tenantId };
    return this.prisma.inventoryAlert.findMany({
      where,
      include: {
        product: true,
        branch: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLocations(tenantId: string, branchId?: string) {
    const where = branchId ? { tenantId, branchId } : { tenantId };
    return this.prisma.inventoryLocation.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async getForecast(tenantId: string, branchId?: string) {
    // Get inventory data for forecasting
    const where = branchId ? { tenantId, branchId } : { tenantId };
    const inventory = await this.prisma.inventory.findMany({
      where,
      include: { product: true },
    });

    // Get recent sales data for forecasting (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        ...(branchId && { branchId }),
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        SaleItem: {
          include: { product: true },
        },
      },
    });

    // Calculate forecast data
    const forecastData = inventory.map((item) => {
      const productSales = sales.flatMap(sale =>
        sale.SaleItem.filter(item => item.productId === item.productId)
      );

      const totalSold = productSales.reduce((sum, saleItem) => sum + saleItem.quantity, 0);
      const averageDailySales = totalSold / 30;
      const daysUntilStockout = item.quantity / Math.max(averageDailySales, 0.1);
      const recommendedOrder = Math.max(item.reorderPoint - item.quantity, 0);

      // Simple confidence calculation based on sales consistency
      const confidence = Math.min(totalSold > 0 ? 80 : 60, 95);

      return {
        productId: item.productId,
        product: item.product,
        currentStock: item.quantity,
        averageDailySales: Math.round(averageDailySales * 100) / 100,
        daysUntilStockout: Math.round(daysUntilStockout),
        recommendedOrder: Math.round(recommendedOrder),
        confidence,
      };
    });

    return forecastData;
  }

  async createMovement(
    dto: {
      productId: string;
      type: 'in' | 'out' | 'adjustment' | 'transfer';
      quantity: number;
      reason?: string;
      location: string;
      destinationLocation?: string;
      branchId?: string;
    },
    tenantId: string,
    actorUserId?: string,
    ip?: string,
  ) {
    // Get current inventory
    const currentInventory = await this.prisma.inventory.findFirst({
      where: {
        productId: dto.productId,
        tenantId,
        branchId: dto.branchId,
      },
    });

    if (!currentInventory) {
      throw new Error('Inventory record not found');
    }

    const previousQuantity = currentInventory.quantity;
    let newQuantity = previousQuantity;

    // Calculate new quantity based on movement type
    switch (dto.type) {
      case 'in':
        newQuantity = previousQuantity + dto.quantity;
        break;
      case 'out':
        newQuantity = Math.max(0, previousQuantity - dto.quantity);
        break;
      case 'adjustment':
        newQuantity = dto.quantity; // Direct set
        break;
      case 'transfer':
        // For transfer, we would need to handle moving between locations
        // For now, just record the movement
        break;
    }

    // Update inventory
    await this.prisma.inventory.updateMany({
      where: {
        productId: dto.productId,
        tenantId,
        branchId: dto.branchId,
      },
      data: { quantity: newQuantity, updatedAt: new Date() },
    });

    // Create movement record
    const movement = await this.prisma.inventoryMovement.create({
      data: {
        productId: dto.productId,
        type: dto.type,
        quantity: dto.quantity,
        previousQuantity,
        newQuantity,
        reason: dto.reason,
        location: dto.location,
        createdBy: actorUserId || '',
        branchId: dto.branchId,
        tenantId,
      },
    });

    // Check for alerts
    await this.checkAndCreateAlerts(currentInventory, newQuantity, tenantId, dto.branchId);

    if (this.auditLogService) {
      await this.auditLogService.log(
        actorUserId || null,
        'inventory_movement',
        { movementId: movement.id, ...dto },
        ip,
      );
    }

    // Emit real-time event
    this.realtimeGateway.emitInventoryUpdate({
      productId: dto.productId,
      quantity: newQuantity,
      type: dto.type,
    });

    return movement;
  }

  private async checkAndCreateAlerts(
    inventory: any,
    newQuantity: number,
    tenantId: string,
    branchId?: string,
  ) {
    const alerts: any[] = [];

    if (newQuantity === 0) {
      alerts.push({
        productId: inventory.productId,
        type: 'out_of_stock',
        message: `Product ${inventory.product?.name} is out of stock`,
        severity: 'critical',
        branchId,
        tenantId,
      });
    } else if (newQuantity <= inventory.reorderPoint) {
      alerts.push({
        productId: inventory.productId,
        type: 'low_stock',
        message: `Product ${inventory.product?.name} is low on stock (${newQuantity} remaining)`,
        severity: 'medium',
        branchId,
        tenantId,
      });
    } else if (newQuantity > inventory.maxStock) {
      alerts.push({
        productId: inventory.productId,
        type: 'over_stock',
        message: `Product ${inventory.product?.name} is over stocked (${newQuantity} > ${inventory.maxStock})`,
        severity: 'low',
        branchId,
        tenantId,
      });
    }

    // Create alerts
    for (const alert of alerts) {
      await this.prisma.inventoryAlert.create({ data: alert });
    }
  }
}
