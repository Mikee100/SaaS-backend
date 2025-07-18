import { Controller, Get, Post, Put, Delete, Param, Body, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ProductService } from './product.service';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async findAll(@Req() req) {
    // Assuming req.user.tenantId is set by your JWT strategy
    return this.productService.findAllByTenant(req.user.tenantId);
  }

  @Post()
  async create(@Body() body, @Req() req) {
    // Attach tenantId from the authenticated user
    return this.productService.createProduct({
      ...body,
      tenantId: req.user.tenantId,
    });
  }

  @Post('bulk-upload')
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
  @Roles('owner', 'manager')
  async randomizeStocks(@Req() req) {
    return this.productService.randomizeAllStocks(req.user.tenantId);
  }

  @Delete('clear-all')
  async clearAll(@Req() req: Request) {
    // Only allow for current tenant
    return this.productService.clearAll((req.user! as { tenantId: string }).tenantId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body, @Req() req) {
    return this.productService.updateProduct(id, body, req.user.tenantId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    return this.productService.deleteProduct(id, req.user.tenantId);
  }
}
