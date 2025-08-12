import { Controller, Get, Post, Put, Body, Req, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { TenantService } from './tenant.service';
import { LogoService } from './logo.service';
import { Logger } from '@nestjs/common';

@Controller('tenant')
export class TenantController {
  private readonly logger = new Logger(TenantController.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly logoService: LogoService
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMyTenant(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.tenantService.getTenant(tenantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('me')
  async updateMyTenant(@Req() req, @Body() dto: any) {
    const tenantId = req.user.tenantId;
    return this.tenantService.updateTenant(tenantId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logo')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/logos',
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const user = req.user as any;
        const logoType = req.body.type || 'main';
        const name = `${user.tenantId}_${logoType}${ext}`;
        cb(null, name);
      },
    }),
    fileFilter: (req, file, cb) => {
      // Validate file type
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/x-icon'];
      if (!allowedMimes.includes(file.mimetype)) {
        return cb(new Error('Only image files (JPEG, PNG, SVG, ICO) are allowed!'), false);
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return cb(new Error('File size must be less than 5MB!'), false);
      }
      
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  }))
  async uploadLogo(@Req() req, @UploadedFile() file: Express.Multer.File, @Body() body: any) {
    if (!file) throw new Error('No file uploaded');
    
    const logoType = body.type || 'main';
    const logoUrl = `/uploads/logos/${file.filename}`;
    
    // Validate logo file
    const validation = await this.logoService.validateLogoFile(file, logoType);
    if (!validation.isValid) {
      throw new Error(`Logo validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Update the appropriate logo field based on type
    const updateData: any = {};
    switch (logoType) {
      case 'main':
        updateData.logoUrl = logoUrl;
        break;
      case 'favicon':
        updateData.favicon = logoUrl;
        break;
      case 'receiptLogo':
        updateData.receiptLogo = logoUrl;
        break;
      case 'etimsQrCode':
        updateData.etimsQrUrl = logoUrl;
        break;
      case 'watermark':
        updateData.watermark = logoUrl;
        break;
      default:
        updateData.logoUrl = logoUrl; // Default to main logo
    }
    
    await this.tenantService.updateTenant(req.user.tenantId, updateData);
    return { logoUrl, type: logoType, validation };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('logo/compliance')
  async getLogoCompliance(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.logoService.enforceLogoCompliance(tenantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('logo/validation')
  async validateLogos(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.logoService.validateTenantLogos(tenantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('logo/usage')
  async getLogoUsage(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.logoService.getLogoUsage(tenantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('logo/statistics')
  async getLogoStatistics(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.logoService.getLogoStatistics(tenantId);
  }

  // Enterprise branding endpoints
  @UseGuards(AuthGuard('jwt'))
  @Put('branding')
  async updateBranding(@Req() req, @Body() dto: any) {
    const tenantId = req.user.tenantId;
    const allowedFields = [
      'primaryColor', 'secondaryColor', 'customDomain', 'whiteLabel',
      'logoUrl', 'favicon', 'receiptLogo', 'watermark'
    ];
    
    const data: any = {};
    for (const key of allowedFields) {
      if (dto[key] !== undefined) {
        data[key] = dto[key];
      }
    }
    
    return this.tenantService.updateTenant(tenantId, data);
  }

  // Enterprise API endpoints
  @UseGuards(AuthGuard('jwt'))
  @Get('api-settings')
  async getApiSettings(@Req() req) {
    const tenant = await this.tenantService.getTenant(req.user.tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    return {
      apiKey: tenant.apiKey,
      webhookUrl: tenant.webhookUrl,
      rateLimit: tenant.rateLimit || 1000,
      customIntegrations: tenant.customIntegrations || false,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('api-settings')
  async updateApiSettings(@Req() req, @Body() apiSettings: any) {
    const tenantId = req.user.tenantId;
    return this.tenantService.updateTenant(tenantId, {
      webhookUrl: apiSettings.webhookUrl,
      rateLimit: apiSettings.rateLimit,
  // customIntegrations: apiSettings.customIntegrations,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('generate-api-key')
  async generateApiKey(@Req() req) {
    const tenantId = req.user.tenantId;
    const apiKey = `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    await this.tenantService.updateTenant(tenantId, { apiKey });
    return { apiKey };
  }

  // Public endpoint for business registration
  @Post()
  async createTenant(@Body() createTenantDto: any) {
  this.logger.debug('Raw request body:', JSON.stringify(createTenantDto));
  console.log('[TenantController] Incoming registration payload:', JSON.stringify(createTenantDto));
    
    try {
      console.log('[TenantController] Starting tenant creation process...');
      // Extract owner information from the request
      const {
        ownerName,
        ownerEmail,
        ownerPassword,
        ownerRole = 'owner',
        ...tenantData
      } = createTenantDto;

      // Validate required fields
      if (!ownerName || !ownerEmail || !ownerPassword) {
        throw new BadRequestException('Missing required owner information');
      }

      // Create the tenant with all required data
      const tenant = await this.tenantService.createTenant({
        ...tenantData,
        ownerName,
        ownerEmail,
        ownerPassword,
        ownerRole,
      });
      console.log('[TenantController] Tenant creation result:', tenant);

      // Create the owner user with the selected role
      const ownerUser = await this.tenantService.createOwnerUser({
        name: ownerName,
        email: ownerEmail,
        password: ownerPassword,
        tenantId: tenant.id,
        role: ownerRole || 'admin',
      });
      console.log('[TenantController] Owner user creation result:', ownerUser);

      return { success: true, data: tenant };
    } catch (error) {
      this.logger.error('Error creating tenant:', error);
      console.error('[TenantController] Error during tenant registration:', error);
      throw error;
    }
  }
}
