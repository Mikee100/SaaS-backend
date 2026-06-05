import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Req,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ValidationPipe,
  HttpException,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import axios from 'axios';
import { RegistrationDto } from './dto/registration.dto';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { TenantService } from './tenant.service';
import { Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { LogoService } from './logo.service';
import { TrialGuard } from '../auth/trial.guard';
import { AuthenticatedRequest } from '../auth/request.types';

interface TenantUserLike {
  tenantId?: string;
}

interface UploadLogoBody {
  type?: 'main' | 'favicon' | 'receiptLogo' | 'etimsQrCode' | 'watermark';
}

interface ApiSettingsBody {
  webhookUrl?: string;
  rateLimit?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

@Controller('tenant')
@UseGuards(ThrottlerGuard)
export class TenantController {
  private readonly logger = new Logger(TenantController.name);
  private readonly recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;

  constructor(
    private readonly tenantService: TenantService,
    private readonly userService: UserService,
    private readonly logoService: LogoService,
  ) {}

  private async validateRecaptcha(token: string): Promise<boolean> {
    // Skip validation for test token in development
    if (token === 'test-recaptcha-token') {
      this.logger.debug('Using test reCAPTCHA token, skipping validation');
      return true;
    }

    if (!this.recaptchaSecretKey) {
      this.logger.warn('reCAPTCHA secret key not configured');
      return true; // Skip validation in development
    }

    try {
      const response = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        null,
        {
          params: {
            secret: this.recaptchaSecretKey,
            response: token,
          },
        },
      );

      const data = response.data as { success?: boolean; score?: number };
      return data.success === true && (data.score ?? 0) >= 0.5;
    } catch (error) {
      this.logger.error('reCAPTCHA validation failed:', error);
      return false;
    }
  }

  @UseGuards(AuthGuard('jwt'), TrialGuard)
  @Get('me')
  async getMyTenant(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    return this.tenantService.getTenantById(tenantId);
  }

  @UseGuards(AuthGuard('jwt'), TrialGuard)
  @Put('me')
  async updateMyTenant(
    @Req() req: AuthenticatedRequest,
    @Body() dto: Record<string, unknown>,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    return this.tenantService.updateTenant(tenantId, dto);
  }

  @UseGuards(AuthGuard('jwt'), TrialGuard)
  @Post('logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/logos',
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const request = req as AuthenticatedRequest & {
            body?: unknown;
            user: TenantUserLike;
          };
          const rawType = isRecord(request.body)
            ? request.body.type
            : undefined;
          const logoType = typeof rawType === 'string' ? rawType : 'main';
          const tenantId = request.user.tenantId || 'unknown-tenant';
          const name = `${tenantId}_${logoType}${ext}`;
          cb(null, name);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Validate file type
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/svg+xml',
          'image/x-icon',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new Error('Only image files (JPEG, PNG, SVG, ICO) are allowed!'),
            false,
          );
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          return cb(new Error('File size must be less than 5MB!'), false);
        }

        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadLogo(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadLogoBody,
  ) {
    if (!file) throw new Error('No file uploaded');

    const logoType = body.type || 'main';
    const logoUrl = `/uploads/logos/${file.filename}`;

    // Validate logo file
    // Update the appropriate logo field based on type
    const updateData: Record<string, string> = {};
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
    if (!req.user.tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    await this.tenantService.updateTenant(req.user.tenantId, updateData);
    return { logoUrl, type: logoType };
  }

  @UseGuards(AuthGuard('jwt'), TrialGuard)
  @Get('logo/compliance')
  async getLogoCompliance(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    return this.logoService.enforceLogoCompliance(tenantId);
  }

  // @UseGuards(AuthGuard('jwt'))
  // @Get('logo/validation')
  // async validateLogos(@Req() req) {
  //   const tenantId = req.user.tenantId;
  //   return this.logoService.validateTenantLogos(tenantId);
  // }

  // @UseGuards(AuthGuard('jwt'))
  // @Get('logo/usage')
  // async getLogoUsage(@Req() req) {
  //   const tenantId = req.user.tenantId;
  //   return this.logoService.getLogoUsage(tenantId);
  // }

  @UseGuards(AuthGuard('jwt'), TrialGuard)
  @Get('logo/statistics')
  async getLogoStatistics(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    return this.logoService.getLogoStatistics(tenantId);
  }

  // Enterprise branding endpoints
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  @Put('branding')
  async updateBranding(
    @Req() req: AuthenticatedRequest,
    @Body() dto: Record<string, unknown>,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    const allowedFields = [
      'primaryColor',
      'secondaryColor',
      'customDomain',
      'whiteLabel',
      'logoUrl',
      'favicon',
      'receiptLogo',
      'watermark',
    ];

    const data: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (dto[key] !== undefined) {
        data[key] = dto[key];
      }
    }

    return this.tenantService.updateTenant(tenantId, data);
  }

  // Enterprise API endpoints
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  @Get('api-settings')
  async getApiSettings(@Req() req: AuthenticatedRequest) {
    if (!req.user.tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    const tenant = await this.tenantService.getTenantById(req.user.tenantId);
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

  @UseGuards(AuthGuard('jwt'), TrialGuard)
  @Put('api-settings')
  async updateApiSettings(
    @Req() req: AuthenticatedRequest,
    @Body() apiSettings: ApiSettingsBody,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    return this.tenantService.updateTenant(tenantId, {
      webhookUrl: apiSettings.webhookUrl,
      rateLimit: apiSettings.rateLimit,
      // customIntegrations: apiSettings.customIntegrations,
    });
  }

  @UseGuards(AuthGuard('jwt'), TrialGuard)
  @Put('pdf-template')
  async updatePdfTemplate(
    @Req() req: AuthenticatedRequest,
    @Body() pdfTemplate: unknown,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    return this.tenantService.updateTenant(tenantId, { pdfTemplate });
  }

  @UseGuards(AuthGuard('jwt'), TrialGuard)
  @Post('generate-api-key')
  async generateApiKey(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    const apiKey = `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    await this.tenantService.updateTenant(tenantId, { apiKey });
    return { apiKey };
  }

  // Public endpoint for business registration
  @Post()
  @UseGuards(ThrottlerGuard)
  async createTenant(
    @Body(new ValidationPipe({ transform: true }))
    createTenantDto: RegistrationDto,
  ) {
    this.logger.debug('Raw request body:', JSON.stringify(createTenantDto));

    try {
      // reCAPTCHA validation
      if (!(await this.validateRecaptcha(createTenantDto.recaptchaToken))) {
        throw new HttpException(
          'Invalid reCAPTCHA. Please try again.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Extract validated data
      const {
        name,
        businessType,
        contactEmail,
        branchName,
        owner,
        ...otherData
      } = createTenantDto;

      // Create the tenant with branch and owner
      const result = await this.tenantService.createTenantWithOwner({
        name,
        businessType,
        contactEmail,
        contactPhone: otherData.contactPhone,
        branchName,
        owner: {
          name: owner.name,
          email: owner.email,
          password: owner.password,
        },
        ...otherData, // Pass other sanitized fields
      });

      return {
        success: true,
        data: {
          tenant: result.tenant,
          branch: result.branch,
          user: result.user,
        },
      };
    } catch (error) {
      this.logger.error('Error creating tenant:', error);
      console.error(
        '[TenantController] Error during tenant registration:',
        error,
      );
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'), TrialGuard)
  @Get('notifications')
  async getNotifications(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    const prefs = await this.tenantService.getNotificationPreferences(tenantId);
    return prefs ?? {};
  }

  @UseGuards(AuthGuard('jwt'), TrialGuard)
  @Put('notifications')
  async updateNotifications(
    @Req() req: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    return this.tenantService.updateNotificationPreferences(tenantId, body);
  }

  @UseGuards(AuthGuard('jwt'), TrialGuard)
  @Get('integrations')
  async getIntegrations(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    return this.tenantService.getIntegrationsList(tenantId);
  }

  @UseGuards(AuthGuard('jwt'), TrialGuard)
  @Post('integrations/:id/connect')
  connectIntegration(@Param('id') id: string) {
    if (id === 'stripe') {
      return { url: '/settings/billing/stripe-config' };
    }
    return { url: null };
  }

  @UseGuards(AuthGuard('jwt'), TrialGuard)
  @Post('integrations/:id/test')
  async testIntegration(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    if (id === 'mpesa') {
      const tenant = await this.tenantService.getTenantById(tenantId);
      if (!tenant?.mpesaIsActive) {
        throw new BadRequestException('M-Pesa is not configured or active');
      }
      return { success: true };
    }
    if (id === 'stripe') {
      const list = await this.tenantService.getIntegrationsList(tenantId);
      const stripe = list.find((i) => i.id === 'stripe');
      if (stripe?.status !== 'connected') {
        throw new BadRequestException('Stripe is not connected');
      }
      return { success: true };
    }
    throw new BadRequestException('Test not supported for this integration');
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getTenants(@Req() req: AuthenticatedRequest) {
    const isSuperadmin = req.user.isSuperadmin === true;
    if (isSuperadmin) {
      // Return all tenants for superadmin
      return await this.tenantService.getAllTenants();
    }
    // Return tenant for user
    if (!req.user.tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    return await this.tenantService.getTenantById(req.user.tenantId);
  }
}
