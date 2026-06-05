import { PrismaService } from '../prisma.service';

/**
 * Restore soft-deleted records by setting deletedAt to null.
 * Uses raw SQL to bypass the soft-delete extension's update filter.
 */
export async function restoreProduct(
  prisma: PrismaService,
  id: string,
  tenantId: string,
): Promise<{ count: number }> {
  const [variations, product] = await Promise.all([
    prisma.$executeRaw<number>`
      UPDATE "ProductVariation" SET "deletedAt" = NULL
      WHERE "productId" = ${id} AND "tenantId" = ${tenantId} AND "deletedAt" IS NOT NULL
    `,
    prisma.$executeRaw<number>`
      UPDATE "Product" SET "deletedAt" = NULL
      WHERE "id" = ${id} AND "tenantId" = ${tenantId} AND "deletedAt" IS NOT NULL
    `,
  ]);
  return { count: variations + product };
}

export async function restoreSupplier(
  prisma: PrismaService,
  id: string,
  tenantId: string,
): Promise<number> {
  return prisma.$executeRaw<number>`
    UPDATE "Supplier" SET "deletedAt" = NULL
    WHERE "id" = ${id} AND "tenantId" = ${tenantId} AND "deletedAt" IS NOT NULL
  `;
}

export async function restoreBranch(
  prisma: PrismaService,
  id: string,
  tenantId: string,
): Promise<number> {
  return prisma.$executeRaw<number>`
    UPDATE "Branch" SET "deletedAt" = NULL
    WHERE "id" = ${id} AND "tenantId" = ${tenantId} AND "deletedAt" IS NOT NULL
  `;
}

export async function restoreUser(
  prisma: PrismaService,
  id: string,
): Promise<number> {
  return prisma.$executeRaw<number>`
    UPDATE "User" SET "deletedAt" = NULL
    WHERE "id" = ${id} AND "deletedAt" IS NOT NULL
  `;
}

export async function restoreProductAttribute(
  prisma: PrismaService,
  id: string,
  tenantId: string,
): Promise<number> {
  return prisma.$executeRaw<number>`
    UPDATE "ProductAttribute" SET "deletedAt" = NULL, "isActive" = true
    WHERE "id" = ${id} AND "tenantId" = ${tenantId} AND "deletedAt" IS NOT NULL
  `;
}

export async function restoreRole(
  prisma: PrismaService,
  id: string,
): Promise<number> {
  return prisma.$executeRaw<number>`
    UPDATE "Role" SET "deletedAt" = NULL
    WHERE "id" = ${id} AND "deletedAt" IS NOT NULL
  `;
}

export async function restoreExpense(
  prisma: PrismaService,
  id: string,
  tenantId: string,
): Promise<number> {
  return prisma.$executeRaw<number>`
    UPDATE "Expense" SET "deletedAt" = NULL, "isActive" = true
    WHERE "id" = ${id} AND "tenantId" = ${tenantId} AND "deletedAt" IS NOT NULL
  `;
}

export async function restoreExpenseCategory(
  prisma: PrismaService,
  id: string,
  tenantId: string,
): Promise<number> {
  return prisma.$executeRaw<number>`
    UPDATE "ExpenseCategory" SET "deletedAt" = NULL, "isActive" = true
    WHERE "id" = ${id} AND "tenantId" = ${tenantId} AND "deletedAt" IS NOT NULL
  `;
}

export async function restoreTenant(
  prisma: PrismaService,
  id: string,
): Promise<number> {
  return prisma.$executeRaw<number>`
    UPDATE "Tenant" SET "deletedAt" = NULL
    WHERE "id" = ${id} AND "deletedAt" IS NOT NULL
  `;
}
