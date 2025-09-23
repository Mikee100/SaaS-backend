import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private prisma: PrismaService, 
    private userService: UserService
  ) {}

<<<<<<< HEAD
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
    stripeCustomerId?: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    ownerRole?: string;
  }): Promise<any> {
    // Input validation with detailed error messages
    console.log('[TenantService] createTenant called with:', JSON.stringify(data));
    const requiredFields = [
      { key: 'name', label: 'Business Name' },
      { key: 'businessType', label: 'Business Type' },
      { key: 'contactEmail', label: 'Contact Email' },
      { key: 'ownerName', label: 'Owner Name' },
      { key: 'ownerEmail', label: 'Owner Email' },
      { key: 'ownerPassword', label: 'Owner Password' },
    ];

    const missingFields = requiredFields
      .filter(({ key }) => !data[key as keyof typeof data])
      .map(({ label }) => label);

    if (missingFields.length > 0) {
      const errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
      this.logger.error(`Failed to create tenant: ${errorMessage}`, {
        receivedData: Object.keys(data),
        missingFields,
        timestamp: new Date().toISOString(),
      });
      console.error('[TenantService] Validation failed:', errorMessage);
      throw new BadRequestException(errorMessage);
    }

    // Log the incoming request data (excluding sensitive information)
    const loggableData = { ...data };
    if (loggableData.ownerPassword) {
      loggableData.ownerPassword = '***';
    }
    
    this.logger.debug('Creating tenant with data:', {
      ...loggableData,
      timestamp: new Date().toISOString(),
    });
    console.log('[TenantService] Creating tenant with data:', loggableData);

    // Only include fields that exist in the Tenant model
    const validTenantFields = [
      'name', 'businessType', 'contactEmail', 'contactPhone',
      'businessCategory', 'businessSubcategory', 'primaryProducts', 'secondaryProducts', 
      'businessDescription', 'address', 'city', 'state', 'country', 'postalCode', 
      'latitude', 'longitude', 'foundedYear', 'employeeCount', 'annualRevenue', 
      'businessHours', 'website', 'socialMedia', 'kraPin', 'vatNumber', 'etimsQrUrl', 
      'businessLicense', 'taxId', 'currency', 'timezone', 'invoiceFooter', 'logoUrl', 
      'favicon', 'receiptLogo', 'watermark', 'primaryColor', 'secondaryColor', 
      'customDomain', 'whiteLabel', 'apiKey', 'webhookUrl', 'rateLimit', 'stripeCustomerId'
    ];

    const createData: any = {};
    
    // Only include fields that are defined in the input and are valid tenant fields
    for (const key of validTenantFields) {
      if (data[key as keyof typeof data] !== undefined && data[key as keyof typeof data] !== null) {
        createData[key] = data[key as keyof typeof data];
      }
    }

    // Wrap in a transaction to ensure both tenant and user are created or none
    return await this.prisma.$transaction(async (prisma) => {
      try {
        // Log the data being used to create the tenant
        this.logger.debug('Creating tenant with prisma data:', {
          tenantData: createData,
          timestamp: new Date().toISOString(),
        });
        console.log('[TenantService] Creating tenant in DB with:', createData);
        // Create tenant
        const tenant = await prisma.tenant.create({ 
          data: createData 
        });
        console.log('[TenantService] Tenant created:', tenant);

        // Automatically create a primary branch for this tenant
        const branchName = tenant.name;
        const branchAddress = tenant.address || '';
        const primaryBranch = await prisma.branch.create({
          data: {
            name: branchName,
            address: branchAddress,
            tenantId: tenant.id,
          }
        });
        console.log('[TenantService] Primary branch created:', primaryBranch);

        this.logger.debug('Tenant created successfully, creating owner user', {
          tenantId: tenant.id,
          ownerEmail: data.ownerEmail,
          timestamp: new Date().toISOString(),
        });
        // Create owner user using the transaction's prisma client
        const ownerUser = await this.userService.createUser({
          name: data.ownerName,
          email: data.ownerEmail,
          password: data.ownerPassword,
          role: data.ownerRole || 'admin',
          tenantId: tenant.id,
        }, undefined, undefined, prisma);
        console.log('[TenantService] Owner user created:', ownerUser);

        this.logger.debug('Owner user created successfully', {
          tenantId: tenant.id,
          ownerEmail: data.ownerEmail,
          timestamp: new Date().toISOString(),
        });

        // Optionally, return branch info with tenant
        return { ...tenant, primaryBranch };
      } catch (error) {
        this.logger.error('Error in tenant creation transaction:', {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
        console.error('[TenantService] Error in transaction:', error);
        throw new BadRequestException(
          error.message || 'Failed to create tenant and owner user',
          {
            cause: error,
            description: error.response?.message || error.toString(),
          }
        );
      }
    });
=======
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
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
  }

  async getAllTenants(): Promise<any[]> {
    return this.prisma.tenant.findMany();
  }

  async getTenantById(tenantId: string) {
    return this.prisma.tenant.findUnique({ 
      where: { id: tenantId } 
    });
  }

  async getTenant(tenantId: string) {
    return this.prisma.tenant.findUnique({ 
      where: { id: tenantId } 
    });
  }

  async updateTenant(tenantId: string, dto: Partial<{
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
  }>) {
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
      'name', 'businessType', 'contactEmail', 'contactPhone',
      'businessCategory', 'businessSubcategory', 'primaryProducts', 'secondaryProducts', 
      'businessDescription', 'address', 'city', 'state', 'country', 'postalCode', 
      'latitude', 'longitude', 'foundedYear', 'employeeCount', 'annualRevenue', 
      'businessHours', 'website', 'socialMedia', 'kraPin', 'vatNumber', 'etimsQrUrl', 
      'businessLicense', 'taxId', 'currency', 'timezone', 'invoiceFooter', 'logoUrl', 
      'favicon', 'receiptLogo', 'watermark', 'primaryColor', 'secondaryColor', 
      'customDomain', 'whiteLabel', 'apiKey', 'webhookUrl', 'rateLimit', 'stripeCustomerId'
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

  async createOwnerUser(data: { 
    name: string; 
    email: string; 
    password: string; 
    tenantId: string; 
    role?: string;
  }) {
    try {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      return await this.userService.createUser({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        tenantId: data.tenantId,
        role: data.role || 'admin',
      });
    } catch (error) {
      this.logger.error(`Error creating owner user for tenant ${data.tenantId}:`, error);
      throw new BadRequestException('Failed to create owner user');
    }
  }
}
