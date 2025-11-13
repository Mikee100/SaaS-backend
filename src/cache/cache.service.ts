import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CacheService {
  private cache = new Map<string, { data: any; expiry: number }>();

  constructor(private prisma: PrismaService) {}

  // Simple in-memory cache with TTL
  set(key: string, data: any, ttlSeconds: number = 300) {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiry });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  // Invalidate all keys starting with a prefix (for tenant-specific invalidation)
  invalidateByPrefix(prefix: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  // Cache product count for a tenant (with optional branch)
  async getProductCount(tenantId: string, branchId?: string): Promise<number> {
    const branchSuffix = branchId ? `_${branchId}` : '';
    const cacheKey = `product_count_${tenantId}${branchSuffix}`;
    let count = this.get(cacheKey);

    if (count === null) {
      count = await this.prisma.product.count({
        where: { 
          tenantId,
          ...(branchId && { OR: [{ branchId }, { branchId: null }] })
        }
      });
      this.set(cacheKey, count, 300); // Cache for 5 minutes
    }

    return count;
  }

  // Cache frequently accessed products
  async getProductById(id: string, tenantId: string) {
    const cacheKey = `product_${id}_${tenantId}`;
    let product = this.get(cacheKey);

    if (!product) {
      product = await this.prisma.product.findFirst({
        where: { id, tenantId },
        include: {
          supplier: true,
          branch: true,
        }
      });
      if (product) {
        this.set(cacheKey, product, 600); // Cache for 10 minutes
      }
    }

    return product;
  }

  // Cache paginated product lists
  async getProductList(tenantId: string, branchId?: string, page: number = 1, limit: number = 10, includeSupplier: boolean = false): Promise<any> {
    const branchSuffix = branchId ? `_${branchId}` : '_all';
    const includeSuffix = includeSupplier ? '_with_supplier' : '';
    const cacheKey = `products_list_${tenantId}_${branchSuffix}_${page}_${limit}${includeSuffix}`;
    let result = this.get(cacheKey);

    if (!result) {
      // This would be called from service; here just placeholder for structure
      // Actual query in service
      result = null; // Will be set in service
      // For now, assume service handles
    }

    return result;
  }

  // Invalidate cache when products are modified
  invalidateProductCache(tenantId: string, productId?: string) {
    // Invalidate count
    this.delete(`product_count_${tenantId}`);
    // Invalidate specific product
    if (productId) {
      this.delete(`product_${productId}_${tenantId}`);
    }
    // Invalidate all lists for tenant
    this.invalidateByPrefix(`products_list_${tenantId}_`);
  }
}
