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
  UploadedFiles,
  Res,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TrialGuard } from '../auth/trial.guard';

declare global {
  namespace Express {
    interface Multer {
      File: Express.Multer.File;
    }
  }
}

@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
@Controller('products')
export class ProductController {
  // Use console.log for maximum visibility
  constructor(private readonly productService: ProductService) {}

  @Get()
  @Permissions('view_products')
  async findAll(@Req() req) {
    // Get selected branchId from user context or request header
    const branchId = req.headers['x-branch-id'] || req.user.branchId;
    return this.productService.findAllByTenantAndBranch(
      req.user.tenantId,
      branchId,
    );
  }

  @Post()
  @Permissions('create_products')
  async create(@Body() body, @Req() req) {
    // Priority for branchId: 1. From request body 2. From header 3. From user context
    const branchId =
      body.branchId || req.headers['x-branch-id'] || req.user.branchId;

    if (!branchId) {
      throw new Error('Branch ID is required to create a product');
    }

    return this.productService.createProduct(
      {
        ...body,
        tenantId: req.user.tenantId,
        branchId, // Use the resolved branchId
      },
      req.user.userId,
      req.ip,
    );
  }

  @Post('upload-images/:id')
  @Permissions('edit_products')
  @UseInterceptors(FilesInterceptor('images'))
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req,
  ) {
    return this.productService.uploadProductImages(
      id,
      files,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Delete('delete-image/:id')
  @Permissions('edit_products')
  async deleteImage(
    @Param('id') id: string,
    @Body() body: { imageUrl: string },
    @Req() req,
  ) {
    return this.productService.deleteProductImage(
      id,
      body.imageUrl,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Post('bulk-upload')
  @Permissions('create_products')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File, // Update type annotation
    @Req() req: Request,
  ) {
    // Extract branchId from header or user context
    const branchId = req.headers['x-branch-id'] || (req.user as any)?.branchId;
    // Pass branchId explicitly to service
    return this.productService.bulkUpload(file, {
      ...(req.user as any),
      branchId,
    });
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
    return this.productService.clearAll(
      (req.user! as { tenantId: string }).tenantId,
    );
  }

  @Get(':id/qr')
  async getQrCode(@Param('id') id: string, @Req() req, @Res() res: Response) {
    return this.productService.generateQrCode(id, req.user.tenantId, res);
  }

  @Put(':id')
  @Permissions('edit_products')
  async update(@Param('id') id: string, @Body() body, @Req() req) {
    return this.productService.updateProduct(
      id,
      body,
      req.user.tenantId,
      req.user.userId,
      req.ip,
    );
  }

  @Delete(':id')
  @Permissions('delete_products')
  async remove(@Param('id') id: string, @Req() req) {
    return this.productService.deleteProduct(
      id,
      req.user.tenantId,
      req.user.userId,
      req.ip,
    );
  }

  @Get('count')
  @Permissions('view_products')
  async getProductCount(@Req() req) {
    const branchId = req.headers['x-branch-id'] || req.user.branchId;
    const count = await this.productService.getProductCount(
      req.user.tenantId,
      branchId,
    );
    return { count };
  }
}
