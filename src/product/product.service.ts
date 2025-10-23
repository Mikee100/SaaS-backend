import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as XLSX from 'xlsx';
import { Express, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuditLogService } from '../audit-log.service';
import * as qrcode from 'qrcode';
import { BillingService } from '../billing/billing.service';
import { SubscriptionService } from '../billing/subscription.service';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

// In-memory progress store (for demo; use Redis for production)
const bulkUploadProgress: Record<string, { processed: number; total: number }> =
  {};

function findColumnMatch(
  headers: string[],
  candidates: string[],
): string | undefined {
  // Try exact, case-insensitive, and partial matches
  for (const candidate of candidates) {
    // Exact match (case-insensitive)
    const exact = headers.find(
      (h) => h.toLowerCase() === candidate.toLowerCase(),
    );
    if (exact) return exact;
    // Partial match (case-insensitive)
    const partial = headers.find((h) =>
      h.toLowerCase().includes(candidate.toLowerCase()),
    );
    if (partial) return partial;
  }
  return undefined;
}

@Injectable()
export class ProductService {
  // Use console.log for maximum visibility
  async findAllByBranch(branchId: string, tenantId: string) {
    console.log('------------------------------');
    console.log(
      '[ProductService] Filtering products by branchId:',
      branchId,
      'tenantId:',
      tenantId,
    );
    console.log('------------------------------');
    return (this.prisma as any).product.findMany({
      where: { branchId, tenantId },
      include: {
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private billingService: BillingService,
    private subscriptionService: SubscriptionService,
  ) {}

  async findAllByTenantAndBranch(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) {
      where.OR = [
        { branchId: branchId },
        { branchId: null }
      ];
    }
    return (this.prisma as any).product.findMany({
      where,
      include: {
        supplier: true,
        category: true,
        variations: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProduct(data: any, actorUserId?: string, ip?: string) {
    // Check plan limits for products
    const canAddProduct = await this.subscriptionService.canAddProduct(data.tenantId);
    if (!canAddProduct) {
      const subscription = await this.subscriptionService.getCurrentSubscription(data.tenantId);
      const maxProducts = subscription.plan?.maxProducts || 0;
      throw new BadRequestException(
        `Product limit exceeded. Your plan allows up to ${maxProducts} products. Please upgrade your plan to add more products.`,
      );
    }

    const productData = {
      ...data,
      id: uuidv4(), // Generate a new UUID for the product
    };

    // Handle supplier field - if supplier name is provided, find the supplier and set supplierId
    if (typeof productData.supplier === 'string') {
      if (productData.supplier) {
        const supplier = await (this.prisma as any).supplier.findFirst({
          where: {
            name: productData.supplier,
            tenantId: data.tenantId,
          },
        });
        if (supplier) {
          productData.supplierId = supplier.id;
        }
      }
      delete productData.supplier; // Remove the supplier name field
    }

    // Ensure stock is an integer
    if (productData.stock !== undefined) {
      productData.stock = parseInt(String(productData.stock), 10);
      if (isNaN(productData.stock)) {
        productData.stock = 0; // Default to 0 if parsing fails
      }
    }

    // Ensure price is a float, default to 0 if not provided or invalid
    if (productData.price !== undefined && productData.price !== null && productData.price !== '') {
      const parsedPrice = parseFloat(String(productData.price));
      productData.price = isNaN(parsedPrice) ? 0 : parsedPrice;
    } else {
      productData.price = 0; // Default price for simplified product creation
    }

    // Ensure cost is a float
    if (productData.cost !== undefined) {
      productData.cost = parseFloat(String(productData.cost));
    }

    // Handle variations if provided
    let variations = [];
    if (productData.variations && Array.isArray(productData.variations)) {
      variations = productData.variations.map((variation: any) => ({
        ...variation,
        id: uuidv4(),
        tenantId: data.tenantId,
        branchId: data.branchId,
      }));
      delete productData.variations;
    }

    // Handle category connection - category is now required
    const categoryId = productData.categoryId;
    if (!categoryId) {
      throw new BadRequestException('Category is required for all products');
    }
    delete productData.categoryId;

    // Remove fields that don't exist in Prisma schema
    delete productData.manage_stock;
    delete productData.type;
    delete productData.category;
    delete productData.industry;
    delete productData.attributes;
    delete productData.branchId;
    delete productData.tenantId;

    // Set hasVariations flag
    productData.hasVariations = variations.length > 0;

    const product = await this.prisma.product.create({
      data: {
        ...productData,
        tenant: {
          connect: { id: data.tenantId }
        },
        branch: {
          connect: { id: data.branchId }
        },
        category: {
          connect: { id: categoryId }
        },
        variations: {
          create: variations,
        },
      },
      include: {
        variations: true,
        category: true,
        tenant: true,
        branch: true,
      },
    });

    if (this.auditLogService) {
      await this.auditLogService.log(
        actorUserId || null,
        'product_created',
        { productId: product.id, name: product.name, sku: product.sku, hasVariations: product.hasVariations },
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
    const { name, sku, price, description, stock, cost, supplier, categoryId, variations, ...customFields } = data;
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
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (Object.keys(customFields).length > 0) {
      updateData.customFields = customFields;
    }

    // Handle variations update
    if (variations !== undefined) {
      // Delete existing variations and create new ones
      await this.prisma.productVariation.deleteMany({
        where: { productId: id, tenantId },
      });

      if (Array.isArray(variations) && variations.length > 0) {
        updateData.variations = {
          create: variations.map((variation: any) => ({
            ...variation,
            id: uuidv4(),
            tenantId,
          })),
        };
        updateData.hasVariations = true;
      } else {
        updateData.hasVariations = false;
      }
    }

    const result = await this.prisma.product.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

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
    const result = await this.prisma.product.deleteMany({
      where: { id, tenantId },
    });
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

  async bulkUpload(file: Express.Multer.File, user: any, uploadId?: string) {
    // Parse Excel file
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: '',
    });

    if (rows.length === 0) {
      return {
        summary: [{ status: 'error', error: 'No data found in file.' }],
      };
    }

    // Progress tracking
    if (!uploadId) uploadId = uuidv4();
    bulkUploadProgress[uploadId] = { processed: 0, total: rows.length };

    // Get branch ID - priority: user's branchId > selectedBranchId > first available branch
    let branchId = user.branchId || user.selectedBranchId;

    // If no branch ID found, try to get the first branch for the tenant
    if (!branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { tenantId: user.tenantId },
        select: { id: true },
      });
      if (branch) {
        branchId = branch.id;
      } else {
        throw new Error(
          'No branch found. Please create a branch before uploading products.',
        );
      }
    }

    console.log(`Using branch ID for bulk upload: ${branchId}`);

    // Create a bulk upload record for this upload
    const bulkUploadRecord = await this.prisma.bulkUploadRecord.create({
      data: {
        tenantId: user.tenantId,
        branchId: branchId,
        userId: user.userId,
        totalProducts: rows.length,
        totalValue: 0, // Will update later
        status: 'processing',
      },
    });

    // Get headers from the first row
    const headers = Object.keys(rows[0]);

    // Define possible synonyms for each required field
    const nameCandidates = [
      'name',
      'product name',
      'item name',
      'description',
      'title',
    ];
    const skuCandidates = [
      'sku',
      'product id',
      'product code',
      'partnumber',
      'part number',
      'code',
      'id',
    ];
    const priceCandidates = [
      'price',
      'unit price',
      'selling price',
      'sale price',
      'price usd',
      'amount',
    ];
    const costCandidates = [
      'cost',
      'purchase cost',
      'unit cost',
      'buy price',
      'cost price',
      'wholesale price',
    ];
    const categoryCandidates = [
      'category',
      'category name',
      'product category',
      'type',
      'group',
    ];

    // Find the best matching column for each required field
    const nameCol = findColumnMatch(headers, nameCandidates);
    const skuCol = findColumnMatch(headers, skuCandidates);
    const priceCol = findColumnMatch(headers, priceCandidates);
    const costCol = findColumnMatch(headers, costCandidates);
    const categoryCol = findColumnMatch(headers, categoryCandidates);

    // Required fields for Product - now includes category
    const requiredFields = ['name', 'sku', 'price', 'category'];
    const results: any[] = [];
    const createdProducts: any[] = [];

    // Process in batches to avoid transaction timeout
    const BATCH_SIZE = 10;
    let successfulCount = 0;
    let failedCount = 0;

    try {
      for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, rows.length);
        const batch = rows.slice(batchStart, batchEnd);

        console.log(`Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: rows ${batchStart + 1}-${batchEnd}`);

        // Process each batch in its own transaction with extended timeout
        await this.prisma.$transaction(async (prisma) => {
          for (const [batchIndex, row] of batch.entries()) {
            const globalIndex = batchStart + batchIndex;

            try {
              // Map the best-matched columns to required fields
              const mappedRow: Record<string, any> = { ...row };
              if (nameCol) mappedRow.name = row[nameCol];
              if (skuCol) mappedRow.sku = row[skuCol];
              if (priceCol) mappedRow.price = row[priceCol];
              if (costCol) mappedRow.cost = row[costCol];
              if (categoryCol) mappedRow.category = row[categoryCol];

              // Validate required fields
              for (const field of requiredFields) {
                if (!mappedRow[field])
                  throw new Error(`Missing required field: ${field}`);
              }

              // Find or create category
              let categoryId: string;
              const categoryName = String(mappedRow.category).trim();
              const existingCategory = await this.prisma.productCategory.findFirst({
                where: {
                  name: categoryName,
                  tenantId: user.tenantId,
                },
              });
              if (existingCategory) {
                categoryId = existingCategory.id;
              } else {
                const newCategory = await this.prisma.productCategory.create({
                  data: {
                    name: categoryName,
                    tenantId: user.tenantId,
                    id: uuidv4(),
                    isActive: true,
                  },
                });
                categoryId = newCategory.id;
              }

              // Extract standard fields
              const { name, sku, price, cost, description, stock, supplierId: extractedSupplierId, category, ...customFields } =
                mappedRow;

              const productData = {
                id: uuidv4(),
                name: String(name).trim(),
                sku: sku !== undefined ? String(sku).trim() : '',
                price: parseFloat(price),
                cost: cost !== undefined ? parseFloat(String(cost)) : 0,
                description: description ? String(description).trim() : '',
                stock: stock !== undefined ? parseInt(String(stock)) : 0,
                tenantId: user.tenantId,
                branchId: branchId, // Use the resolved branch ID
                categoryId: categoryId,
                supplierId: extractedSupplierId || null,
                bulkUploadRecordId: bulkUploadRecord.id,
                ...(Object.keys(customFields).length > 0 && { customFields }),
              };

              console.log('Creating product:', productData);
              const createdProduct = await prisma.product.create({
                data: productData,
              });
              createdProducts.push(createdProduct);
              results.push({ row: mappedRow, status: 'success' });
              successfulCount++;
            } catch (error) {
              console.error('Error processing row:', error);
              results.push({ row, status: 'error', error: error.message });
              failedCount++;
            } finally {
              bulkUploadProgress[uploadId].processed = globalIndex + 1;
            }
          }
        });
      }

      // Log successful bulk upload
      if (this.auditLogService) {
        await this.auditLogService.log(
          user.userId || null,
          'products_bulk_upload',
          {
            total: rows.length,
            successful: successfulCount,
            failed: failedCount,
            branchId,
          },
          user.ip,
        );
      }
    } catch (error) {
      console.error('Bulk upload failed:', error);
      throw new Error(`Bulk upload failed: ${error.message}`);
    }

    setTimeout(() => {
      delete bulkUploadProgress[uploadId];
    }, 60000); // Clean up after 1 min

    return {
      summary: {
        successful: successfulCount,
        failed: failedCount,
        errors: results.filter(r => r.status === 'error').map(r => r.error)
      },
      uploadId
    };
  }

  async getProductCount(tenantId: string, branchId?: string): Promise<number> {
    return this.prisma.product.count({
      where: {
        tenantId,
        ...(branchId && { branchId }),
      },
    });
  }

  static getBulkUploadProgress(uploadId: string) {
    return bulkUploadProgress[uploadId] || null;
  }

  async clearAll(tenantId: string) {
    const deleted = await this.prisma.product.deleteMany({
      where: { tenantId },
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
    const uploadsDir = path.join(process.cwd(), 'uploads', 'products', tenantId);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const imageUrls: string[] = [];

    for (const file of files) {
      // Basic validation
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('Only image files are allowed');
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
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
    const updatedImages = product.images.filter(img => img !== imageUrl);

    // Delete physical file
    try {
      const fileName = path.basename(imageUrl);
      const filePath = path.join(process.cwd(), 'uploads', 'products', tenantId, fileName);
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
    // Otherwise, construct the full URL
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}${imagePath}`;
  }

  async findOne(id: string, tenantId: string) {
    return (this.prisma as any).product.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        category: true,
        variations: {
          include: {
            branch: true,
          },
        },
        branch: true,
        tenant: true,
      },
    });
  }

  // Category CRUD methods
  async createCategory(data: { name: string; description?: string; customFields?: Record<string, string[]>; tenantId: string }) {
    return this.prisma.productCategory.create({
      data: {
        name: data.name,
        description: data.description || '',
        customFields: data.customFields || {},
        tenantId: data.tenantId,
        id: uuidv4(),
        isActive: true,
      },
    });
  }

  async getCategories(tenantId: string) {
    return this.prisma.productCategory.findMany({
      where: { tenantId, isActive: true },
      include: {
        attributes: {
          where: { isActive: true },
        },
        _count: {
          select: { products: true },
        },
        products: {
          include: {
            variations: true,
            supplier: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCategoriesWithCount(tenantId: string) {
    return this.prisma.productCategory.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateCategory(id: string, data: { name?: string; description?: string }, tenantId: string) {
    return this.prisma.productCategory.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async deleteCategory(id: string, tenantId: string) {
    // Check if category has products
    const productCount = await this.prisma.product.count({
      where: { categoryId: id, tenantId },
    });

    if (productCount > 0) {
      throw new BadRequestException('Cannot delete category with existing products');
    }

    return this.prisma.productCategory.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    });
  }

  // Attribute CRUD methods
  async createAttribute(data: {
    name: string;
    type: string;
    values?: string[];
    required?: boolean;
    categoryId: string;
    tenantId: string;
  }) {
    return this.prisma.productAttribute.create({
      data: {
        ...data,
        id: uuidv4(),
      },
    });
  }

  async getAttributesByCategory(categoryId: string, tenantId: string) {
    return this.prisma.productAttribute.findMany({
      where: { categoryId, tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async updateAttribute(id: string, data: Partial<{
    name: string;
    type: string;
    values: string[];
    required: boolean;
  }>, tenantId: string) {
    return this.prisma.productAttribute.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async deleteAttribute(id: string, tenantId: string) {
    return this.prisma.productAttribute.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    });
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

  async updateVariation(id: string, data: Partial<{
    sku: string;
    price: number;
    cost: number;
    stock: number;
    attributes: any;
    isActive: boolean;
  }>, tenantId: string) {
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

  // Helper method to generate variations from attributes
  generateVariationsFromAttributes(attributes: any[], baseProduct: any) {
    if (!attributes || attributes.length === 0) return [];

    // Create all possible combinations of attribute values
    const combinations = this.cartesianProduct(attributes.map(attr => attr.values));

    return combinations.map((combination, index) => {
      const attrsObj = {};
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
    return first.flatMap(value => restCombinations.map(combination => [value, ...combination]));
  }

  // Generate variations from custom fields
  async generateVariationsFromCustomFields(productId: string, tenantId: string, userId: string) {
    // Get the product with custom fields
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.customFields || typeof product.customFields !== 'object') {
      throw new BadRequestException('Product has no custom fields to generate variations from');
    }

    // Extract attribute arrays from custom fields
    const attributes: any[] = [];
    const customFields = product.customFields as Record<string, any>;

    for (const [key, value] of Object.entries(customFields)) {
      if (Array.isArray(value) && value.length > 0) {
        attributes.push({
          name: key,
          values: value,
        });
      }
    }

    if (attributes.length === 0) {
      throw new BadRequestException('No array-type custom fields found to generate variations');
    }

    // Generate variations using the existing method
    const variations = this.generateVariationsFromAttributes(attributes, product);

    // Delete existing variations
    await this.prisma.productVariation.deleteMany({
      where: { productId, tenantId },
    });

    // Create new variations
    const createdVariations = await this.prisma.productVariation.createMany({
      data: variations.map(variation => ({
        ...variation,
        productId,
        tenantId,
        branchId: product.branchId,
      })),
    });

    // Update product to mark it has variations
    await this.prisma.product.update({
      where: { id: productId },
      data: { hasVariations: true },
    });

    // Log the action
    if (this.auditLogService) {
      await this.auditLogService.log(
        userId,
        'product_variations_generated',
        { productId, variationCount: variations.length, attributes: attributes.map(a => a.name) },
        undefined,
      );
    }

    return {
      message: `Generated ${variations.length} variations from custom fields`,
      variations: variations.length,
      attributes: attributes.map(a => ({ name: a.name, values: a.values })),
    };
  }
}
