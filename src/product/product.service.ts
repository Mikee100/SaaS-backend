import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async findAllByTenant(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProduct(data: { name: string; sku: string; price: number; description?: string; tenantId: string }) {
    return this.prisma.product.create({ data });
  }

  async updateProduct(id: string, data: any, tenantId: string) {
    return this.prisma.product.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async deleteProduct(id: string, tenantId: string) {
    return this.prisma.product.deleteMany({
      where: { id, tenantId },
    });
  }
}
