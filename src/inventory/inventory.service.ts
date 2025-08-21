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
    private realtimeGateway: RealtimeGateway // Inject gateway
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

  async createInventory(dto: CreateInventoryDto, tenantId: string, actorUserId?: string, ip?: string) {
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
            productId: dto.productId,
            quantity: dto.quantity,
            tenantId,
            branchId: dto.branchId,
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
      await this.auditLogService.log(actorUserId || null, 'inventory_created', { inventoryId: result.id, ...dto }, ip);
    }
    // Emit real-time event
    this.realtimeGateway.emitInventoryUpdate({ productId: dto.productId, quantity: dto.quantity });
    return result;
  }

  async updateInventory(id: string, dto: UpdateInventoryDto, tenantId: string, actorUserId?: string, ip?: string) {
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
      await this.auditLogService.log(actorUserId || null, 'inventory_updated', { inventoryId: id, updatedFields: dto }, ip);
    }
    // Emit real-time event
    this.realtimeGateway.emitInventoryUpdate({ inventoryId: id, ...dto });
    return result;
  }

  async deleteInventory(id: string, tenantId: string, actorUserId?: string, ip?: string) {
    const result = await this.prisma.inventory.deleteMany({
      where: { id, tenantId },
    });
    if (this.auditLogService) {
      await this.auditLogService.log(actorUserId || null, 'inventory_deleted', { inventoryId: id }, ip);
    }
    return result;
  }
} 