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
    (prisma as any).$executeRaw`
      UPDATE "ProductVariation" SET "deletedAt" = NULL
      WHERE "productId" = ${id} AND "tenantId" = ${tenantId} AND "deletedAt" IS NOT NULL
    `,
    (prisma as any).$executeRaw`
      UPDATE "Product" SET "deletedAt" = NULL
      WHERE "id" = ${id} AND "tenantId" = ${tenantId} AND "deletedAt" IS NOT NULL
    `,
  ]);
  return { count: (variations as number) + (product as number) };
}

export async function restoreSupplier(
  prisma: PrismaService,
  id: string,
  tenantId: string,
): Promise<number> {
  return (prisma as any).$executeRaw`
    UPDATE "Supplier" SET "deletedAt" = NULL
    WHERE "id" = ${id} AND "tenantId" = ${tenantId} AND "deletedAt" IS NOT NULL
  ` as Promise<number>;
}

export async function restoreBranch(
  prisma: PrismaService,
  id: string,
  tenantId: string,
): Promise<number> {
  return (prisma as any).$executeRaw`
    UPDATE "Branch" SET "deletedAt" = NULL
    WHERE "id" = ${id} AND "tenantId" = ${tenantId} AND "deletedAt" IS NOT NULL
  ` as Promise<number>;
}

export async function restoreUser(
  prisma: PrismaService,
  id: string,
): Promise<number> {
  return (prisma as any).$executeRaw`
    UPDATE "User" SET "deletedAt" = NULL
    WHERE "id" = ${id} AND "deletedAt" IS NOT NULL
  ` as Promise<number>;
}

export async function restoreProductAttribute(
  prisma: PrismaService,
  id: string,
  tenantId: string,
): Promise<number> {
  return (prisma as any).$executeRaw`
    UPDATE "ProductAttribute" SET "deletedAt" = NULL, "isActive" = true
    WHERE "id" = ${id} AND "tenantId" = ${tenantId} AND "deletedAt" IS NOT NULL
  ` as Promise<number>;
}

export async function restoreRole(
  prisma: PrismaService,
  id: string,
): Promise<number> {
  return (prisma as any).$executeRaw`
    UPDATE "Role" SET "deletedAt" = NULL
    WHERE "id" = ${id} AND "deletedAt" IS NOT NULL
  ` as Promise<number>;
}

export async function restoreExpense(
  prisma: PrismaService,
  id: string,
  tenantId: string,
): Promise<number> {
  return (prisma as any).$executeRaw`
    UPDATE "Expense" SET "deletedAt" = NULL, "isActive" = true
    WHERE "id" = ${id} AND "tenantId" = ${tenantId} AND "deletedAt" IS NOT NULL
  ` as Promise<number>;
}

export async function restoreExpenseCategory(
  prisma: PrismaService,
  id: string,
  tenantId: string,
): Promise<number> {
  return (prisma as any).$executeRaw`
    UPDATE "ExpenseCategory" SET "deletedAt" = NULL, "isActive" = true
    WHERE "id" = ${id} AND "tenantId" = ${tenantId} AND "deletedAt" IS NOT NULL
  ` as Promise<number>;
}

export async function restoreTenant(
  prisma: PrismaService,
  id: string,
): Promise<number> {
  return (prisma as any).$executeRaw`
    UPDATE "Tenant" SET "deletedAt" = NULL
    WHERE "id" = ${id} AND "deletedAt" IS NOT NULL
  ` as Promise<number>;
}
