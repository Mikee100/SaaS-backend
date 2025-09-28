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
    return this.prisma.product.findMany({
      where: { branchId, tenantId },
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
    if (branchId) where.branchId = branchId;
    return this.prisma.product.findMany({
      where,
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
    const { name, sku, price, description, stock, cost, ...customFields } = data;
    const updateData: any = {};
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
    const createdProducts: any[] = []; // Temporarily using any[] to fix the type error

    try {
      // Process all rows in a transaction
      await this.prisma.$transaction(async (prisma) => {
        for (const [i, row] of rows.entries()) {
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
            const { name, sku, price, cost, description, stock, ...customFields } =
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
              ...(Object.keys(customFields).length > 0 && { customFields }),
            };

            console.log('Creating product:', productData);
            const createdProduct = await prisma.product.create({
              data: productData,
            });
            createdProducts.push(createdProduct);
            results.push({ row: mappedRow, status: 'success' });
          } catch (error) {
            console.error('Error processing row:', error);
            results.push({ row, status: 'error', error: error.message });
          } finally {
            bulkUploadProgress[uploadId].processed = i + 1;
          }
        }
      });

      // Log successful bulk upload
      if (this.auditLogService) {
        await this.auditLogService.log(
          user.userId || null,
          'products_bulk_upload',
          {
            total: rows.length,
            successful: results.filter((r) => r.status === 'success').length,
            failed: results.filter((r) => r.status === 'error').length,
            branchId,
          },
          user.ip,
        );
      }
    } catch (error) {
      console.error('Bulk upload transaction failed:', error);
      throw new Error(`Bulk upload failed: ${error.message}`);
    }
    setTimeout(() => {
      delete bulkUploadProgress[uploadId];
    }, 60000); // Clean up after 1 min
    return { summary: results, uploadId };
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
}
