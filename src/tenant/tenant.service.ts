import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserService } from '../user/user.service';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService, private userService: UserService) {}

  async createTenant(data: {
    name: string;
    businessType: string;
    contactEmail: string;
    contactPhone?: string;
    // Enhanced business information
    businessCategory?: string;
    businessSubcategory?: string;
    primaryProducts?: any[];
    secondaryProducts?: any[];
    businessDescription?: string;
    // Location information
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    // Business details
    foundedYear?: number;
    employeeCount?: string;
    annualRevenue?: string;
    businessHours?: any;
    website?: string;
    socialMedia?: any;
    // Legal and compliance
    kraPin?: string;
    vatNumber?: string;
    etimsQrUrl?: string;
    businessLicense?: string;
    taxId?: string;
    // Financial settings
    currency?: string;
    timezone?: string;
    invoiceFooter?: string;
    logoUrl?: string;
  }): Promise<any> {
    return this.prisma.tenant.create({ data });
  }

  async getAllTenants(): Promise<any[]> {
    return this.prisma.tenant.findMany();
  }

  async getTenantById(tenantId: string) {
    return this.prisma.tenant.findUnique({ where: { id: tenantId } });
  }

  async getTenant(tenantId: string) {
    return this.prisma.tenant.findUnique({ where: { id: tenantId } });
  }

  async updateTenant(tenantId: string, dto: any) {
    // Only allow updating specific fields
    const allowedFields = [
      'name', 'businessType', 'contactEmail', 'contactPhone',
      'businessCategory', 'businessSubcategory', 'primaryProducts', 'secondaryProducts', 'businessDescription',
      'address', 'city', 'state', 'country', 'postalCode', 'latitude', 'longitude',
      'foundedYear', 'employeeCount', 'annualRevenue', 'businessHours', 'website', 'socialMedia',
      'kraPin', 'vatNumber', 'etimsQrUrl', 'businessLicense', 'taxId',
      'currency', 'timezone', 'invoiceFooter', 'logoUrl',
      'primaryColor', 'secondaryColor', 'customDomain', 'whiteLabel',
      'apiKey', 'webhookUrl', 'rateLimit', 'customIntegrations',
      'ssoEnabled', 'auditLogs', 'backupRestore'
    ];
    const data: any = {};
    for (const key of allowedFields) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    return this.prisma.tenant.update({ where: { id: tenantId }, data });
  }

  async createOwnerUser(data: { name: string; email: string; password: string; tenantId: string }) {
    // Use UserService to create user with role 'owner'
    return this.userService.createUser({
      name: data.name,
      email: data.email,
      password: data.password,
      role: 'owner',
      tenantId: data.tenantId,
    });
  }
}
