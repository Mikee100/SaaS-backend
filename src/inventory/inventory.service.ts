import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateInventoryDto } from './create-inventory.dto';
import { UpdateInventoryDto } from './update-inventory.dto';
import { AuditLogService } from '../audit-log.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService, private auditLogService: AuditLogService) {}

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