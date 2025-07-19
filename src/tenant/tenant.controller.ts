import { Controller, Get, Put, Body, Req, UseGuards, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';

@UseGuards(AuthGuard('jwt'))
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('me')
  async getMyTenant(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.tenantService.getTenantById(tenantId);
  }

  @Put('me')
  async updateMyTenant(@Req() req, @Body() dto: any) {
    const tenantId = req.user.tenantId;
    return this.tenantService.updateTenant(tenantId, dto);
  }

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
}
