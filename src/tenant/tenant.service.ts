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
}
