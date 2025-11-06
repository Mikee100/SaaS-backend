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
    console.log('[findAll] called', { user: req.user, headers: req.headers });
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

  @Get('category/:categoryId')
  // @Permissions('view_products')
  async findAllByCategory(@Param('categoryId') categoryId: string, @Req() req) {
    console.log('[findAllByCategory] called', { categoryId, user: req.user, headers: req.headers });
    // Get selected branchId from user context or request header
    const branchId = req.headers['x-branch-id'] || (req.user?.branchId);
    // Use tenant ID from JWT token
    const tenantId = req.user?.tenantId || '038fe688-49b2-434f-86dd-ca14378868df';
    const result = await this.productService.findAllByCategory(
      categoryId,
      tenantId,
      branchId,
    );

    return result;
  }

  @Post()
  // @Permissions('create_products') // Temporarily disabled for testing
  // @UseGuards(AuthGuard('jwt'), TrialGuard) // Temporarily disabled for testing
  async create(@Body() body, @Req() req) {
    console.log('[create] called', { body, user: req.user, headers: req.headers });
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

  // Category endpoints moved to CategoryController

  @Post('upload-images/:id')
  @Permissions('edit_products')
  @UseInterceptors(FilesInterceptor('images'))
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req,
  ) {
    console.log('[uploadImages] called', { id, files, user: req.user });
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
    console.log('[deleteImage] called', { id, imageUrl: body.imageUrl, user: req.user });
    return this.productService.deleteProductImage(
      id,
      body.imageUrl,
      req.user.tenantId,
      req.user.userId,
    );
  }

@Post('bulk-upload')
@Permissions('create_products')
@UseGuards(AuthGuard('jwt'))
@UseInterceptors(FileInterceptor('file'))
async bulkUpload(
  @UploadedFile() file: Express.Multer.File,
  @Req() req: Request,
) {
  if (!req.user) {
    throw new BadRequestException('User context is missing. Authentication required.');
  }
  // Use optional chaining and fallback values
  const user = {
    id: (req.user as any)?.userId || (req.user as any)?.id || '', // fallback to id or empty string
    tenantId: (req.user as any)?.tenantId || '',
    branchId: (req.user as any)?.branchId || '',
    ip: req.ip,
  };
  return this.productService.bulkUpload(file, user);
}


  @Post('randomize-stocks')
  @Permissions('edit_products')
  async randomizeStocks(@Req() req) {
    console.log('[randomizeStocks] called', { user: req.user });
    return this.productService.randomizeAllStocks(req.user.tenantId);
  }

  @Delete('clear-all')
  @Permissions('delete_products')
  async clearAll(@Req() req: Request) {
    console.log('[clearAll] called', { user: req.user });
    // Only allow for current tenant
    return this.productService.clearAll(
      (req.user! as { tenantId: string }).tenantId,
    );
  }

  @Get(':id/qr')
  async getQrCode(@Param('id') id: string, @Req() req, @Res() res: Response) {
    console.log('[getQrCode] called', { id, user: req.user });
    return this.productService.generateQrCode(id, req.user.tenantId, res);
  }

  @Put(':id')
  // @Permissions('edit_products')
  async update(@Param('id') id: string, @Body() body, @Req() req) {
    console.log('[update] called', { id, body, user: req.user });
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
    console.log('[remove] called', { id, user: req.user });
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
    console.log('[getProductCount] called', { user: req.user, headers: req.headers });
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
    console.log('[findOne] called', { id, user: req.user });
    const tenantId = req.user?.tenantId || '038fe688-49b2-434f-86dd-ca14378868df';
    return this.productService.findOne(id, tenantId);
  }

  @Get('welcome')
  @Permissions('view_products')
  async welcome(@Req() req) {
    console.log('[welcome] called', { user: req.user });
    return { message: 'Welcome to the Product API Service!' };
  }

  // Category endpoints moved to CategoryController

  // Attribute endpoints moved to CategoryController

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
    console.log('[createVariation] called', { productId, body, user: req.user });
    const branchId =
      body.branchId || req.headers['x-branch-id'] || req.user?.branchId;
    return this.productService.createVariation({
      ...body,
      productId,
      tenantId: req.user?.tenantId,
      branchId,
    });
  }

  @Get(':productId/variations')
  @Permissions('view_products')
  async getVariationsByProduct(
    @Param('productId') productId: string,
    @Req() req,
  ) {
    console.log('[getVariationsByProduct] called', { productId, user: req.user });
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
    console.log('[updateVariation] called', { id, body, user: req.user });
    return this.productService.updateVariation(id, body, req.user.tenantId);
  }

  @Delete('variations/:id')
  @Permissions('delete_products')
  async deleteVariation(@Param('id') id: string, @Req() req) {
    console.log('[deleteVariation] called', { id, user: req.user });
    return this.productService.deleteVariation(id, req.user.tenantId);
  }

  // Generate variations from custom fields
  @Post(':id/generate-variations')
  @Permissions('edit_products')
  async generateVariations(@Param('id') id: string, @Req() req) {
    console.log('[generateVariations] called', { id, user: req.user });
    return this.productService.generateVariationsFromCustomFields(
      id,
      req.user.tenantId,
      req.user.userId,
    );
  }
}
