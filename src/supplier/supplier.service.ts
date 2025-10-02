import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';

@Injectable()
export class SupplierService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.supplier.findMany({
      where: { tenantId, isActive: true },
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    return this.prisma.supplier.findFirst({
      where: { id, tenantId },
      include: {
        products: {
          include: {
            inventory: true,
          }
        },
        _count: {
          select: { products: true }
        }
      },
    });
  }

  async create(data: {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    website?: string;
    notes?: string;
  }, tenantId: string, actorUserId?: string, ip?: string) {
    const supplier = await this.prisma.supplier.create({
      data: {
        ...data,
        tenantId,
      },
    });

    if (this.auditLogService) {
      await this.auditLogService.log(
        actorUserId || null,
        'supplier_created',
        { supplierId: supplier.id, name: supplier.name },
        ip,
      );
    }

    return supplier;
  }

  async update(id: string, data: Partial<{
    name: string;
    contactName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    postalCode: string;
    website: string;
    notes: string;
    isActive: boolean;
  }>, tenantId: string, actorUserId?: string, ip?: string) {
    const supplier = await this.prisma.supplier.updateMany({
      where: { id, tenantId },
      data,
    });

    if (this.auditLogService) {
      await this.auditLogService.log(
        actorUserId || null,
        'supplier_updated',
        { supplierId: id, updatedFields: data },
        ip,
      );
    }

    return supplier;
  }

  async remove(id: string, tenantId: string, actorUserId?: string, ip?: string) {
    // Check if supplier has products
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { products: true } } },
    });

    if (supplier && supplier._count.products > 0) {
      throw new Error('Cannot delete supplier with associated products. Remove products first or deactivate instead.');
    }

    const result = await this.prisma.supplier.deleteMany({
      where: { id, tenantId },
    });

    if (this.auditLogService) {
      await this.auditLogService.log(
        actorUserId || null,
        'supplier_deleted',
        { supplierId: id, name: supplier?.name },
        ip,
      );
    }

    return result;
  }

  async getSupplierStats(tenantId: string) {
    const suppliers = await this.prisma.supplier.findMany({
      where: { tenantId, isActive: true },
      include: {
        products: {
          include: {
            inventory: true,
          }
        },
      },
    });

    const stats = suppliers.map(supplier => {
      const totalProducts = supplier.products.length;
      const totalValue = supplier.products.reduce((sum, product) => {
        const inventory = product.inventory?.[0];
        return sum + ((inventory?.quantity || 0) * product.price);
      }, 0);

      const totalCost = supplier.products.reduce((sum, product) => {
        const inventory = product.inventory?.[0];
        return sum + ((inventory?.quantity || 0) * (product.cost || 0));
      }, 0);

      return {
        id: supplier.id,
        name: supplier.name,
        totalProducts,
        totalValue,
        totalCost,
        totalProfit: totalValue - totalCost,
      };
    });

    return stats;
  }
}
