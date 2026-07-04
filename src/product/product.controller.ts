import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Permissions } from '../auth/permissions.decorator';
import { TrialGuard } from '../auth/trial.guard';
import { RequireModules } from '../auth/module-access.decorator';
import { AuthenticatedRequest } from '../auth/request.types';

@RequireModules('inventory')
@Controller('products')
export class ProductController {
  // Use console.log for maximum visibility
  constructor(private readonly productService: ProductService) {}

  private getTenantId(req: AuthenticatedRequest): string {
    if (!req.user?.tenantId) {
      throw new BadRequestException(
        'User context is missing or invalid. Authentication required.',
      );
    }
    return req.user.tenantId;
  }

  private getUserId(req: AuthenticatedRequest): string {
    if (!req.user?.userId) {
      throw new BadRequestException(
        'User context is missing or invalid. Authentication required.',
      );
    }
    return req.user.userId;
  }

  private getHeaderBranchId(req: AuthenticatedRequest): string | undefined {
    const headerValue = req.headers['x-branch-id'];
    return typeof headerValue === 'string' && headerValue.trim()
      ? headerValue.trim()
      : undefined;
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query()
    query: {
      page?: string;
      limit?: string;
      includeSupplier?: string;
      includeVariations?: string;
      search?: string;
      branchId?: string;
    },
  ) {
    const tenantId = this.getTenantId(req);
    // Get selected branchId from query param, header, or user context (in that order)
    const branchId =
      query.branchId || this.getHeaderBranchId(req) || req.user?.branchId;

    // Parse pagination parameters
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 100; // Increased default from 10 to 100 products per page
    const includeSupplier = query.includeSupplier === 'true';
    const includeVariations = query.includeVariations === 'true';
    const search = query.search || '';

    const result = await this.productService.findAllByTenantAndBranch(
      tenantId,
      branchId,
      page,
      limit,
      includeSupplier,
      search,
      includeVariations,
    );

    return result;
  }

  @Get('deleted')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async findDeleted(
    @Req() req: AuthenticatedRequest,
    @Query() query: { branchId?: string },
  ) {
    const tenantId = this.getTenantId(req);
    const branchId =
      query.branchId || this.getHeaderBranchId(req) || req.user?.branchId;
    return this.productService.getDeletedProducts(tenantId, branchId);
  }

  @Get('categories')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async listCategories(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    return this.productService.listProductCategories(tenantId);
  }

