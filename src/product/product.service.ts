import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
import { LedgerService } from '../ledger/ledger.service';
import { restoreProduct } from '../prisma/soft-delete-restore';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import {
  ProductMode,
  isProductMode,
  getInventoryPolicyForMode,
} from './product-mode.types';

type ProductCategoryItem = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

type ProductWithCustomFields = {
  customFields?: unknown;
};

type CreateProductBomLineInput = {
  ingredientProductId: string;
  quantity: number;
  unit?: string;
  wastePercent?: number;
};

type CreateProductVariationAttributeInput = {
  attributeName: string;
  values: string[];
};

type CreateProductInput = Record<string, unknown> & {
  tenantId: string;
  branchId: string;
  category?: unknown;
  customFields?: unknown;
  customFieldValues?: unknown;
  supplierId?: unknown;
  // Product mode inputs (see product-mode.types.ts). All optional so
  // existing callers that omit `mode` keep today's exact behavior.
  mode?: unknown;
  variationAttributes?: unknown;
  bomLines?: unknown;
  yieldQty?: unknown;
  yieldUnit?: unknown;
};

type UpdateProductInput = Record<string, unknown> & {
  category?: unknown;
  customFields?: unknown;
  supplier?: unknown;
};

type ProductListResult = {
  products: Array<Record<string, unknown>>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

@Injectable()
export class ProductService {
  private readonly PRODUCT_CATEGORIES_KEY = 'PRODUCT_CATEGORIES';

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private auditLogService: AuditLogService,
    private billingService: BillingService,
    private subscriptionService: SubscriptionService,
    private ledgerService: LedgerService,
  ) {}

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private toStringValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  }

  private toNumberValue(value: unknown, defaultValue = 0): number {
    const parsed =
      typeof value === 'number' ? value : Number(this.toStringValue(value));
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

  private toIntegerValue(value: unknown, defaultValue = 0): number {
    const parsed = parseInt(this.toStringValue(value), 10);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

  private normalizeBarcode(value: string): string {
    return value.trim();
  }

  private normalizeBarcodeList(values?: string[]): string[] {
    if (!Array.isArray(values)) return [];

    const normalized = values
      .map((value) => this.normalizeBarcode(String(value ?? '')))
      .filter((value) => value.length > 0);

    return Array.from(new Set(normalized));
  }

  private validateBarcodeOrThrow(value: string): void {
    if (value.length < 3 || value.length > 64) {
      throw new BadRequestException(
        'Barcode must be between 3 and 64 characters',
      );
    }
  }

  private async syncVariationBarcodes(
    tx: Prisma.TransactionClient,
    params: {
      variationId: string;
      tenantId: string;
      primaryBarcode?: string | null;
      alternateBarcodes?: string[];
    },
  ): Promise<void> {
    const normalizedPrimary =
      typeof params.primaryBarcode === 'string'
        ? this.normalizeBarcode(params.primaryBarcode)
        : '';

    if (normalizedPrimary) {
      this.validateBarcodeOrThrow(normalizedPrimary);
    }

    const alternates = this.normalizeBarcodeList(params.alternateBarcodes)
      .filter((code) => code !== normalizedPrimary)
      .filter((code) => {
        this.validateBarcodeOrThrow(code);
        return true;
      });

    const desiredCodes = normalizedPrimary
      ? [normalizedPrimary, ...alternates]
      : alternates;

    const existing = await tx.productVariationBarcode.findMany({
      where: { variationId: params.variationId },
      select: { id: true, code: true, isPrimary: true, isActive: true },
    });

    const existingByCode = new Map(existing.map((item) => [item.code, item]));

    const conflicts = await tx.productVariationBarcode.findMany({
      where: {
        tenantId: params.tenantId,
        code: { in: desiredCodes },
        variationId: { not: params.variationId },
      },
      select: { code: true },
    });

    if (conflicts.length > 0) {
      throw new BadRequestException(
        `Barcode already assigned: ${conflicts[0].code}`,
      );
    }

    for (const code of desiredCodes) {
      const existingEntry = existingByCode.get(code);

      if (existingEntry) {
        await tx.productVariationBarcode.update({
          where: { id: existingEntry.id },
          data: {
            isPrimary: code === normalizedPrimary,
            isActive: true,
            deletedAt: null,
          },
        });
      } else {
        await tx.productVariationBarcode.create({
          data: {
            id: uuidv4(),
            tenantId: params.tenantId,
            variationId: params.variationId,
            code,
            type: 'CODE128',
            isPrimary: code === normalizedPrimary,
            isActive: true,
          },
        });
      }
    }

    const stale = existing.filter(
      (entry) => !desiredCodes.includes(entry.code),
    );
    if (stale.length > 0) {
      await tx.productVariationBarcode.updateMany({
        where: { id: { in: stale.map((entry) => entry.id) } },
        data: {
          isActive: false,
          isPrimary: false,
          deletedAt: new Date(),
        },
      });
    }
  }

  private normalizeCategoryName(input: unknown): string {
    return this.toStringValue(input).trim().replace(/\s+/g, ' ');
  }

  private normalizeCategorySlug(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private async readProductCategories(
    tenantId: string,
  ): Promise<ProductCategoryItem[]> {
    const config = await this.prisma.tenantConfiguration.findUnique({
      where: {
        tenantId_key: {
          tenantId,
          key: this.PRODUCT_CATEGORIES_KEY,
        },
      },
      select: { value: true },
    });

    if (!config?.value) return [];

    try {
      const parsed: unknown = JSON.parse(config.value);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item): ProductCategoryItem | null => {
          if (!this.isRecord(item)) {
            return null;
          }

          const id = this.toStringValue(item.id);
          const name = this.normalizeCategoryName(item.name);
          const slug = this.normalizeCategorySlug(
            this.toStringValue(item.slug || item.name),
          );

          return {
            id,
            name,
            slug,
            isActive: item.isActive !== false,
          };
        })
        .filter((item): item is ProductCategoryItem => item !== null)
        .filter((item) => item.id && item.name);
    } catch {
      return [];
    }
  }

  private async writeProductCategories(
    tenantId: string,
    categories: ProductCategoryItem[],
  ): Promise<void> {
    await this.prisma.tenantConfiguration.upsert({
      where: {
        tenantId_key: {
          tenantId,
          key: this.PRODUCT_CATEGORIES_KEY,
        },
      },
      update: {
        value: JSON.stringify(categories),
        description: 'Admin-managed product/menu categories',
        category: 'general',
        isEncrypted: false,
        isPublic: true,
        updatedAt: new Date(),
      },
      create: {
        id: `tenant_config_${tenantId}_${this.PRODUCT_CATEGORIES_KEY}_${Date.now()}`,
        tenantId,
        key: this.PRODUCT_CATEGORIES_KEY,
        value: JSON.stringify(categories),
        description: 'Admin-managed product/menu categories',
        category: 'general',
        isEncrypted: false,
        isPublic: true,
        updatedAt: new Date(),
      },
    });
  }

  private extractProductCategory(
    product: ProductWithCustomFields,
  ): string | undefined {
    const cf = product?.customFields;
    if (!cf || typeof cf !== 'object' || Array.isArray(cf)) return undefined;
    const raw = (cf as Record<string, unknown>).category;
    const normalized = this.normalizeCategoryName(raw);
    return normalized || undefined;
  }

  private mapProductCategory<T extends Record<string, unknown> | null>(
    product: T,
  ): T {
    if (!product) return product;
    const category = this.extractProductCategory(product);
    return {
      ...product,
      category,
    };
  }

  async listProductCategories(tenantId: string) {
    const categories = await this.readProductCategories(tenantId);
    return categories
      .filter((c) => c.isActive !== false)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createProductCategory(tenantId: string, name: string) {
    const normalizedName = this.normalizeCategoryName(name);
    if (!normalizedName) {
      throw new BadRequestException('Category name is required');
    }

    const categories = await this.readProductCategories(tenantId);
    const exists = categories.some(
      (c) =>
        c.isActive !== false &&
        c.name.toLowerCase() === normalizedName.toLowerCase(),
    );
    if (exists) {
      throw new BadRequestException('Category already exists');
    }

    const next = [
      ...categories,
      {
        id: uuidv4(),
        name: normalizedName,
        slug: this.normalizeCategorySlug(normalizedName),
        isActive: true,
      },
    ];

    await this.writeProductCategories(tenantId, next);
    return next
      .filter((c) => c.isActive !== false)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateProductCategory(
    tenantId: string,
    categoryId: string,
    name: string,
  ) {
    const normalizedName = this.normalizeCategoryName(name);
    if (!normalizedName) {
      throw new BadRequestException('Category name is required');
    }

    const categories = await this.readProductCategories(tenantId);
    const idx = categories.findIndex(
      (c) => c.id === categoryId && c.isActive !== false,
    );
    if (idx < 0) {
      throw new NotFoundException('Category not found');
    }

    const duplicate = categories.some(
      (c) =>
        c.id !== categoryId &&
        c.isActive !== false &&
        c.name.toLowerCase() === normalizedName.toLowerCase(),
    );
    if (duplicate) {
      throw new BadRequestException('Category already exists');
    }

    categories[idx] = {
      ...categories[idx],
      name: normalizedName,
      slug: this.normalizeCategorySlug(normalizedName),
    };

    await this.writeProductCategories(tenantId, categories);
    return categories
      .filter((c) => c.isActive !== false)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async deleteProductCategory(tenantId: string, categoryId: string) {
    const categories = await this.readProductCategories(tenantId);
    const next = categories.map((c) =>
      c.id === categoryId ? { ...c, isActive: false } : c,
    );
    const changed = next.some(
      (c, idx) => c.isActive !== categories[idx]?.isActive,
    );

    if (!changed) {
      throw new NotFoundException('Category not found');
    }

    await this.writeProductCategories(tenantId, next);
    return next
      .filter((c) => c.isActive !== false)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private async ensureCategoryRegistered(
    tenantId: string,
    categoryName?: string,
  ) {
    const normalizedName = this.normalizeCategoryName(categoryName);
    if (!normalizedName) return;

    const categories = await this.readProductCategories(tenantId);
    const exists = categories.some(
      (c) =>
        c.isActive !== false &&
        c.name.toLowerCase() === normalizedName.toLowerCase(),
    );
    if (exists) return;

    categories.push({
      id: uuidv4(),
      name: normalizedName,
      slug: this.normalizeCategorySlug(normalizedName),
      isActive: true,
    });
    await this.writeProductCategories(tenantId, categories);
  }

  async findAllByTenantAndBranch(
    tenantId: string,
    branchId?: string,
    page: number = 1,
    limit: number = 10,
    includeSupplier: boolean = false,
    search: string = '',
    includeVariations: boolean = false,
  ) {
    console.log('Backend: findAllByTenantAndBranch called with:', {
      tenantId,
      branchId,
      page,
      limit,
      includeVariations,
    });

    // Check cache first
    const branchSuffix = branchId ? `_${branchId}` : '_all';
    const includeSuffix = includeSupplier ? '_with_supplier' : '';
    const variationsSuffix = includeVariations ? '_with_variations' : '';
    const searchSuffix = search
      ? `_${search.replace(/\s+/g, '_').toLowerCase()}`
      : '';
    const cacheKey = `products_list_${tenantId}_${branchSuffix}_${page}_${limit}${includeSuffix}${variationsSuffix}${searchSuffix}`;
    const cachedResult = this.cacheService.get(cacheKey) as
      | ProductListResult
      | undefined;

    if (cachedResult) {
      return cachedResult;
    }

    const where: Prisma.ProductWhereInput = { tenantId };

    const conditions: Prisma.ProductWhereInput[] = [];

    if (search) {
      conditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (branchId) {
      conditions.push({ branchId });
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
    const select: Prisma.ProductSelect = {
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
          barcode: true,
          price: true,
          stock: true,
          attributes: true,
          images: true,
          barcodes: {
            where: { isActive: true },
            select: {
              id: true,
              code: true,
              isPrimary: true,
              type: true,
            },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
        },
      };
    }

    const products = await this.prisma.product.findMany({
      where,
      select,
      orderBy: [{ stock: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    });

    console.log(
      'Backend: Returning',
      products.length,
      'products for search:',
      search,
    );

    const result = {
      products: products.map((product) => this.mapProductCategory(product)),
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

  // Parses and validates the optional mode-driven fields (mode,
  // variationAttributes, bomLines, yieldQty/yieldUnit) off an otherwise
  // loosely-typed create payload. Returns defaults when `mode` is omitted
  // so existing callers are unaffected.
  private validateProductModeInputs(data: CreateProductInput): {
    mode?: ProductMode;
    variationAttributes: CreateProductVariationAttributeInput[];
    bomLines: CreateProductBomLineInput[];
    yieldQty: number;
    yieldUnit: string;
  } {
    let mode: ProductMode | undefined;
    if (data.mode !== undefined && data.mode !== null && data.mode !== '') {
      if (!isProductMode(data.mode)) {
        throw new BadRequestException(
          `Invalid product mode "${String(data.mode)}"`,
        );
      }
      mode = data.mode;
    }

    const variationAttributes: CreateProductVariationAttributeInput[] = [];
    if (Array.isArray(data.variationAttributes)) {
      for (const entry of data.variationAttributes as unknown[]) {
        const item = entry as Record<string, unknown>;
        const attributeName =
          typeof item?.attributeName === 'string'
            ? item.attributeName.trim()
            : '';
        if (
          !attributeName ||
          !Array.isArray(item?.values) ||
          item.values.length === 0
        ) {
          throw new BadRequestException(
            'Each variationAttributes entry requires attributeName and a non-empty values array',
          );
        }
        variationAttributes.push({
          attributeName,
          values: (item.values as unknown[]).map((v) => String(v)),
        });
      }
    }

    const bomLines: CreateProductBomLineInput[] = [];
    if (Array.isArray(data.bomLines)) {
      for (const entry of data.bomLines as unknown[]) {
        const item = entry as Record<string, unknown>;
        const ingredientProductId =
          typeof item?.ingredientProductId === 'string'
            ? item.ingredientProductId.trim()
            : '';
        const quantity = Number(item?.quantity);
        if (!ingredientProductId || !(quantity > 0)) {
          throw new BadRequestException(
            'Each bomLines entry requires ingredientProductId and a quantity greater than zero',
          );
        }
        bomLines.push({
          ingredientProductId,
          quantity,
          unit:
            typeof item?.unit === 'string' && item.unit.trim()
              ? item.unit.trim()
              : 'unit',
          wastePercent: Math.max(0, Number(item?.wastePercent || 0)),
        });
      }
    }

    const uniqueIngredientIds = new Set(
      bomLines.map((line) => line.ingredientProductId),
    );
    if (uniqueIngredientIds.size !== bomLines.length) {
      throw new BadRequestException(
        'Duplicate ingredient lines are not allowed',
      );
    }

    const yieldQty =
      data.yieldQty !== undefined ? this.toNumberValue(data.yieldQty, 1) : 1;
    if (!(yieldQty > 0)) {
      throw new BadRequestException('Yield quantity must be greater than zero');
    }
    const yieldUnit =
      typeof data.yieldUnit === 'string' && data.yieldUnit.trim()
        ? data.yieldUnit.trim()
        : 'portion';

    if (mode === 'unit_priced' && !data.unitId) {
      throw new BadRequestException(
        'unitId is required when mode is "unit_priced"',
      );
    }

    if (mode === 'recipe' && bomLines.length === 0) {
      throw new BadRequestException(
        'At least one bomLines entry is required when mode is "recipe"',
      );
    }

    return { mode, variationAttributes, bomLines, yieldQty, yieldUnit };
  }

  async createProduct(
    data: CreateProductInput,
    actorUserId?: string,
    ip?: string,
  ) {
    if (!data.tenantId || !data.branchId) {
      throw new BadRequestException('tenantId and branchId are required');
    }

    const modeInputs = this.validateProductModeInputs(data);

    // Skip plan limits check when no subscription exists yet (e.g. during
    // initial tenant setup), mirroring branch/user/sale creation enforcement.
    try {
      const canAddProduct = await this.subscriptionService.canAddProduct(
        data.tenantId,
      );
      if (!canAddProduct) {
        const subscription =
          await this.subscriptionService.getCurrentSubscription(data.tenantId);
        const maxProducts = subscription.plan?.maxProducts || 0;
        throw new ForbiddenException(
          `Product limit exceeded. Your plan allows up to ${maxProducts} products. Please upgrade your plan to add more products.`,
        );
      }
    } catch (error) {
      if (
        error instanceof NotFoundException &&
        /No active( or trial)? subscription found/i.test(error.message)
      ) {
        // Allow product creation for tenants without a subscription yet
      } else {
        throw error;
      }
    }

    const productData: Record<string, unknown> = {
      ...data,
      id: uuidv4(), // Generate a new UUID for the product
    };

    // Ensure stock is an integer
    if (productData.stock !== undefined) {
      productData.stock = this.toIntegerValue(productData.stock, 0);
    }

    // Ensure price is a float, default to 0 if not provided or invalid
    if (
      productData.price !== undefined &&
      productData.price !== null &&
      productData.price !== ''
    ) {
      productData.price = this.toNumberValue(productData.price, 0);
    } else {
      productData.price = 0; // Default price for simplified product creation
    }

    // Ensure cost is a float
    if (productData.cost !== undefined) {
      productData.cost = this.toNumberValue(productData.cost, 0);
    }

    const normalizedCategory = this.normalizeCategoryName(data.category);

    // Handle customFieldValues - map to customFields
    const existingCustomFields =
      productData.customFields &&
      typeof productData.customFields === 'object' &&
      !Array.isArray(productData.customFields)
        ? productData.customFields
        : {};
    const fromCustomFieldValues =
      data.customFieldValues &&
      typeof data.customFieldValues === 'object' &&
      !Array.isArray(data.customFieldValues)
        ? data.customFieldValues
        : {};
    productData.customFields = {
      ...existingCustomFields,
      ...fromCustomFieldValues,
      ...(normalizedCategory ? { category: normalizedCategory } : {}),
    };

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
    delete productData.mode;
    delete productData.variationAttributes;
    delete productData.bomLines;
    delete productData.yieldQty;
    delete productData.yieldUnit;

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
      select: { id: true, tenantId: true },
    });
    if (!branch) {
      throw new BadRequestException(
        `Branch with id ${data.branchId} does not exist`,
      );
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: data.tenantId },
    });
    if (!tenant) {
      throw new BadRequestException(
        `Tenant with id ${data.tenantId} does not exist`,
      );
    }

    if (branch.tenantId !== data.tenantId) {
      throw new BadRequestException(
        `Branch with id ${data.branchId} does not belong to tenant ${data.tenantId}`,
      );
    }

    // Validate BOM ingredient references before creating anything, so a
    // bad ingredient id fails fast instead of leaving an orphan product.
    if (modeInputs.bomLines.length > 0) {
      const ingredientCount = await this.prisma.product.count({
        where: {
          id: {
            in: modeInputs.bomLines.map((line) => line.ingredientProductId),
          },
          tenantId: data.tenantId,
          deletedAt: null,
          OR: [{ branchId: data.branchId }, { branchId: null }],
        },
      });
      if (ingredientCount !== modeInputs.bomLines.length) {
        throw new BadRequestException(
          'One or more ingredient products were not found in this branch or tenant',
        );
      }
    }

    // Build create data - use spread but ensure supplier is not included
    delete productData.supplier;
    const cleanProductData = productData;

    const createData: Prisma.ProductCreateInput = {
      ...(cleanProductData as Prisma.ProductCreateInput),
      tenant: {
        connect: { id: data.tenantId },
      },
      branch: {
        connect: { id: data.branchId },
      },
    };

    // Only set supplierId directly (not as relation) if provided
    // This avoids Prisma trying to set the supplier relation when it's null
    if (typeof supplierId === 'string' && supplierId.trim() !== '') {
      createData.supplier = { connect: { id: supplierId } };
    }
    // If supplierId is not provided, don't include it (Prisma will use null by default)

    // inventoryPolicy defaults to TRACKED on the Prisma model, so leaving
    // this unset when `mode` is omitted reproduces today's exact behavior.
    if (modeInputs.mode) {
      createData.inventoryPolicy = getInventoryPolicyForMode(modeInputs.mode);
    }
    if (modeInputs.mode === 'service') {
      createData.stock = 0; // services carry no physical stock
    }

    let product = await this.prisma.product.create({
      data: createData,
    });

    await this.ensureCategoryRegistered(data.tenantId, normalizedCategory);

    let generatedVariations: unknown[] | undefined;
    let bomRecipe: unknown;

    if (
      modeInputs.mode === 'variable' &&
      modeInputs.variationAttributes.length > 0
    ) {
      await this.generateVariationsFromAttributes(
        product.id,
        data.tenantId,
        modeInputs.variationAttributes,
        undefined,
        data.branchId,
      );
      product = await this.prisma.product.update({
        where: { id: product.id },
        data: { hasVariations: true },
      });
      generatedVariations = await this.prisma.productVariation.findMany({
        where: { productId: product.id },
      });
    }

    if (modeInputs.mode === 'recipe' && modeInputs.bomLines.length > 0) {
      bomRecipe = await this.prisma.bomRecipe.create({
        data: {
          tenantId: data.tenantId,
          branchId: data.branchId,
          productId: product.id,
          yieldQty: modeInputs.yieldQty,
          yieldUnit: modeInputs.yieldUnit,
          isActive: true,
          createdBy: actorUserId,
          lines: {
            create: modeInputs.bomLines.map((line) => ({
              ingredientProductId: line.ingredientProductId,
              quantity: line.quantity,
              unit: line.unit ?? 'unit',
              wastePercent: line.wastePercent ?? 0,
            })),
          },
        },
        include: { lines: true },
      });
    }

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

    // --- Automated Accounting Entry ---
    if (product.stock > 0 && product.cost > 0) {
      try {
        await this.ledgerService.recordInitialCapital(
          data.tenantId,
          actorUserId || 'system',
          {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            quantity: product.stock,
            cost: product.cost,
          },
        );
      } catch (accError) {
        console.error(
          'Failed to create automated accounting entry for product capital:',
          accError,
        );
      }
    }

    return {
      ...this.mapProductCategory(product),
      ...(generatedVariations ? { variations: generatedVariations } : {}),
      ...(bomRecipe ? { bomRecipe } : {}),
    };
  }

  async updateProduct(
    id: string,
    data: UpdateProductInput,
    tenantId: string,
    branchId: string,
    actorUserId?: string,
    ip?: string,
  ) {
    const existingProduct = await this.prisma.product.findFirst({
      where: { id, tenantId, branchId, deletedAt: null },
      select: { id: true },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found for the selected branch');
    }

    // Separate standard and custom fields
    const {
      name,
      sku,
      price,
      description,
      stock,
      cost,
      images,
      supplier,
      category,
      customFields: incomingCustomFields,
      ...customFields
    } = data;
    const updateData: Prisma.ProductUpdateInput = {};

    // Handle supplier field - if supplier name is provided, find the supplier and set supplierId
    if (supplier !== undefined) {
      if (supplier && typeof supplier === 'string') {
        const supplierRecord = await this.prisma.supplier.findFirst({
          where: {
            name: supplier,
            tenantId: tenantId,
          },
        });
        if (supplierRecord) {
          updateData.supplier = { connect: { id: supplierRecord.id } };
        } else {
          updateData.supplier = { disconnect: true }; // Clear supplier if not found
        }
      } else {
        updateData.supplier = { disconnect: true }; // Clear supplier if empty
      }
    }

    if (name !== undefined) updateData.name = this.toStringValue(name);
    if (sku !== undefined) updateData.sku = this.toStringValue(sku);
    if (price !== undefined) updateData.price = this.toNumberValue(price);
    if (description !== undefined)
      updateData.description = this.toStringValue(description);
    if (stock !== undefined) updateData.stock = this.toIntegerValue(stock);
    if (cost !== undefined) updateData.cost = this.toNumberValue(cost);
    if (images !== undefined) {
      if (
        !Array.isArray(images) ||
        !images.every((image) => typeof image === 'string')
      ) {
        throw new BadRequestException(
          'images must be an array of image URL strings',
        );
      }
      updateData.images = images;
    }
    const mergedCustomFields = {
      ...(incomingCustomFields &&
      typeof incomingCustomFields === 'object' &&
      !Array.isArray(incomingCustomFields)
        ? incomingCustomFields
        : {}),
      ...(customFields && typeof customFields === 'object' ? customFields : {}),
    } as Record<string, unknown>;

    if (category !== undefined) {
      const normalizedCategory = this.normalizeCategoryName(category);
      if (normalizedCategory) {
        mergedCustomFields.category = normalizedCategory;
      } else {
        delete mergedCustomFields.category;
      }
      await this.ensureCategoryRegistered(tenantId, normalizedCategory);
    }

    if (Object.keys(mergedCustomFields).length > 0 || category !== undefined) {
      updateData.customFields =
        mergedCustomFields as unknown as Prisma.InputJsonValue;
    }

    const result = await this.prisma.product.updateMany({
      where: { id, tenantId, branchId, deletedAt: null },
      data: updateData,
    });

    // Invalidate cache for this tenant and product
    this.cacheService.invalidateProductCache(tenantId, id);

    if (this.auditLogService) {
      await this.auditLogService.log(
        actorUserId || null,
        'product_updated',
        { productId: id, updatedFields: data } as Prisma.InputJsonValue,
        ip,
      );
    }
    return result;
  }

  async deleteProduct(
    id: string,
    tenantId: string,
    branchId: string,
    actorUserId?: string,
    ip?: string,
  ) {
    const existingProduct = await this.prisma.product.findFirst({
      where: { id, tenantId, branchId, deletedAt: null },
      select: { id: true },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found for the selected branch');
    }

    const now = new Date();
    const result = await this.prisma.$transaction(async (prisma) => {
      await prisma.productVariation.updateMany({
        where: { productId: id, tenantId, branchId, deletedAt: null },
        data: { deletedAt: now },
      });

      const deleted = await prisma.product.updateMany({
        where: { id, tenantId, branchId, deletedAt: null },
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
      ` as Promise<
        Array<{
          id: string;
          name: string;
          sku: string;
          price: number;
          deletedAt: Date;
        }>
      >;
    }
    return this.prisma.$queryRaw`
      SELECT p.id, p.name, p.sku, p.price, p."deletedAt" FROM "Product" p
      WHERE p."tenantId" = ${tenantId} AND p."deletedAt" IS NOT NULL
      ORDER BY p."deletedAt" DESC
      LIMIT 100
    ` as Promise<
      Array<{
        id: string;
        name: string;
        sku: string;
        price: number;
        deletedAt: Date;
      }>
    >;
  }

  async restoreProduct(
    id: string,
    tenantId: string,
    actorUserId?: string,
    ip?: string,
  ) {
    const result = await restoreProduct(this.prisma, id, tenantId);
    if (result.count === 0) {
      throw new NotFoundException('Product not found or not deleted');
    }
    this.cacheService.invalidateProductCache(tenantId, id);
    if (this.auditLogService) {
      await this.auditLogService.log(
        actorUserId || null,
        'product_restored',
        { productId: id },
        ip,
      );
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
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7000'}${imagePath}`;
  }

  async findOne(id: string, tenantId: string) {
    // Try cache first
    let product = (await this.cacheService.getProductById(id, tenantId)) as
      | (Record<string, unknown> & ProductWithCustomFields)
      | null;

    if (!product) {
      product = await this.prisma.product.findFirst({
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

    return this.mapProductCategory(product);
  }

  // Variation CRUD methods
  async createVariation(data: {
    productId: string;
    sku: string;
    price?: number;
    cost?: number;
    stock: number;
    attributes: unknown;
    barcode?: string;
    alternateBarcodes?: string[];
    tenantId: string;
    branchId?: string;
  }) {
    const normalizedPrimaryBarcode = data.barcode
      ? this.normalizeBarcode(data.barcode)
      : '';

    if (normalizedPrimaryBarcode) {
      this.validateBarcodeOrThrow(normalizedPrimaryBarcode);
    }

    try {
      const variation = await this.prisma.$transaction(async (tx) => {
        const created = await tx.productVariation.create({
          data: {
            id: uuidv4(),
            productId: data.productId,
            sku: data.sku,
            price: data.price ?? 0,
            cost: data.cost ?? 0,
            stock: data.stock,
            attributes: data.attributes ?? {},
            tenantId: data.tenantId,
            branchId: data.branchId ?? null,
            barcode: normalizedPrimaryBarcode || null,
          },
        });

        await this.syncVariationBarcodes(tx, {
          variationId: created.id,
          tenantId: data.tenantId,
          primaryBarcode: normalizedPrimaryBarcode || null,
          alternateBarcodes: data.alternateBarcodes,
        });

        return tx.productVariation.findUniqueOrThrow({
          where: { id: created.id },
          include: {
            barcodes: {
              where: { isActive: true },
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            },
          },
        });
      });

      // --- Automated Accounting Entry ---
      if (variation.stock > 0 && variation.cost && variation.cost > 0) {
        try {
          // Fetch product name for better description
          const product = await this.prisma.product.findUnique({
            where: { id: variation.productId },
            select: { name: true },
          });
          await this.ledgerService.recordInitialCapital(
            data.tenantId,
            'system',
            {
              productId: variation.id,
              sku: variation.sku,
              name: `${product?.name || 'Product'} (Variation: ${variation.sku})`,
              quantity: variation.stock,
              cost: variation.cost,
            },
          );
        } catch (accError) {
          console.error(
            'Failed to create automated accounting entry for variation capital:',
            accError,
          );
        }
      }

      return variation;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Barcode or SKU already exists');
      }
      throw error;
    }
  }

  async getVariationsByProduct(productId: string, tenantId: string) {
    return this.prisma.productVariation.findMany({
      where: { productId, tenantId, isActive: true },
      include: {
        barcodes: {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
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
      attributes: unknown;
      barcode: string;
      alternateBarcodes: string[];
      isActive: boolean;
      images: string[];
    }>,
    tenantId: string,
  ) {
    const updateData: Prisma.ProductVariationUpdateManyMutationInput = {};
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.cost !== undefined) updateData.cost = data.cost;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.attributes !== undefined) {
      updateData.attributes = data.attributes as Prisma.InputJsonValue;
    }
    if (data.barcode !== undefined) {
      const normalized = this.normalizeBarcode(data.barcode);
      if (normalized) {
        this.validateBarcodeOrThrow(normalized);
      }
      updateData.barcode = normalized || null;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.productVariation.updateMany({
        where: { id, tenantId },
        data: updateData,
      });

      if (updated.count === 0) {
        return updated;
      }

      if (data.barcode !== undefined || data.alternateBarcodes !== undefined) {
        const current = await tx.productVariation.findFirst({
          where: { id, tenantId },
          select: { barcode: true },
        });

        await this.syncVariationBarcodes(tx, {
          variationId: id,
          tenantId,
          primaryBarcode: current?.barcode ?? null,
          alternateBarcodes: data.alternateBarcodes,
        });
      }

      return updated;
    });
  }

  async findVariationByBarcode(
    barcode: string,
    tenantId: string,
    branchId?: string,
  ) {
    const normalized = this.normalizeBarcode(barcode);
    if (!normalized) {
      throw new BadRequestException('Barcode is required');
    }

    const barcodeHit = await this.prisma.productVariationBarcode.findFirst({
      where: {
        tenantId,
        code: normalized,
        isActive: true,
        variation: {
          isActive: true,
          deletedAt: null,
          product: {
            tenantId,
            deletedAt: null,
            ...(branchId ? { branchId } : {}),
          },
        },
      },
      include: {
        variation: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                stock: true,
                branchId: true,
              },
            },
            barcodes: {
              where: { isActive: true },
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            },
          },
        },
      },
    });

    if (barcodeHit) {
      return {
        matchedBarcode: barcodeHit.code,
        matchedAs: barcodeHit.isPrimary ? 'primary' : 'alternate',
        variation: barcodeHit.variation,
        product: barcodeHit.variation.product,
      };
    }

    const legacyVariation = await this.prisma.productVariation.findFirst({
      where: {
        tenantId,
        barcode: normalized,
        isActive: true,
        deletedAt: null,
        product: {
          tenantId,
          deletedAt: null,
          ...(branchId ? { branchId } : {}),
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            stock: true,
            branchId: true,
          },
        },
        barcodes: {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!legacyVariation) {
      throw new NotFoundException('Barcode not found');
    }

    return {
      matchedBarcode: normalized,
      matchedAs: 'legacy',
      variation: legacyVariation,
      product: legacyVariation.product,
    };
  }

  async deleteVariation(id: string, tenantId: string) {
    return this.prisma.productVariation.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    });
  }

  async uploadVariationImages(
    variationId: string,
    files: Express.Multer.File[],
    tenantId: string,
    userId: string,
  ) {
    const variation = await this.prisma.productVariation.findFirst({
      where: { id: variationId, tenantId, isActive: true },
      select: { id: true, productId: true, images: true },
    });

    if (!variation) {
      throw new NotFoundException('Variation not found');
    }

    const uploadsDir = path.join(
      process.cwd(),
      'uploads',
      'products',
      tenantId,
      'variations',
    );
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const imageUrls: string[] = [];

    for (const file of files) {
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('Only image files are allowed');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('Image size must be less than 5MB');
      }

      const fileExtension = path.extname(file.originalname) || '.jpg';
      const fileName = `${variation.productId}_${variationId}_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExtension}`;
      const filePath = path.join(uploadsDir, fileName);

      try {
        const optimizedBuffer = await sharp(file.buffer)
          .resize(1200, 1200, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();

        fs.writeFileSync(filePath, optimizedBuffer);
        imageUrls.push(`/uploads/products/${tenantId}/variations/${fileName}`);
      } catch {
        throw new BadRequestException('Failed to process image');
      }
    }

    const updatedVariation = await this.prisma.productVariation.update({
      where: { id: variationId },
      data: {
        images: {
          push: imageUrls,
        },
      },
    });

    if (this.auditLogService) {
      await this.auditLogService.log(
        userId,
        'variation_images_uploaded',
        { variationId, imageCount: imageUrls.length },
        undefined,
      );
    }

    return updatedVariation;
  }

  async deleteVariationImage(
    variationId: string,
    imageUrl: string,
    tenantId: string,
    userId: string,
  ) {
    const variation = await this.prisma.productVariation.findFirst({
      where: { id: variationId, tenantId, isActive: true },
      select: { id: true, images: true },
    });

    if (!variation) {
      throw new NotFoundException('Variation not found');
    }

    const updatedImages = variation.images.filter((img) => img !== imageUrl);

    try {
      const fileName = path.basename(imageUrl);
      const filePath = path.join(
        process.cwd(),
        'uploads',
        'products',
        tenantId,
        'variations',
        fileName,
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Best-effort file cleanup only
    }

    const updatedVariation = await this.prisma.productVariation.update({
      where: { id: variationId },
      data: { images: updatedImages },
    });

    if (this.auditLogService) {
      await this.auditLogService.log(
        userId,
        'variation_image_deleted',
        { variationId, imageUrl },
        undefined,
      );
    }

    return updatedVariation;
  }

  // Helper method to generate variations from attributes (legacy - for backward compatibility)
  private generateVariationsFromAttributesLegacy(
    attributes: Array<{ name: string; values: string[] }>,
    baseProduct: {
      sku: string;
      price: number;
      cost: number;
      tenantId: string;
      branchId: string | null;
    },
  ) {
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
  private isCircularReference(parentId: string, tenantId: string): boolean {
    void parentId;
    void tenantId;
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
    void userId;
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

    const results: Prisma.BatchPayload[] = [];

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
