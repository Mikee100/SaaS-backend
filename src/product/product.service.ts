import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as XLSX from 'xlsx';
import { Express, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuditLogService } from '../audit-log.service';
import * as qrcode from 'qrcode';
import { BillingService } from '../billing/billing.service';

// In-memory progress store (for demo; use Redis for production)
const bulkUploadProgress: Record<string, { processed: number; total: number }> = {};

function findColumnMatch(headers: string[], candidates: string[]): string | undefined {
  // Try exact, case-insensitive, and partial matches
  for (const candidate of candidates) {
    // Exact match (case-insensitive)
    const exact = headers.find(h => h.toLowerCase() === candidate.toLowerCase());
    if (exact) return exact;
    // Partial match (case-insensitive)
    const partial = headers.find(h => h.toLowerCase().includes(candidate.toLowerCase()));
    if (partial) return partial;
  }
  return undefined;
}

@Injectable()
export class ProductService {
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
    const productLimit = await this.billingService.checkLimit(data.tenantId, 'products');
    if (!productLimit.allowed) {
      throw new BadRequestException(
        `Product limit exceeded. You can create up to ${productLimit.limit} products with your current plan. Please upgrade to create more products.`
      );
    }

    const productData = { ...data };

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

    const product = await this.prisma.product.create({ data: productData });

    if (this.auditLogService) {
      await this.auditLogService.log(actorUserId || null, 'product_created', { productId: product.id, name: product.name, sku: product.sku }, ip);
    }
    return product;
  }

  async updateProduct(id: string, data: any, tenantId: string, actorUserId?: string, ip?: string) {
    // Separate standard and custom fields
    const { name, sku, price, description, stock, ...customFields } = data;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (sku !== undefined) updateData.sku = String(sku);
    if (price !== undefined) updateData.price = parseFloat(price);
    if (description !== undefined) updateData.description = description;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (Object.keys(customFields).length > 0) {
      updateData.customFields = customFields;
    }
    const result = await this.prisma.product.updateMany({
      where: { id, tenantId },
      data: updateData,
    });
    if (this.auditLogService) {
      await this.auditLogService.log(actorUserId || null, 'product_updated', { productId: id, updatedFields: data }, ip);
    }
    return result;
  }

  async deleteProduct(id: string, tenantId: string, actorUserId?: string, ip?: string) {
    const result = await this.prisma.product.deleteMany({
      where: { id, tenantId },
    });
    if (this.auditLogService) {
      await this.auditLogService.log(actorUserId || null, 'product_deleted', { productId: id }, ip);
    }
    return result;
  }

  async bulkUpload(file: Express.Multer.File, user: any, uploadId?: string) {
    // Parse Excel file
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

    if (rows.length === 0) {
      return { summary: [{ status: 'error', error: 'No data found in file.' }] };
    }

    // Progress tracking
    if (!uploadId) uploadId = uuidv4();
    bulkUploadProgress[uploadId] = { processed: 0, total: rows.length };

    // Get headers from the first row
    const headers = Object.keys(rows[0]);

    // Define possible synonyms for each required field
    const nameCandidates = ['name', 'product name', 'item name', 'description', 'title'];
    const skuCandidates = ['sku', 'product id', 'product code', 'partnumber', 'part number', 'code', 'id'];
    const priceCandidates = ['price', 'unit price', 'cost', 'price usd', 'amount'];

    // Find the best matching column for each required field
    const nameCol = findColumnMatch(headers, nameCandidates);
    const skuCol = findColumnMatch(headers, skuCandidates);
    const priceCol = findColumnMatch(headers, priceCandidates);

    // Required fields for Product
    const requiredFields = ['name', 'sku', 'price'];
    const results: any[] = [];
    for (const [i, row] of rows.entries()) {
      try {
        // Map the best-matched columns to required fields
        const mappedRow: Record<string, any> = { ...row };
        if (nameCol) mappedRow.name = row[nameCol];
        if (skuCol) mappedRow.sku = row[skuCol];
        if (priceCol) mappedRow.price = row[priceCol];

        // Validate required fields
        for (const field of requiredFields) {
          if (!mappedRow[field]) throw new Error(`Missing required field: ${field}`);
        }
        // Extract standard fields
        const { name, sku, price, description, stock, ...customFields } = mappedRow;
        const productData: any = {
          name,
          sku: sku !== undefined ? String(sku) : '',
          price: parseFloat(price),
          description: description || '',
          stock: stock !== undefined ? parseInt(stock) : 0,
          tenantId: user.tenantId,
          branchId: user.branchId || user.selectedBranchId,
        };
        // Attach custom fields if any
        if (Object.keys(customFields).length > 0) {
          productData.customFields = customFields;
        }
  console.log('Creating product:', productData);
        await this.prisma.product.create({ data: productData });
        results.push({ row: mappedRow, status: 'success' });
      } catch (error) {
  console.error('Bulk upload error:', error);
        results.push({ row, status: 'error', error: error.message });
      }
      bulkUploadProgress[uploadId].processed = i + 1;
    }
    setTimeout(() => { delete bulkUploadProgress[uploadId]; }, 60000); // Clean up after 1 min
    return { summary: results, uploadId };
  }

  static getBulkUploadProgress(uploadId: string) {
    return bulkUploadProgress[uploadId] || null;
  }

  async clearAll(tenantId: string) {
    const deleted = await this.prisma.product.deleteMany({ where: { tenantId } });
    return { deletedCount: deleted.count };
  }

  async randomizeAllStocks(tenantId: string) {
    const products = await this.prisma.product.findMany({ where: { tenantId } });
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
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, "");
    const img = Buffer.from(base64Data, 'base64');
    res.send(img);
  }
}