  @Post('categories')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('edit_products')
  async createCategory(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name?: string },
  ) {
    const tenantId = this.getTenantId(req);
    return this.productService.createProductCategory(
      tenantId,
      String(body?.name || ''),
    );
  }

  @Put('categories/:id')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('edit_products')
  async updateCategory(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { name?: string },
  ) {
    const tenantId = this.getTenantId(req);
    return this.productService.updateProductCategory(
      tenantId,
      id,
      String(body?.name || ''),
    );
  }

  @Delete('categories/:id')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('edit_products')
  async deleteCategory(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.productService.deleteProductCategory(tenantId, id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  @Permissions('create_products')
  async create(
    @Body() body: Record<string, unknown>,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    // Priority for branchId: 1. From request body 2. From header 3. From user context
    const bodyBranchId =
      typeof body.branchId === 'string' ? body.branchId.trim() : undefined;
    const headerBranchId = this.getHeaderBranchId(req);
    const userBranchId =
      typeof req.user?.branchId === 'string'
        ? req.user.branchId.trim()
        : undefined;

    if (bodyBranchId && headerBranchId && bodyBranchId !== headerBranchId) {
      throw new BadRequestException(
        'branchId in request body does not match x-branch-id header',
      );
    }

    const branchId = bodyBranchId || headerBranchId || userBranchId;

    if (!branchId) {
      throw new BadRequestException(
        'Branch ID is required to create a product',
      );
    }

    // Use tenant ID from JWT token
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

  @Post('upload-images/:id')
  @Permissions('edit_products')
  @UseInterceptors(FilesInterceptor('images'))
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    return this.productService.uploadProductImages(id, files, tenantId, userId);
  }

  @Delete('delete-image/:id')
  @Permissions('edit_products')
  async deleteImage(
    @Param('id') id: string,
    @Body() body: { imageUrl: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    return this.productService.deleteProductImage(
      id,
      body.imageUrl,
      tenantId,
      userId,
    );
  }

  @Post('randomize-stocks')
  @Permissions('edit_products')
  async randomizeStocks(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    return this.productService.randomizeAllStocks(tenantId);
  }

  @Delete('clear-all')
  @Permissions('delete_products')
  async clearAll(@Req() req: AuthenticatedRequest) {
    // Only allow for current tenant
    return this.productService.clearAll(this.getTenantId(req));
  }

  @Get(':id/qr')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async getQrCode(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const tenantId = this.getTenantId(req);
    return this.productService.generateQrCode(id, tenantId, res);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('edit_products')
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    const bodyBranchId =
      typeof body.branchId === 'string' ? body.branchId.trim() : undefined;
    const headerBranchId = this.getHeaderBranchId(req);
    const userBranchId =
      typeof req.user?.branchId === 'string'
        ? req.user.branchId.trim()
        : undefined;

    if (bodyBranchId && headerBranchId && bodyBranchId !== headerBranchId) {
      throw new BadRequestException(
        'branchId in request body does not match x-branch-id header',
      );
    }

    const branchId = bodyBranchId || headerBranchId || userBranchId;
    if (!branchId) {
      throw new BadRequestException(
        'Branch ID is required to update a product',
      );
    }

    return this.productService.updateProduct(
      id,
      body,
      tenantId,
      branchId,
      userId,
      req.ip,
    );
  }

  @Post(':id/restore')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('edit_products')
  async restore(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    return this.productService.restoreProduct(
      id,
      tenantId,
      req.user.userId,
      req.ip,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('delete_products')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    const headerBranchId = this.getHeaderBranchId(req);
    const userBranchId =
      typeof req.user?.branchId === 'string'
        ? req.user.branchId.trim()
        : undefined;
    const branchId = headerBranchId || userBranchId;

    if (!branchId) {
      throw new BadRequestException(
        'Branch ID is required to delete a product',
      );
    }

    return this.productService.deleteProduct(
      id,
      tenantId,
      branchId,
      userId,
      req.ip,
    );
  }

  @Get('count')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async getProductCount(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const branchId = this.getHeaderBranchId(req) || req.user?.branchId;
    const count = await this.productService.getProductCount(tenantId, branchId);
    return { count };
  }

  @Get('scan/:barcode')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async scanByBarcode(
    @Param('barcode') barcode: string,
    @Req() req: AuthenticatedRequest,
    @Query() query: { branchId?: string },
  ) {
    const tenantId = this.getTenantId(req);
    const branchId =
      query.branchId || this.getHeaderBranchId(req) || req.user?.branchId;

    return this.productService.findVariationByBarcode(
      barcode,
      tenantId,
      branchId,
    );
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    return this.productService.findOne(id, tenantId);
  }

  @Get('welcome')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  welcome(@Req() req: AuthenticatedRequest) {
    this.getTenantId(req);
    return { message: 'Welcome to the Product API Service!' };
  }

  // Variation endpoints
  @Post(':productId/variations')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('create_products')
  async createVariation(
    @Param('productId') productId: string,
    @Body()
    body: {
      sku: string;
      price?: number;
      cost?: number;
      stock: number;
      attributes: Record<string, string>;
      barcode?: string;
      alternateBarcodes?: string[];
      weight?: number;
      branchId?: string;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const branchId =
      body.branchId || this.getHeaderBranchId(req) || req.user?.branchId;
    return this.productService.createVariation({
      ...body,
      productId,
      tenantId,
      branchId,
    });
  }

  @Post(':productId/generate-variations')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('create_products')
  async generateVariations(
    @Param('productId') productId: string,
    @Body()
    body: {
      attributes: Array<{ attributeName: string; values: string[] }>;
      skuPrefix?: string;
      branchId?: string;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const branchId =
      body.branchId || this.getHeaderBranchId(req) || req.user?.branchId;
    return this.productService.generateVariationsFromAttributes(
      productId,
      tenantId,
      body.attributes,
      body.skuPrefix,
      branchId,
    );
  }

  @Get(':productId/variations')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async getVariationsByProduct(
    @Param('productId') productId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.productService.getVariationsByProduct(productId, tenantId);
  }

  @Put('variations/:id')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('edit_products')
  async updateVariation(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      sku: string;
      price: number;
      cost: number;
      stock: number;
      attributes: Record<string, string>;
      barcode: string;
      alternateBarcodes: string[];
      isActive: boolean;
      images: string[];
    }>,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.productService.updateVariation(id, body, tenantId);
  }

  @Post('variations/:id/upload-images')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('edit_products')
  @UseInterceptors(FilesInterceptor('images'))
  async uploadVariationImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);

    return this.productService.uploadVariationImages(
      id,
      files,
      tenantId,
      userId,
    );
  }

  @Delete('variations/:id/delete-image')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('edit_products')
  async deleteVariationImage(
    @Param('id') id: string,
    @Body() body: { imageUrl: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);

    return this.productService.deleteVariationImage(
      id,
      body.imageUrl,
      tenantId,
      userId,
    );
  }

  @Delete('variations/:id')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('delete_products')
  async deleteVariation(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.productService.deleteVariation(id, tenantId);
  }

  // Generate variations from custom fields (legacy method)
  @Post(':id/generate-variations-legacy')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('edit_products')
  async generateVariationsLegacy(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    return this.productService.generateVariationsFromCustomFields(
      id,
      tenantId,
      userId,
    );
  }
}
