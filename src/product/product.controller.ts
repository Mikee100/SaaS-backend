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
  BadRequestException,
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

@Controller('products')
export class ProductController {
  // Use console.log for maximum visibility
  constructor(private readonly productService: ProductService) {}

  @Get()
  // @Permissions('view_products')
  async findAll(@Req() req) {
    // Get selected branchId from user context or request header
    const branchId = req.headers['x-branch-id'] || (req.user?.branchId);
    // Use tenant ID from JWT token
    const tenantId = req.user?.tenantId || '038fe688-49b2-434f-86dd-ca14378868df';
    const result = await this.productService.findAllByTenantAndBranch(
      tenantId,
      branchId,
    );

    return result;
  }

  @Post()
  // @Permissions('create_products') // Temporarily disabled for testing
  // @UseGuards(AuthGuard('jwt'), TrialGuard) // Temporarily disabled for testing
  async create(@Body() body, @Req() req) {
    // Priority for branchId: 1. From request body 2. From header 3. From user context
    const branchId =
      body.branchId || req.headers['x-branch-id'] || req.user?.branchId;

    if (!branchId) {
      throw new Error('Branch ID is required to create a product');
    }

    // Use hardcoded tenant and branch IDs for now
    const tenantId = '40b41d29-e483-4bb5-bc68-853eec8118bc';
    const userId = 'temp-user-id';

    return this.productService.createProduct(
      {
        ...body,
        tenantId: tenantId,
        branchId, // Use the resolved branchId
      },
      userId,
      req.ip,
    );
  }

  @Post('categories')
  // @Permissions('create_products') // Temporarily disabled for testing
  async createCategory(@Body() body, @Req() req) {
    const branchId =
      body.branchId || req.headers['x-branch-id'] || req.user.branchId;

    if (!branchId) {
      throw new Error('Branch ID is required to create a category');
    }

    console.log('🚀 Backend: createCategory called with:', {
      name: body.name,
      tenantId: req.user.tenantId,
      branchId,
      customFields: body.customFields,
    });

    return this.productService.createCategory(
      {
        name: body.name,
        description: body.description,
        customFields: body.customFields,
        tenantId: req.user.tenantId,
        branchId,
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
  // @Permissions('edit_products')
  async update(@Param('id') id: string, @Body() body, @Req() req) {
    const tenantId = req.user?.tenantId || '038fe688-49b2-434f-86dd-ca14378868df';
    return this.productService.updateProduct(
      id,
      body,
      tenantId,
      req.user?.userId,
      req.ip,
    );
  }

  @Delete(':id')
  // @Permissions('delete_products')
  async remove(@Param('id') id: string, @Req() req) {
    const tenantId = req.user?.tenantId || '038fe688-49b2-434f-86dd-ca14378868df';
    return this.productService.deleteProduct(
      id,
      tenantId,
      req.user?.userId,
      req.ip,
    );
  }

  @Get('count')
  // @Permissions('view_products')
  async getProductCount(@Req() req) {
    const branchId = req.headers['x-branch-id'] || req.user?.branchId;
    const tenantId = req.user?.tenantId || '038fe688-49b2-434f-86dd-ca14378868df';
    const count = await this.productService.getProductCount(
      tenantId,
      branchId,
    );
    return { count };
  }

  @Get(':id')
  // @Permissions('view_products')
  async findOne(@Param('id') id: string, @Req() req) {
    const tenantId = req.user?.tenantId || '038fe688-49b2-434f-86dd-ca14378868df';
    return this.productService.findOne(id, tenantId);
  }

  @Get('welcome')
  @Permissions('view_products')
  async welcome(@Req() req) {
    console.log('------------------------------');
    console.log(`Request received: ${req.method} ${req.path}`);
    console.log('------------------------------');
    return { message: 'Welcome to the Product API Service!' };
  }

  @Get('categories')
  async getCategories(@Req() req) {
    console.log('🚀 Backend: getCategories called - no auth required');
    console.log('🚀 Backend: Request headers:', req.headers);
    console.log('🚀 Backend: Request method:', req.method, 'path:', req.path);

    const result = await this.productService.getCategories(null, null);
    console.log(
      '🚀 Backend: getCategories returning:',
      result.length,
      'categories',
    );
    console.log(
      '🚀 Backend: Categories data:',
      JSON.stringify(result, null, 2),
    );
    return result;
  }

  @Get('categories/count')
  @Permissions('view_products')
  async getCategoriesWithCount(@Req() req) {
    return this.productService.getCategoriesWithCount(req.user.tenantId);
  }

  @Put('categories/:id')
  @Permissions('edit_products')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
    @Req() req,
  ) {
    return this.productService.updateCategory(id, body, req.user.tenantId);
  }

  @Delete('categories/:id')
  @Permissions('delete_products')
  async deleteCategory(@Param('id') id: string, @Req() req) {
    return this.productService.deleteCategory(id, req.user.tenantId);
  }

  // Attribute endpoints
  @Post('attributes')
  @Permissions('create_products')
  async createAttribute(
    @Body()
    body: {
      name: string;
      type: string;
      values?: string[];
      required?: boolean;
      categoryId: string;
    },
    @Req() req,
  ) {
    return this.productService.createAttribute({
      ...body,
      tenantId: req.user.tenantId,
    });
  }

  @Get('attributes/:categoryId')
  @Permissions('view_products')
  async getAttributesByCategory(
    @Param('categoryId') categoryId: string,
    @Req() req,
  ) {
    return this.productService.getAttributesByCategory(
      categoryId,
      req.user.tenantId,
    );
  }

  @Put('attributes/:id')
  @Permissions('edit_products')
  async updateAttribute(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      type: string;
      values: string[];
      required: boolean;
    }>,
    @Req() req,
  ) {
    return this.productService.updateAttribute(id, body, req.user.tenantId);
  }

  @Delete('attributes/:id')
  @Permissions('delete_products')
  async deleteAttribute(@Param('id') id: string, @Req() req) {
    return this.productService.deleteAttribute(id, req.user.tenantId);
  }

  // Variation endpoints
  @Post(':productId/variations')
  @Permissions('create_products')
  async createVariation(
    @Param('productId') productId: string,
    @Body()
    body: {
      sku: string;
      price?: number;
      cost?: number;
      stock: number;
      attributes: any;
      branchId?: string;
    },
    @Req() req,
  ) {
    const branchId =
      body.branchId || req.headers['x-branch-id'] || req.user.branchId;
    return this.productService.createVariation({
      ...body,
      productId,
      tenantId: req.user.tenantId,
      branchId,
    });
  }

  @Get(':productId/variations')
  @Permissions('view_products')
  async getVariationsByProduct(
    @Param('productId') productId: string,
    @Req() req,
  ) {
    return this.productService.getVariationsByProduct(
      productId,
      req.user.tenantId,
    );
  }

  @Put('variations/:id')
  @Permissions('edit_products')
  async updateVariation(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      sku: string;
      price: number;
      cost: number;
      stock: number;
      attributes: any;
      isActive: boolean;
    }>,
    @Req() req,
  ) {
    return this.productService.updateVariation(id, body, req.user.tenantId);
  }

  @Delete('variations/:id')
  @Permissions('delete_products')
  async deleteVariation(@Param('id') id: string, @Req() req) {
    return this.productService.deleteVariation(id, req.user.tenantId);
  }

  // Generate variations from custom fields
  @Post(':id/generate-variations')
  @Permissions('edit_products')
  async generateVariations(@Param('id') id: string, @Req() req) {
    return this.productService.generateVariationsFromCustomFields(
      id,
      req.user.tenantId,
      req.user.userId,
    );
  }
}
