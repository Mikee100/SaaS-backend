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
  businessCategory?: string;
  businessSubcategory?: string;
  primaryProducts?: any;
  secondaryProducts?: any;
  businessDescription?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  foundedYear?: number;
  employeeCount?: string;
  annualRevenue?: string;
  businessHours?: any;
  website?: string;
  socialMedia?: any;
  kraPin?: string;
  vatNumber?: string;
  etimsQrUrl?: string;
  businessLicense?: string;
  taxId?: string;
  currency?: string;
  timezone?: string;
  invoiceFooter?: string;
  logoUrl?: string;
  favicon?: string;
  receiptLogo?: string;
  watermark?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customDomain?: string;
  whiteLabel?: boolean;
  apiKey?: string;
  webhookUrl?: string;
  rateLimit?: number;
  customIntegrations?: boolean;
  ssoEnabled?: boolean;
  auditLogs?: boolean;
  backupRestore?: boolean;
  stripeCustomerId?: string;
  }): Promise<any> {
    const defaultTenantData = {
      currency: 'KES',
      timezone: 'Africa/Nairobi',
      whiteLabel: false,
      customIntegrations: false,
      ssoEnabled: false,
      auditLogs: false,
      backupRestore: false,
      ...data
    };

    // Only include scalar fields from the schema, not relations
    const scalarFields = [
      'name', 'businessType', 'contactEmail', 'contactPhone',
      'businessCategory', 'businessSubcategory', 'primaryProducts', 'secondaryProducts', 'businessDescription',
      'address', 'city', 'state', 'country', 'postalCode', 'latitude', 'longitude',
      'foundedYear', 'employeeCount', 'annualRevenue', 'businessHours', 'website', 'socialMedia',
      'kraPin', 'vatNumber', 'etimsQrUrl', 'businessLicense', 'taxId',
      'currency', 'timezone', 'invoiceFooter', 'logoUrl', 'favicon', 'receiptLogo', 'watermark',
      'primaryColor', 'secondaryColor', 'customDomain', 'whiteLabel',
      'apiKey', 'webhookUrl', 'rateLimit', 'customIntegrations',
      'ssoEnabled', 'auditLogs', 'backupRestore', 'stripeCustomerId'
    ];
    const createData: any = {};
    for (const key of scalarFields) {
      if (defaultTenantData[key] !== undefined) {
        createData[key] = defaultTenantData[key];
      }
    }
    return this.prisma.tenant.create({ 
      data: createData 
    });
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
      'currency', 'timezone', 'invoiceFooter', 'logoUrl', 'favicon', 'receiptLogo', 'watermark',
      'primaryColor', 'secondaryColor', 'customDomain', 'whiteLabel',
      'apiKey', 'webhookUrl', 'rateLimit', 'customIntegrations',
      'ssoEnabled', 'auditLogs', 'backupRestore', 'stripeCustomerId'
    ];
    const data: any = {};
    for (const key of allowedFields) {
      if (dto[key] !== undefined) {
        // Convert specific fields to proper types
        if (key === 'foundedYear' && dto[key] !== null) {
          data[key] = parseInt(dto[key], 10);
        } else if (key === 'latitude' && dto[key] !== null) {
          data[key] = parseFloat(dto[key]);
        } else if (key === 'longitude' && dto[key] !== null) {
          data[key] = parseFloat(dto[key]);
        } else if (key === 'rateLimit' && dto[key] !== null) {
          data[key] = parseInt(dto[key], 10);
        } else {
          data[key] = dto[key];
        }
      }
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
