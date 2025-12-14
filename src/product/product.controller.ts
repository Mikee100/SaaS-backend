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
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async findAll(@Req() req, @Query() query: { page?: string; limit?: string; includeSupplier?: string; search?: string; branchId?: string }) {
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException('User context is missing or invalid. Authentication required.');
    }
    // Get selected branchId from query param, header, or user context (in that order)
    const branchId = query.branchId || req.headers['x-branch-id'] || (req.user?.branchId);
    // Use tenant ID from JWT token
    const tenantId = req.user.tenantId;

    // Parse pagination parameters
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 100; // Increased default from 10 to 100 products per page
    const includeSupplier = query.includeSupplier === 'true';
    const search = query.search || '';

    const result = await this.productService.findAllByTenantAndBranch(
      tenantId,
      branchId,
      page,
      limit,
      includeSupplier,
      search,
    );

    return result;
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), TrialGuard)
  @Permissions('create_products')
  async create(@Body() body, @Req() req) {
    
    if (!req.user || !req.user.tenantId || !req.user.userId) {
      throw new BadRequestException('User context is missing or invalid. Authentication required.');
    }
    // Priority for branchId: 1. From request body 2. From header 3. From user context
    const branchId =
      body.branchId || req.headers['x-branch-id'] || req.user?.branchId;

    if (!branchId) {
      throw new BadRequestException('Branch ID is required to create a product');
    }

    // Use tenant ID from JWT token
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

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
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async getQrCode(@Param('id') id: string, @Req() req, @Res() res: Response) {
   
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException('User context is missing or invalid. Authentication required.');
    }
    return this.productService.generateQrCode(id, req.user.tenantId, res);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('edit_products')
  async update(@Param('id') id: string, @Body() body, @Req() req) {
    
    if (!req.user || !req.user.tenantId || !req.user.userId) {
      throw new BadRequestException('User context is missing or invalid. Authentication required.');
    }
    const tenantId = req.user.tenantId;
    return this.productService.updateProduct(
      id,
      body,
      tenantId,
      req.user.userId,
      req.ip,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('delete_products')
  async remove(@Param('id') id: string, @Req() req) {
    
    if (!req.user || !req.user.tenantId || !req.user.userId) {
      throw new BadRequestException('User context is missing or invalid. Authentication required.');
    }
    const tenantId = req.user.tenantId;
    return this.productService.deleteProduct(
      id,
      tenantId,
      req.user.userId,
      req.ip,
    );
  }

  @Get('count')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async getProductCount(@Req() req) {
  
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException('User context is missing or invalid. Authentication required.');
    }
    const branchId = req.headers['x-branch-id'] || req.user?.branchId;
    const tenantId = req.user.tenantId;
    const count = await this.productService.getProductCount(
      tenantId,
      branchId,
    );
    return { count };
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async findOne(@Param('id') id: string, @Req() req) {
    
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException('User context is missing or invalid. Authentication required.');
    }
    const tenantId = req.user.tenantId;
    return this.productService.findOne(id, tenantId);
  }

  @Get('welcome')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async welcome(@Req() req) {
   
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException('User context is missing or invalid. Authentication required.');
    }
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
      weight?: number;
      branchId?: string;
    },
    @Req() req,
  ) {
    
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException('User context is missing or invalid. Authentication required.');
    }
    const branchId =
      body.branchId || req.headers['x-branch-id'] || req.user?.branchId;
    return this.productService.createVariation({
      ...body,
      productId,
      tenantId: req.user.tenantId,
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
    @Req() req,
  ) {
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException('User context is missing or invalid. Authentication required.');
    }
    const branchId =
      body.branchId || req.headers['x-branch-id'] || req.user?.branchId;
    return this.productService.generateVariationsFromAttributes(
      productId,
      req.user.tenantId,
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
    @Req() req,
  ) {
    
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException('User context is missing or invalid. Authentication required.');
    }
    return this.productService.getVariationsByProduct(
      productId,
      req.user.tenantId,
    );
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
      attributes: any;
      isActive: boolean;
    }>,
    @Req() req,
  ) {
    console.log('[updateVariation] called', { id, body, user: req.user });
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException('User context is missing or invalid. Authentication required.');
    }
    return this.productService.updateVariation(id, body, req.user.tenantId);
  }

  @Delete('variations/:id')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('delete_products')
  async deleteVariation(@Param('id') id: string, @Req() req) {
    console.log('[deleteVariation] called', { id, user: req.user });
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException('User context is missing or invalid. Authentication required.');
    }
    return this.productService.deleteVariation(id, req.user.tenantId);
  }

  // Generate variations from custom fields (legacy method)
  @Post(':id/generate-variations-legacy')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('edit_products')
  async generateVariationsLegacy(@Param('id') id: string, @Req() req) {
    console.log('[generateVariationsLegacy] called', { id, user: req.user });
    if (!req.user || !req.user.tenantId || !req.user.userId) {
      throw new BadRequestException('User context is missing or invalid. Authentication required.');
    }
    return this.productService.generateVariationsFromCustomFields(
      id,
      req.user.tenantId,
      req.user.userId,
    );
  }
}
