import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateInventoryDto } from './create-inventory.dto';
import { UpdateInventoryDto } from './update-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async findAllByTenant(tenantId: string) {
    return this.prisma.inventory.findMany({
      where: { tenantId },
      include: { product: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createInventory(dto: CreateInventoryDto, tenantId: string) {
    return this.prisma.inventory.create({
      data: {
        ...dto,
        tenantId,
      },
    });
  }

  async updateInventory(id: string, dto: UpdateInventoryDto, tenantId: string) {
    return this.prisma.inventory.updateMany({
      where: { id, tenantId },
      data: dto,
    });
  }

  async deleteInventory(id: string, tenantId: string) {
    return this.prisma.inventory.deleteMany({
      where: { id, tenantId },
    });
  }
} 