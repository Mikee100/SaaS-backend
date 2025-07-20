import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async createTenant(data: {
    name: string;
    businessType: string;
    contactEmail: string;
    contactPhone?: string;
  }): Promise<any> {
    return this.prisma.tenant.create({ data });
  }

  async getAllTenants(): Promise<any[]> {
    return this.prisma.tenant.findMany();
  }

  async getTenantById(tenantId: string) {
    return this.prisma.tenant.findUnique({ where: { id: tenantId } });
  }

  async updateTenant(tenantId: string, dto: any) {
    // Only allow updating specific fields
    const allowedFields = [
      'name', 'businessType', 'contactEmail', 'contactPhone',
      'address', 'currency', 'timezone', 'invoiceFooter', 'logoUrl',
      'kraPin', 'vatNumber', 'etimsQrUrl',
    ];
    const data: any = {};
    for (const key of allowedFields) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    return this.prisma.tenant.update({ where: { id: tenantId }, data });
  }
}
