import { Controller, Get, Post, Put, Body, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { TenantService } from './tenant.service';

@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMyTenant(@Req() req) {
    return this.tenantService.getTenant(req.user.tenantId);
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
        const user = req.user as any; // or as { tenantId: string }
        const name = `${user.tenantId}${ext}`;
        cb(null, name);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed!'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  }))
  async uploadLogo(@Req() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('No file uploaded');
    const logoUrl = `/uploads/logos/${file.filename}`;
    await this.tenantService.updateTenant(req.user.tenantId, { logoUrl });
    return { logoUrl };
  }

  // Enterprise branding endpoints
  @UseGuards(AuthGuard('jwt'))
  @Get('branding')
  async getBrandingSettings(@Req() req) {
    const tenant = await this.tenantService.getTenant(req.user.tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    return {
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor || '#3B82F6',
      secondaryColor: tenant.secondaryColor || '#1F2937',
      customDomain: tenant.customDomain,
      whiteLabel: tenant.whiteLabel || false,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('branding')
  async updateBrandingSettings(@Req() req, @Body() branding: any) {
    const tenantId = req.user.tenantId;
    return this.tenantService.updateTenant(tenantId, {
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      customDomain: branding.customDomain,
      whiteLabel: branding.whiteLabel,
    });
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
      customIntegrations: apiSettings.customIntegrations,
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
  async createTenant(@Body() dto: any) {
    // Extract owner information from the request
    const {
      ownerName,
      ownerEmail,
      ownerPassword,
      ownerRole = 'owner',
      ...tenantData
    } = dto;

    // Create the tenant first
    const tenant = await this.tenantService.createTenant(tenantData);

    // Create the owner user if owner information is provided
    if (ownerName && ownerEmail && ownerPassword) {
      await this.tenantService.createOwnerUser({
        name: ownerName,
        email: ownerEmail,
        password: ownerPassword,
        tenantId: tenant.id,
      });
    }

    return tenant;
  }
}
