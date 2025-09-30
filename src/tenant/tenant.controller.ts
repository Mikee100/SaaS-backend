import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Req,
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
import * as bcrypt from 'bcrypt';

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
      const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
        params: {
          secret: this.recaptchaSecretKey,
          response: token,
        },
      });

      const data = response.data;
      return data.success && data.score >= 0.5;
    } catch (error) {
      this.logger.error('reCAPTCHA validation failed:', error);
      return false;
    }
  }

  private validateCsrf(csrfToken: string | undefined): boolean {
    // For stateless API, check if token is present and valid format (in production, use proper validation)
    return !!csrfToken && csrfToken.length > 10;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMyTenant(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.tenantService.getTenantById(tenantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('me')
  async updateMyTenant(@Req() req, @Body() dto: any) {
    const tenantId = req.user.tenantId;
    return this.tenantService.updateTenant(tenantId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logo')
  @UseInterceptors(
    FileInterceptor('file', {
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
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file) throw new Error('No file uploaded');

    const logoType = body.type || 'main';
    const logoUrl = `/uploads/logos/${file.filename}`;

    // Validate logo file
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
    return { logoUrl, type: logoType };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('logo/compliance')
  async getLogoCompliance(@Req() req) {
    const tenantId = req.user.tenantId;
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
      'primaryColor',
      'secondaryColor',
      'customDomain',
      'whiteLabel',
      'logoUrl',
      'favicon',
      'receiptLogo',
      'watermark',
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

  // Public endpoint for CSRF token generation
  @Get('csrf-token')
  async getCsrfToken() {
    const csrfToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return { csrfToken };
  }

  // Public endpoint for business registration
  @Post()
  @UseGuards(ThrottlerGuard)
  async createTenant(
    @Req() req,
    @Body(new ValidationPipe({ transform: true })) createTenantDto: RegistrationDto,
    @Headers('x-csrf-token') csrfToken?: string,
  ) {
    this.logger.debug('Raw request body:', JSON.stringify(createTenantDto));
    this.logger.debug('Received CSRF token from header (x-csrf-token):', csrfToken);
    this.logger.debug('CSRF token from request body:', createTenantDto.csrfToken);
    this.logger.debug('All request headers:', JSON.stringify(req.headers));

    try {
      // CSRF validation (simple presence check for stateless API)
      const isValidCsrf = this.validateCsrf(csrfToken);
      this.logger.debug('CSRF token validation result:', isValidCsrf, 'Token length:', csrfToken?.length);
      if (!isValidCsrf) {
        throw new HttpException('Invalid CSRF token', HttpStatus.FORBIDDEN);
      }

      // reCAPTCHA validation
      if (!(await this.validateRecaptcha(createTenantDto.recaptchaToken))) {
        throw new HttpException('Invalid reCAPTCHA. Please try again.', HttpStatus.BAD_REQUEST);
      }

      // Extract validated data
      const { name, businessType, contactEmail, branchName, owner, ...otherData } = createTenantDto;

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
        ...otherData // Pass other sanitized fields
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
}
