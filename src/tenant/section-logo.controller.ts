import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import {
  SectionLogoService,
  SectionLogo,
  SectionLogoConfig,
} from './section-logo.service';
import { TrialGuard } from '../auth/trial.guard';
import { AuthenticatedRequest } from '../auth/request.types';

interface UploadLogoBody {
  width?: string;
  height?: string;
  altText?: string;
}

const toOptionalInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

@Controller('api/tenant/section-logos')
@UseGuards(AuthGuard('jwt'), TrialGuard)
export class SectionLogoController {
  constructor(private readonly sectionLogoService: SectionLogoService) {}

  @Get()
  async getAllSectionLogos(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant is required');
    }
    return this.sectionLogoService.getAllSectionLogos(tenantId);
  }

  @Get(':section')
  async getSectionLogo(
    @Req() req: AuthenticatedRequest,
    @Param('section') section: string,
  ): Promise<{ sectionLogos: Record<string, SectionLogo> }> {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant is required');
    }
    let logo = await this.sectionLogoService.getSectionLogo(tenantId, section);
    if (!logo || !logo.url) {
      logo = {
        url: '/uploads/section-logos/default-logo.png',
        altText: `${section} logo`,
        width: 120,
        height: 120,
      };
    }
    return { sectionLogos: { [section]: logo } };
  }

  @Post('upload/:section')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/section-logos',
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const request = req as AuthenticatedRequest;
          const tenantId = request.user.tenantId || 'unknown-tenant';
          const name = `${tenantId}_${request.params.section}${ext}`;
          cb(null, name);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/svg+xml',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new Error('Only image files (JPEG, PNG, SVG) are allowed!'),
            false,
          );
        }
        if (file.size > 2 * 1024 * 1024) {
          return cb(new Error('File size must be less than 2MB!'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    }),
  )
  async uploadSectionLogo(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
    @Param('section') section: string,
    @Body() body: UploadLogoBody,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const logoUrl = `/uploads/section-logos/${file.filename}`;
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant is required');
    }

    // Update the section logo configuration
    const config: Partial<SectionLogo> = {
      url: logoUrl,
      width: toOptionalInt(body.width),
      height: toOptionalInt(body.height),
      altText: body.altText,
    };

    return this.sectionLogoService.updateSectionLogo(tenantId, section, config);
  }

  @Put(':section')
  async updateSectionLogoConfig(
    @Req() req: AuthenticatedRequest,
    @Param('section') section: string,
    @Body() config: Partial<SectionLogoConfig>,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant is required');
    }
    return this.sectionLogoService.updateSectionLogoConfig(
      tenantId,
      section,
      config,
    );
  }

  @Delete(':section')
  async removeSectionLogo(
    @Req() req: AuthenticatedRequest,
    @Param('section') section: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant is required');
    }
    const success = await this.sectionLogoService.removeSectionLogo(
      tenantId,
      section,
    );
    return { success };
  }

  @Get('config/validation')
  async validateSectionLogoConfig(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant is required');
    }
    return this.sectionLogoService.validateSectionLogoConfig(tenantId);
  }
}
