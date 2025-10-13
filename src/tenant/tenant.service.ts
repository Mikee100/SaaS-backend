import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { BranchService } from '../branch/branch.service';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private branchService: BranchService,
  ) {}

  async createTenant(data: any): Promise<any> {
    // Only allow valid Tenant fields
    const allowedFields = [
      'name',
      'businessType',
      'contactEmail',
      'contactPhone',
      'businessCategory',
      'businessSubcategory',
      'primaryProducts',
      'secondaryProducts',
      'businessDescription',
      'address',
      'city',
      'state',
      'country',
      'postalCode',
      'latitude',
      'longitude',
      'foundedYear',
      'employeeCount',
      'annualRevenue',
      'businessHours',
      'website',
      'socialMedia',
      'kraPin',
      'vatNumber',
      'etimsQrUrl',
      'businessLicense',
      'taxId',
      'currency',
      'timezone',
      'invoiceFooter',
      'credits',
      'logoUrl',
      'loginLogoUrl',
      'favicon',
      'receiptLogo',
      'watermark',
      'dashboardLogoUrl',
      'emailLogoUrl',
      'mobileLogoUrl',
      'logoSettings',
      'primaryColor',
      'secondaryColor',
      'customDomain',
      'whiteLabel',
      'apiKey',
      'webhookUrl',
      'rateLimit',
      'customIntegrations',
      'ssoEnabled',
      'auditLogsEnabled',
      'backupRestore',
      'stripeCustomerId',
      'pdfTemplate',
    ];
    const filtered: any = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) filtered[key] = data[key];
    }
    const tenant = await this.prisma.tenant.create({ data: filtered });

    // Automatically create default stockThreshold configuration for new tenant
    const tenantConfigurationService =
      new (require('../config/tenant-configuration.service').TenantConfigurationService)(
        this.prisma,
      );
    await tenantConfigurationService.setTenantConfiguration(
      tenant.id,
      'stockThreshold',
      '10',
      {
        description: 'Default stock threshold',
        category: 'general',
        isEncrypted: false,
        isPublic: true,
      },
    );

    return tenant;
  }

  async getAllTenants(): Promise<any[]> {
    return this.prisma.tenant.findMany();
  }

  async getTenantById(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
  }

  async getTenant(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
  }

  async updateTenant(
    tenantId: string,
    dto: Partial<{
      name: string;
      businessType: string;
      contactEmail: string;
      contactPhone: string | null;
      businessCategory: string | null;
      businessSubcategory: string | null;
      primaryProducts: any;
      secondaryProducts: any;
      businessDescription: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      postalCode: string | null;
      latitude: number | null;
      longitude: number | null;
      foundedYear: number | null;
      employeeCount: string | null;
      annualRevenue: string | null;
      businessHours: any;
      website: string | null;
      socialMedia: any;
      kraPin: string | null;
      vatNumber: string | null;
      etimsQrUrl: string | null;
      businessLicense: string | null;
      taxId: string | null;
      currency: string | null;
      timezone: string | null;
      invoiceFooter: string | null;
      logoUrl: string | null;
      favicon: string | null;
      receiptLogo: string | null;
      watermark: string | null;
      primaryColor: string | null;
      secondaryColor: string | null;
      customDomain: string | null;
      whiteLabel: boolean | null;
      apiKey: string | null;
      webhookUrl: string | null;
      rateLimit: number | null;
      stripeCustomerId: string | null;
      pdfTemplate: any;
    }>,
  ) {
    // Get existing tenant
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existingTenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Update tenant
    const updateData: any = {};

    // Only include fields that are defined in the DTO and are valid tenant fields
    const validTenantFields = [
      'name',
      'businessType',
      'contactEmail',
      'contactPhone',
      'businessCategory',
      'businessSubcategory',
      'primaryProducts',
      'secondaryProducts',
      'businessDescription',
      'address',
      'city',
      'state',
      'country',
      'postalCode',
      'latitude',
      'longitude',
      'foundedYear',
      'employeeCount',
      'annualRevenue',
      'businessHours',
      'website',
      'socialMedia',
      'kraPin',
      'vatNumber',
      'etimsQrUrl',
      'businessLicense',
      'taxId',
      'currency',
      'timezone',
      'invoiceFooter',
      'logoUrl',
      'favicon',
      'receiptLogo',
      'watermark',
      'primaryColor',
      'secondaryColor',
      'customDomain',
      'whiteLabel',
      'apiKey',
      'webhookUrl',
      'rateLimit',
      'stripeCustomerId',
      'pdfTemplate',
    ];

    for (const key of validTenantFields) {
      if (dto[key] !== undefined && dto[key] !== null) {
        updateData[key] = dto[key];
      }
    }

    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    return updatedTenant;
  }

  async createTenantWithOwner(tenantData: {
    name: string;
    businessType: string;
    contactEmail: string;
    contactPhone?: string;
    branchName?: string;
    owner: {
      name: string;
      email: string;
      password: string;
    };
    [key: string]: any; // Allow additional fields
  }) {
    return this.prisma.$transaction(async (prisma) => {
      // 1. Create the tenant
      const tenant = await this.createTenant(tenantData);

      // 2. Create the main branch
      const branchName = tenantData.branchName || 'Main Branch';
      const mainBranch = await this.branchService.createBranch({
        name: branchName,
        email: tenantData.contactEmail,
        phone: tenantData.contactPhone,
        isMainBranch: true,
        tenantId: tenant.id,
      });

      // 3. Create the owner user
      const ownerUser = await this.userService.createUser({
        name: tenantData.owner.name,
        email: tenantData.owner.email,
        password: tenantData.owner.password,
        tenantId: tenant.id,
        branchId: mainBranch.id,
        role: 'owner',
      });

      return {
        tenant,
        branch: mainBranch,
        user: {
          id: ownerUser.id,
          name: ownerUser.name,
          email: ownerUser.email,
        },
      };
    });
  }

  async createOwnerUser(data: {
    name: string;
    email: string;
    password: string;
    tenantId: string;
    role?: string;
  }) {
    try {
      return await this.userService.createUser({
        name: data.name,
        email: data.email,
        password: data.password,
        tenantId: data.tenantId,
        role: data.role || 'admin',
      });
    } catch (error) {
      this.logger.error(
        `Error creating owner user for tenant ${data.tenantId}:`,
        error,
      );
      throw new BadRequestException('Failed to create owner user');
    }
  }
}
