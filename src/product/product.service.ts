import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as XLSX from 'xlsx';
import { Express } from 'express';
import { v4 as uuidv4 } from 'uuid';

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
  constructor(private prisma: PrismaService) {}

  async findAllByTenant(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProduct(data: { name: string; sku: string; price: number; description?: string; tenantId: string }) {
    return this.prisma.product.create({ data });
  }

  async updateProduct(id: string, data: any, tenantId: string) {
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
    return this.prisma.product.updateMany({
      where: { id, tenantId },
      data: updateData,
    });
  }

  async deleteProduct(id: string, tenantId: string) {
    return this.prisma.product.deleteMany({
      where: { id, tenantId },
    });
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
        };
        // Attach custom fields if any
        if (Object.keys(customFields).length > 0) {
          productData.customFields = customFields;
        }
        await this.prisma.product.create({ data: productData });
        results.push({ row: mappedRow, status: 'success' });
      } catch (error) {
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
}
