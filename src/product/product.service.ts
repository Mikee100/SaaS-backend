import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import { CacheService } from '../cache/cache.service';
import { Express, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuditLogService } from '../audit-log.service';
import * as qrcode from 'qrcode';
import { BillingService } from '../billing/billing.service';
import { SubscriptionService } from '../billing/subscription.service';
import { restoreProduct } from '../prisma/soft-delete-restore';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

@Injectable()
export class ProductService {

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private auditLogService: AuditLogService,
    private billingService: BillingService,
    private subscriptionService: SubscriptionService,
  ) {}

  async findAllByTenantAndBranch(
    tenantId: string,
    branchId?: string,
    page: number = 1,
    limit: number = 10,
    includeSupplier: boolean = false,
    search: string = '',
    includeVariations: boolean = false,
  ) {
    console.log('Backend: findAllByTenantAndBranch called with:', { tenantId, branchId, page, limit, includeVariations });

    // Check cache first
    const branchSuffix = branchId ? `_${branchId}` : '_all';
    const includeSuffix = includeSupplier ? '_with_supplier' : '';
    const variationsSuffix = includeVariations ? '_with_variations' : '';
    const searchSuffix = search ? `_${search.replace(/\s+/g, '_').toLowerCase()}` : '';
    const cacheKey = `products_list_${tenantId}_${branchSuffix}_${page}_${limit}${includeSuffix}${variationsSuffix}${searchSuffix}`;
    let cachedResult = this.cacheService.get(cacheKey);

    if (cachedResult) {
     
      return cachedResult;
    }

    const where: any = { tenantId };

    const conditions: any[] = [];

    if (search) {
      conditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    if (branchId) {
      conditions.push({
        OR: [
          { branchId: branchId },
          { branchId: null }
        ]
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    // Ensure valid pagination parameters
    if (page < 1) page = 1;
    if (limit < 1 || limit > 1000) limit = 100; // Increased max limit to 1000 and default to 100

    const skip = (page - 1) * limit;

    // Get total count for pagination metadata (with search filter)
    const total = await this.prisma.product.count({ where });
   
    // Select only necessary fields for list views (lazy loading)
    const select: any = {
      id: true,
      name: true,
      sku: true,
      price: true,
      stock: true,
      createdAt: true,
      updatedAt: true,
      images: true,
      customFields: true,
      hasVariations: true,
    };

    // Conditionally include supplier data only when needed
    if (includeSupplier) {
      select.supplier = {
        select: {
          id: true,
          name: true,
          contactName: true,
          email: true,
        },
      };
    }

    // Conditionally include variations when needed (e.g. for POS)
    if (includeVariations) {
      select.variations = {
        where: { isActive: true },
        select: {
          id: true,
          sku: true,
          price: true,
          stock: true,
          attributes: true,
        },
      };
    }

    const products = await this.prisma.product.findMany({
      where,
      select,
      orderBy: [
        { stock: 'desc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: limit,
    });

    console.log('Backend: Returning', products.length, 'products for search:', search);

    const result = {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };

    // Cache the result for 5 minutes (shorter for search results to keep them fresh)
    const cacheTime = search ? 60 : 300; // 1 minute for search results, 5 minutes for regular lists
    this.cacheService.set(cacheKey, result, cacheTime);

    return result;
  }



  async createProduct(data: any, actorUserId?: string, ip?: string) {
    const productData = {
      ...data,
      id: uuidv4(), // Generate a new UUID for the product
    };

    // Ensure stock is an integer
    if (productData.stock !== undefined) {
      productData.stock = parseInt(String(productData.stock), 10);
      if (isNaN(productData.stock)) {
        productData.stock = 0; // Default to 0 if parsing fails
      }
    }

    // Ensure price is a float, default to 0 if not provided or invalid
    if (
      productData.price !== undefined &&
      productData.price !== null &&
      productData.price !== ''
    ) {
      const parsedPrice = parseFloat(String(productData.price));
      productData.price = isNaN(parsedPrice) ? 0 : parsedPrice;
    } else {
      productData.price = 0; // Default price for simplified product creation
    }

    // Ensure cost is a float
    if (productData.cost !== undefined) {
      productData.cost = parseFloat(String(productData.cost));
    }

    // Handle customFieldValues - map to customFields
    if (data.customFieldValues) {
      productData.customFields = data.customFieldValues;
    }

    // Remove fields that don't exist in Prisma schema
    delete productData.manage_stock;
    delete productData.type;
    delete productData.category;
    delete productData.industry;
    delete productData.attributes;
    delete productData.variations;
    delete productData.hasVariations;
    delete productData.categoryId; // Remove categoryId as we handle it through the relation
    delete productData.customFieldValues; // Remove customFieldValues as we handle it through customFields

    // Remove branchId and tenantId from productData, as they should be set via relation connect
    delete productData.branchId;
    delete productData.tenantId;
    
    // Handle supplierId and supplier - remove them from productData, we'll handle supplier separately
    const supplierId = productData.supplierId;
    delete productData.supplierId;
    delete productData.supplier; // Remove supplier relation if it exists

    // Validate branch and tenant existence before create
    const branch = await this.prisma.branch.findUnique({
      where: { id: data.branchId },
    });
    if (!branch) {
      throw new BadRequestException(`Branch with id ${data.branchId} does not exist`);
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: data.tenantId },
    });
    if (!tenant) {
      throw new BadRequestException(`Tenant with id ${data.tenantId} does not exist`);
    }

    // Build create data - use spread but ensure supplier is not included
    const { supplier, ...cleanProductData } = productData;
    
    const createData: any = {
      ...cleanProductData,
      tenant: {
        connect: { id: data.tenantId },
      },
      branch: {
        connect: { id: data.branchId },
      },
    };

    // Only set supplierId directly (not as relation) if provided
    // This avoids Prisma trying to set the supplier relation when it's null
    if (supplierId && supplierId.trim() !== '') {
      createData.supplierId = supplierId;
    }
    // If supplierId is not provided, don't include it (Prisma will use null by default)

    const product = await this.prisma.product.create({
      data: createData,
    });

    // Invalidate cache for this tenant
    this.cacheService.invalidateProductCache(data.tenantId);

    // Only log if actorUserId is a valid user (not null/undefined/empty string)
    if (this.auditLogService && actorUserId) {
      await this.auditLogService.log(
        actorUserId,
        'product_created',
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
        },
        ip,
      );
    }
    return product;
  }

  async updateProduct(
    id: string,
    data: any,
    tenantId: string,
    actorUserId?: string,
    ip?: string,
  ) {
    // Separate standard and custom fields
    const {
      name,
      sku,
      price,
      description,
      stock,
      cost,
      supplier,
      ...customFields
    } = data;
    const updateData: any = {};

    // Handle supplier field - if supplier name is provided, find the supplier and set supplierId
    if (supplier !== undefined) {
      if (supplier && typeof supplier === 'string') {
        const supplierRecord = await (this.prisma as any).supplier.findFirst({
          where: {
            name: supplier,
            tenantId: tenantId,
          },
        });
        if (supplierRecord) {
          updateData.supplierId = supplierRecord.id;
        } else {
          updateData.supplierId = null; // Clear supplier if not found
        }
      } else {
        updateData.supplierId = null; // Clear supplier if empty
      }
    }

    if (name !== undefined) updateData.name = name;
    if (sku !== undefined) updateData.sku = String(sku);
    if (price !== undefined) updateData.price = parseFloat(price);
    if (description !== undefined) updateData.description = description;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (cost !== undefined) updateData.cost = parseFloat(cost);
    if (Object.keys(customFields).length > 0) {
      updateData.customFields = customFields;
    }

    const result = await this.prisma.product.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    // Invalidate cache for this tenant and product
    this.cacheService.invalidateProductCache(tenantId, id);

    if (this.auditLogService) {
      await this.auditLogService.log(
        actorUserId || null,
        'product_updated',
        { productId: id, updatedFields: data },
        ip,
      );
    }
    return result;
  }

  async deleteProduct(
    id: string,
    tenantId: string,
    actorUserId?: string,
    ip?: string,
  ) {
    const now = new Date();
    const result = await this.prisma.$transaction(async (prisma) => {
      await prisma.productVariation.updateMany({
        where: { productId: id, tenantId, deletedAt: null },
        data: { deletedAt: now },
      });

      const deleted = await prisma.product.updateMany({
        where: { id, tenantId, deletedAt: null },
        data: { deletedAt: now },
      });

      return deleted;
    });

    // Invalidate cache for this tenant and product
    this.cacheService.invalidateProductCache(tenantId, id);

    if (this.auditLogService) {
      await this.auditLogService.log(
        actorUserId || null,
        'product_deleted',
        { productId: id },
        ip,
      );
    }
    return result;
  }

  async getDeletedProducts(tenantId: string, branchId?: string) {
    if (branchId) {
      return this.prisma.$queryRaw`
        SELECT p.id, p.name, p.sku, p.price, p."deletedAt" FROM "Product" p
        WHERE p."tenantId" = ${tenantId} AND p."branchId" = ${branchId} AND p."deletedAt" IS NOT NULL
        ORDER BY p."deletedAt" DESC
        LIMIT 100
      ` as Promise<Array<{ id: string; name: string; sku: string; price: number; deletedAt: Date }>>;
    }
    return this.prisma.$queryRaw`
      SELECT p.id, p.name, p.sku, p.price, p."deletedAt" FROM "Product" p
      WHERE p."tenantId" = ${tenantId} AND p."deletedAt" IS NOT NULL
      ORDER BY p."deletedAt" DESC
      LIMIT 100
    ` as Promise<Array<{ id: string; name: string; sku: string; price: number; deletedAt: Date }>>;
  }

  async restoreProduct(id: string, tenantId: string, actorUserId?: string, ip?: string) {
    const result = await restoreProduct(this.prisma, id, tenantId);
    if (result.count === 0) {
      throw new NotFoundException('Product not found or not deleted');
    }
    this.cacheService.invalidateProductCache(tenantId, id);
    if (this.auditLogService) {
      await this.auditLogService.log(actorUserId || null, 'product_restored', { productId: id }, ip);
    }
    return { success: true, message: 'Product restored successfully' };
  }

  async getProductCount(tenantId: string, branchId?: string): Promise<number> {
    // Use cached count when no branch filter is applied
    if (!branchId) {
      return this.cacheService.getProductCount(tenantId);
    }

    // For branch-specific counts, query directly (less common)
    return this.prisma.product.count({
      where: {
        tenantId,
        ...(branchId && { branchId }),
      },
    });
  }

  async clearAll(tenantId: string) {
    const deleted = await this.prisma.product.updateMany({
      where: { tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return { deletedCount: deleted.count };
  }

  async randomizeAllStocks(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId },
    });
    for (const product of products) {
      const randomStock = Math.floor(Math.random() * 191) + 10; // 10-200
      await this.prisma.product.update({
        where: { id: product.id },
        data: { stock: randomStock },
      });
    }
    return { updated: products.length };
  }

  async generateQrCode(id: string, tenantId: string, res: Response) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // The QR code will simply contain the product ID
    const qrCodeDataUrl = await qrcode.toDataURL(product.id);

    // Send the QR code back as an image
    res.setHeader('Content-Type', 'image/png');
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
    const img = Buffer.from(base64Data, 'base64');
    res.send(img);
  }

  async uploadProductImages(
    productId: string,
    files: Express.Multer.File[],
    tenantId: string,
    userId: string,
  ) {
    // Validate product exists and belongs to tenant
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(
      process.cwd(),
      'uploads',
      'products',
      tenantId,
    );
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const imageUrls: string[] = [];

    for (const file of files) {
      // Basic validation
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('Only image files are allowed');
      }

      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        throw new BadRequestException('Image size must be less than 5MB');
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname) || '.jpg';
      const fileName = `${productId}_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExtension}`;
      const filePath = path.join(uploadsDir, fileName);

      try {
        // Optimize and save image using Sharp
        const optimizedBuffer = await sharp(file.buffer)
          .resize(1200, 1200, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();

        // Save optimized image
        fs.writeFileSync(filePath, optimizedBuffer);

        // Create URL for the image
        const imageUrl = `/uploads/products/${tenantId}/${fileName}`;
        imageUrls.push(imageUrl);
      } catch (error) {
        console.error('Error processing image:', error);
        throw new BadRequestException('Failed to process image');
      }
    }

    // Update product with new images
    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: {
        images: {
          push: imageUrls,
        },
      },
    });

    // Log the action
    if (this.auditLogService) {
      await this.auditLogService.log(
        userId,
        'product_images_uploaded',
        { productId, imageCount: imageUrls.length },
        undefined,
      );
    }

    return updatedProduct;
  }

  async deleteProductImage(
    productId: string,
    imageUrl: string,
    tenantId: string,
    userId: string,
  ) {
    // Validate product exists and belongs to tenant
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Remove image from product's images array
    const updatedImages = product.images.filter((img) => img !== imageUrl);

    // Delete physical file
    try {
      const fileName = path.basename(imageUrl);
      const filePath = path.join(
        process.cwd(),
        'uploads',
        'products',
        tenantId,
        fileName,
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error deleting image file:', error);
    }

    // Update product
    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: { images: updatedImages },
    });

    // Log the action
    if (this.auditLogService) {
      await this.auditLogService.log(
        userId,
        'product_image_deleted',
        { productId, imageUrl },
        undefined,
      );
    }

    return updatedProduct;
  }

  getImageUrl(imagePath: string): string {
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    // If it's a relative path starting with /uploads, return as is
    if (imagePath.startsWith('/uploads')) {
      return imagePath;
    }
    // Otherwise, construct the full URL (default to local dev backend)
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5100'}${imagePath}`;
  }

  async findOne(id: string, tenantId: string) {
    // Try cache first
    let product = await this.cacheService.getProductById(id, tenantId);

    if (!product) {
      product = await (this.prisma as any).product.findFirst({
        where: { id, tenantId },
        include: {
          supplier: true,
          branch: true,
          tenant: true,
        },
      });

      // Cache the result if found
      if (product) {
        await this.cacheService.getProductById(id, tenantId); // This will cache it
      }
    }

    return product;
  }

  // Variation CRUD methods
  async createVariation(data: {
    productId: string;
    sku: string;
    price?: number;
    cost?: number;
    stock: number;
    attributes: any;
    tenantId: string;
    branchId?: string;
  }) {
    return this.prisma.productVariation.create({
      data: {
        ...data,
        id: uuidv4(),
      },
    });
  }

  async getVariationsByProduct(productId: string, tenantId: string) {
    return this.prisma.productVariation.findMany({
      where: { productId, tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateVariation(
    id: string,
    data: Partial<{
      sku: string;
      price: number;
      cost: number;
      stock: number;
      attributes: any;
      isActive: boolean;
    }>,
    tenantId: string,
  ) {
    return this.prisma.productVariation.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async deleteVariation(id: string, tenantId: string) {
    return this.prisma.productVariation.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    });
  }

  // Helper method to generate variations from attributes (legacy - for backward compatibility)
  private generateVariationsFromAttributesLegacy(attributes: any[], baseProduct: any) {
    if (!attributes || attributes.length === 0) return [];

    // Create all possible combinations of attribute values
    const combinations = this.cartesianProduct(
      attributes.map((attr) => attr.values),
    );

    return combinations.map((combination, index) => {
      const attrsObj: Record<string, string> = {};
      attributes.forEach((attr, attrIndex) => {
        attrsObj[attr.name] = combination[attrIndex];
      });

      return {
        sku: `${baseProduct.sku}-${index + 1}`,
        price: baseProduct.price,
        cost: baseProduct.cost,
        stock: 0,
        attributes: attrsObj,
        tenantId: baseProduct.tenantId,
        branchId: baseProduct.branchId,
      };
    });
  }

  // Helper method for cartesian product
  private cartesianProduct(arrays: string[][]): string[][] {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    const restCombinations = this.cartesianProduct(rest);
    return first.flatMap((value) =>
      restCombinations.map((combination) => [value, ...combination]),
    );
  }

  // Helper method to check for circular references in category hierarchy
  private async isCircularReference(parentId: string, tenantId: string): Promise<boolean> {
    // This is a simple check; in a real-world scenario, you might need a more sophisticated algorithm
    // to traverse the entire hierarchy and detect cycles
    // For now, we'll just check if the parent is trying to set itself as a parent
    // A full implementation would recursively check ancestors
    return false; // Placeholder - implement proper cycle detection if needed
  }

  // Generate variations from attributes
  async generateVariationsFromAttributes(
    productId: string,
    tenantId: string,
    attributes: Array<{ attributeName: string; values: string[] }>,
    skuPrefix?: string,
    branchId?: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Generate all combinations using cartesian product
    const valueArrays = attributes.map((attr) => attr.values);
    const combinations = this.cartesianProduct(valueArrays);

    const variations: Array<{
      productId: string;
      sku: string;
      price: number;
      cost: number;
      stock: number;
      attributes: Record<string, string>;
      tenantId: string;
      branchId: string | null;
      isActive: boolean;
    }> = [];
    const baseSku = skuPrefix || product.sku;

    for (let i = 0; i < combinations.length; i++) {
      const combination = combinations[i];
      const attrsObj: Record<string, string> = {};

      // Build attributes object
      attributes.forEach((attr, idx) => {
        attrsObj[attr.attributeName] = combination[idx];
      });

      // Generate SKU: baseSKU-Color-Size or baseSKU-1, baseSKU-2, etc.
      const skuSuffix = combination.join('-').replace(/\s+/g, '');
      const sku = `${baseSku}-${skuSuffix}`;

      // Check if variation already exists
      const existing = await this.prisma.productVariation.findFirst({
        where: {
          productId,
          sku,
          tenantId,
        },
      });

      if (!existing) {
        variations.push({
          productId,
          sku,
          price: product.price,
          cost: product.cost,
          stock: 0,
          attributes: attrsObj,
          tenantId,
          branchId: branchId || product.branchId,
          isActive: true,
        });
      }
    }

    // Bulk create variations
    if (variations.length > 0) {
      await this.prisma.productVariation.createMany({
        data: variations.map((v) => ({
          id: uuidv4(),
          productId: v.productId,
          sku: v.sku,
          price: v.price,
          cost: v.cost,
          stock: v.stock,
          attributes: v.attributes,
          tenantId: v.tenantId,
          branchId: v.branchId,
          isActive: v.isActive,
        })),
      });

      // Update product to mark it as having variations
      await this.prisma.product.update({
        where: { id: productId },
        data: { hasVariations: true },
      });
    }

    return {
      productId,
      generated: variations.length,
      variations: await this.getVariationsByProduct(productId, tenantId),
    };
  }

  // Generate variations from custom fields (legacy method)
  async generateVariationsFromCustomFields(
    productId: string,
    tenantId: string,
    userId: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // This method can be used if customFields contains variation data
    // For now, return empty or use the new method
    return {
      productId,
      generated: 0,
      message: 'Use generateVariationsFromAttributes for better control',
    };
  }

  // Bulk update variation stock
  async bulkUpdateVariationStock(
    productId: string,
    tenantId: string,
    updates: Array<{ variationId: string; stock: number }>,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const results: any[] = [];

    for (const update of updates) {
      const variation = await this.prisma.productVariation.updateMany({
        where: {
          id: update.variationId,
          productId,
          tenantId,
        },
        data: { stock: update.stock },
      });
      results.push(variation);
    }

    // Update total product stock
    const totalStock = await this.prisma.productVariation.aggregate({
      where: { productId, tenantId, isActive: true },
      _sum: { stock: true },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: { stock: totalStock._sum.stock || 0 },
    });

    return results;
  }

  // Get variation by attributes
  async getVariationByAttributes(
    productId: string,
    tenantId: string,
    attributes: Record<string, string>,
  ) {
    const variations = await this.prisma.productVariation.findMany({
      where: {
        productId,
        tenantId,
        isActive: true,
      },
    });

    // Find variation matching all attributes
    for (const variation of variations) {
      const variationAttrs = variation.attributes as Record<string, string>;
      const matches = Object.keys(attributes).every(
        (key) => variationAttrs[key] === attributes[key],
      );

      if (matches) {
        return variation;
      }
    }

    return null;
  }

  
}
