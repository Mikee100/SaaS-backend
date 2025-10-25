import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BulkUploadRecordService {
  constructor(private prisma: PrismaService) {}

  async createBulkUploadRecord(data: {
    tenantId: string;
    branchId?: string;
    userId: string;
    supplierId?: string;
    totalProducts: number;
    totalValue: number;
    status: string;
    notes?: string;
  }) {
    return this.prisma.bulkUploadRecord.create({
      data: {
        ...data,
        uploadDate: new Date(),
      },
    });
  }

  async updateBulkUploadRecord(
    id: string,
    data: {
      totalProducts?: number;
      totalValue?: number;
      status?: string;
      supplierId?: string;
      notes?: string;
    },
  ) {
    return this.prisma.bulkUploadRecord.update({
      where: { id },
      data,
    });
  }

  async getBulkUploadRecords(tenantId: string, branchId?: string) {
    return this.prisma.bulkUploadRecord.findMany({
      where: {
        tenantId,
        ...(branchId && { branchId }),
      },
      include: {
        branch: true,
        supplier: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        products: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            stock: true,
          },
          take: 5, // Limit to first 5 products for performance
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        uploadDate: 'desc',
      },
    });
  }

  async getBulkUploadRecord(id: string, tenantId: string) {
    return this.prisma.bulkUploadRecord.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        branch: true,
        supplier: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        products: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            stock: true,
            cost: true,
          },
        },
      },
    });
  }

  async assignSupplierToBulkUploadRecord(
    id: string,
    supplierId: string,
    tenantId: string,
    userId: string,
  ) {
    // First verify the bulk upload record exists and belongs to the tenant
    const record = await this.prisma.bulkUploadRecord.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        products: true,
      },
    });

    if (!record) {
      throw new Error('Bulk upload record not found');
    }

    // Update the bulk upload record with the supplier
    await this.prisma.bulkUploadRecord.update({
      where: { id },
      data: { supplierId },
    });

    // Update all products in this bulk upload to have the supplier
    for (const product of record.products) {
      await this.prisma.product.update({
        where: { id: product.id },
        data: { supplierId },
      });
    }

    return this.getBulkUploadRecord(id, tenantId);
  }
}
