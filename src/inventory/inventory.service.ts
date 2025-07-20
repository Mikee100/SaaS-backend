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

  async findAllByTenant(tenantId: string) {
    return this.prisma.inventory.findMany({
      where: { tenantId },
      include: { product: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createInventory(dto: CreateInventoryDto, tenantId: string, actorUserId?: string, ip?: string) {
    const inventory = await this.prisma.inventory.create({
      data: {
        ...dto,
        tenantId,
      },
    });
    if (this.auditLogService) {
      await this.auditLogService.log(actorUserId || null, 'inventory_created', { inventoryId: inventory.id, ...dto }, ip);
    }
    // Emit real-time event
    this.realtimeGateway.emitInventoryUpdate({ productId: dto.productId, quantity: dto.quantity });
    return inventory;
  }

  async updateInventory(id: string, dto: UpdateInventoryDto, tenantId: string, actorUserId?: string, ip?: string) {
    const result = await this.prisma.inventory.updateMany({
      where: { id, tenantId },
      data: dto,
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