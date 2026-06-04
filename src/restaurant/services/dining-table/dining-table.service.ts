import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';

@Injectable()
export class DiningTableService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, branchId?: string) {
    return this.prisma.diningTable.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        orders: {
          where: { status: { notIn: ['Closed', 'Voided'] } },
        },
      },
      orderBy: { number: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const table = await this.prisma.diningTable.findUnique({
      where: { id },
      include: {
        orders: {
          where: { status: { notIn: ['Closed', 'Voided'] } },
          include: { items: true },
        },
      },
    });

    if (!table || table.tenantId !== tenantId) {
      throw new NotFoundException(`Table with ID ${id} not found`);
    }

    return table;
  }

  async create(tenantId: string, branchId: string, data: { number: string; capacity?: number }) {
    return this.prisma.diningTable.create({
      data: {
        tenantId,
        branchId,
        number: data.number,
        capacity: data.capacity,
        status: 'open',
      },
    });
  }

  async updateStatus(id: string, tenantId: string, status: string) {
    const table = await this.findOne(id, tenantId);
    
    return this.prisma.diningTable.update({
      where: { id: table.id },
      data: { status },
    });
  }

  async updateDetails(
    id: string,
    tenantId: string,
    data: { number?: string; capacity?: number },
  ) {
    const table = await this.findOne(id, tenantId);

    const nextNumber = typeof data.number === 'string' ? data.number.trim() : undefined;
    const nextCapacity =
      typeof data.capacity === 'number' && Number.isFinite(data.capacity)
        ? Math.max(1, Math.trunc(data.capacity))
        : undefined;

    return this.prisma.diningTable.update({
      where: { id: table.id },
      data: {
        ...(nextNumber ? { number: nextNumber } : {}),
        ...(nextCapacity !== undefined ? { capacity: nextCapacity } : {}),
      },
    });
  }
}
