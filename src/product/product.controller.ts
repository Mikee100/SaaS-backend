import { Controller, Get, Post, Put, Delete, Param, Body, Req, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { ProductService } from './product.service';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @Permissions('view_products')
  async findAll(@Req() req) {
    // Assuming req.user.tenantId is set by your JWT strategy
    return this.productService.findAllByTenant(req.user.tenantId);
  }

  @Post()
  @Permissions('create_products')
  async create(@Body() body, @Req() req) {
    // Attach tenantId from the authenticated user
    return this.productService.createProduct({
      ...body,
      tenantId: req.user.tenantId,
    }, req.user.userId, req.ip);
  }

  @Post('bulk-upload')
  @Permissions('create_products')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request
  ) {
    // Assume vendor info is in req.user (from auth middleware)
    return this.productService.bulkUpload(file, req.user);
  }

  @Get('bulk-upload-progress/:uploadId')
  async getBulkUploadProgress(@Param('uploadId') uploadId: string) {
    return ProductService.getBulkUploadProgress(uploadId);
  }

  @Post('randomize-stocks')
  @Permissions('edit_products')
  async randomizeStocks(@Req() req) {
    return this.productService.randomizeAllStocks(req.user.tenantId);
  }

  @Delete('clear-all')
  @Permissions('delete_products')
  async clearAll(@Req() req: Request) {
    // Only allow for current tenant
    return this.productService.clearAll((req.user! as { tenantId: string }).tenantId);
  }

  @Get(':id/qr')
  async getQrCode(@Param('id') id: string, @Req() req, @Res() res: Response) {
    return this.productService.generateQrCode(id, req.user.tenantId, res);
  }

  @Put(':id')
  @Permissions('edit_products')
  async update(@Param('id') id: string, @Body() body, @Req() req) {
    return this.productService.updateProduct(id, body, req.user.tenantId, req.user.userId, req.ip);
  }

  @Delete(':id')
  @Permissions('delete_products')
  async remove(@Param('id') id: string, @Req() req) {
    return this.productService.deleteProduct(id, req.user.tenantId, req.user.userId, req.ip);
  }
}
