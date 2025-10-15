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
import { Request } from 'express';
import { TrialGuard } from '../auth/trial.guard';

// Define the user type that will be attached to the request
interface UserPayload {
  id: string;
  tenantId: string;
  // Add other user properties as needed
}

// Extend the Express Request type to include our user
interface RequestWithUser extends Request {
  user: UserPayload;
}

@Controller('api/tenant/section-logos')
@UseGuards(AuthGuard('jwt'), TrialGuard)
export class SectionLogoController {
  constructor(private readonly sectionLogoService: SectionLogoService) {}

  @Get()
  async getAllSectionLogos(@Req() req: RequestWithUser) {
    const tenantId = req.user.tenantId;
    return this.sectionLogoService.getAllSectionLogos(tenantId);
  }

  @Get(':section')
  async getSectionLogo(
    @Req() req: RequestWithUser,
    @Param('section') section: string,
  ): Promise<any> {
    const tenantId = req.user.tenantId;
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
        filename: (req: RequestWithUser, file, cb) => {
          const ext = path.extname(file.originalname);
          const name = `${req.user.tenantId}_${req.params.section}${ext}`;
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
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
    @Param('section') section: string,
    @Body() body: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const logoUrl = `/uploads/section-logos/${file.filename}`;
    const tenantId = req.user.tenantId;

    // Update the section logo configuration
    const config: Partial<SectionLogo> = {
      url: logoUrl,
      width: body.width ? parseInt(body.width, 10) : undefined,
      height: body.height ? parseInt(body.height, 10) : undefined,
      altText: body.altText,
    };

    return this.sectionLogoService.updateSectionLogo(tenantId, section, config);
  }

  @Put(':section')
  async updateSectionLogoConfig(
    @Req() req: RequestWithUser,
    @Param('section') section: string,
    @Body() config: Partial<SectionLogoConfig>,
  ) {
    const tenantId = req.user.tenantId;
    return this.sectionLogoService.updateSectionLogoConfig(
      tenantId,
      section,
      config,
    );
  }

  @Delete(':section')
  async removeSectionLogo(
    @Req() req: RequestWithUser,
    @Param('section') section: string,
  ) {
    const tenantId = req.user.tenantId;
    const success = await this.sectionLogoService.removeSectionLogo(
      tenantId,
      section,
    );
    return { success };
  }

  @Get('config/validation')
  async validateSectionLogoConfig(@Req() req: RequestWithUser) {
    const tenantId = req.user.tenantId;
    return this.sectionLogoService.validateSectionLogoConfig(tenantId);
  }
}
