import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async createTenant(data: any): Promise<any> {
    // Only allow valid Tenant fields
    const allowedFields = [
      'name', 'businessType', 'contactEmail', 'contactPhone',
      'businessCategory', 'businessSubcategory', 'primaryProducts', 'secondaryProducts', 'businessDescription',
      'address', 'city', 'state', 'country', 'postalCode', 'latitude', 'longitude',
      'foundedYear', 'employeeCount', 'annualRevenue', 'businessHours', 'website', 'socialMedia',
      'kraPin', 'vatNumber', 'etimsQrUrl', 'businessLicense', 'taxId',
      'currency', 'timezone', 'invoiceFooter', 'credits', 'logoUrl', 'loginLogoUrl', 'favicon', 'receiptLogo', 'watermark',
      'dashboardLogoUrl', 'emailLogoUrl', 'mobileLogoUrl', 'logoSettings',
      'primaryColor', 'secondaryColor', 'customDomain', 'whiteLabel', 'apiKey', 'webhookUrl', 'rateLimit', 'customIntegrations',
      'ssoEnabled', 'auditLogsEnabled', 'backupRestore', 'stripeCustomerId'
    ];
    const filtered: any = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) filtered[key] = data[key];
    }
    const tenant = await this.prisma.tenant.create({ data: filtered });

    // Automatically create default stockThreshold configuration for new tenant
    const tenantConfigurationService = new (require('../config/tenant-configuration.service').TenantConfigurationService)(this.prisma);
    await tenantConfigurationService.setTenantConfiguration(
      tenant.id,
      'stockThreshold',
      '10',
      {
        description: 'Default stock threshold',
        category: 'general',
        isEncrypted: false,
        isPublic: true,
      }
    );

    return tenant;
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
