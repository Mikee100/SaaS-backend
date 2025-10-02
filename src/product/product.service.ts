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
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProduct(data: any, actorUserId?: string, ip?: string) {
    // Check product limit
    const productLimit = await this.billingService.checkLimit(
      data.tenantId,
      'products',
    );
    if (!productLimit.allowed) {
      throw new BadRequestException(
        `Product limit exceeded. You can create up to ${productLimit.limit} products with your current plan. Please upgrade to create more products.`,
      );
    }

    const productData = {
      ...data,
      id: uuidv4(), // Generate a new UUID for the product
    };

    // Handle supplier field - if supplier name is provided, find the supplier and set supplierId
    if (productData.supplier && typeof productData.supplier === 'string') {
      const supplier = await (this.prisma as any).supplier.findFirst({
        where: {
          name: productData.supplier,
          tenantId: data.tenantId,
        },
      });
      if (supplier) {
        productData.supplierId = supplier.id;
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

    // Ensure price is a float
    if (productData.price !== undefined) {
      productData.price = parseFloat(String(productData.price));
    }

    // Ensure cost is a float
    if (productData.cost !== undefined) {
      productData.cost = parseFloat(String(productData.cost));
    }

    const product = await this.prisma.product.create({
      data: productData,
    });

    if (this.auditLogService) {
      await this.auditLogService.log(
        actorUserId || null,
        'product_created',
        { productId: product.id, name: product.name, sku: product.sku },
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
    const { name, sku, price, description, stock, cost, supplier, ...customFields } = data;
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

    // Find the best matching column for each required field
    const nameCol = findColumnMatch(headers, nameCandidates);
    const skuCol = findColumnMatch(headers, skuCandidates);
    const priceCol = findColumnMatch(headers, priceCandidates);
    const costCol = findColumnMatch(headers, costCandidates);

    // Required fields for Product
    const requiredFields = ['name', 'sku', 'price'];
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

              // Validate required fields
              for (const field of requiredFields) {
                if (!mappedRow[field])
                  throw new Error(`Missing required field: ${field}`);
              }

              // Extract standard fields
              const { name, sku, price, cost, description, stock, supplierId: extractedSupplierId, ...customFields } =
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
}
