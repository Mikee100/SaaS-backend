import { PrismaClient } from '@prisma/client';

const SOFT_DELETE_MODELS = [
  'User',
  'Tenant',
  'Branch',
  'Product',
  'ProductVariation',
  'ProductAttribute',
  'ProductAttributeValue',
  'Supplier',
  'Expense',
  'ExpenseCategory',
  'SupportTicket',
  'Credit',
  'Role',
  'SalesTarget',
  'SalaryScheme',
] as const;

/**
 * Helper to safely add a deletedAt: null constraint without overwriting or
 * flattening existing where conditions (including nested OR/AND/NOT).
 * Returns a where clause that preserves the original (e.g. unique id) and adds deletedAt: null.
 */
function withNotDeleted<T>(where: T | undefined): T {
  if (!where || (typeof where === 'object' && Object.keys(where).length === 0)) {
    return { deletedAt: null } as T;
  }

  // Wrap existing where in an AND clause so we don't override nested logic.
  return {
    AND: [where, { deletedAt: null }],
  } as T;
}

/**
 * Prisma extension that filters out soft-deleted records (deletedAt != null) on all read/update/count operations.
 * Delete operations must be replaced with update({ data: { deletedAt: new Date() } }) in services.
 */
export function softDeleteExtension(prisma: PrismaClient) {
  return prisma.$extends({
    name: 'softDelete',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as (typeof SOFT_DELETE_MODELS)[number])) {
            args.where = withNotDeleted(args.where);
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as (typeof SOFT_DELETE_MODELS)[number])) {
            args.where = withNotDeleted(args.where);
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as (typeof SOFT_DELETE_MODELS)[number])) {
            // For findUnique, we can't wrap with AND because Prisma requires unique fields at top level
            // Instead, fetch the record and check deletedAt manually
            const result = await query(args);
            if (result && (result as any).deletedAt !== null) {
              return null; // Return null if soft-deleted
            }
            return result;
          }
          return query(args);
        },
        async findFirstOrThrow({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as (typeof SOFT_DELETE_MODELS)[number])) {
            args.where = withNotDeleted(args.where);
          }
          return query(args);
        },
        async findUniqueOrThrow({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as (typeof SOFT_DELETE_MODELS)[number])) {
            // For findUniqueOrThrow, fetch and check deletedAt manually
            const result = await query(args);
            if (result && (result as any).deletedAt !== null) {
              // Throw a NotFoundError to match Prisma's behavior
              const error = new Error(`Record to findUniqueOrThrow does not exist or is soft-deleted`);
              (error as any).code = 'P2025';
              throw error;
            }
            return result;
          }
          return query(args);
        },
        async update({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as (typeof SOFT_DELETE_MODELS)[number])) {
            args.where = withNotDeleted(args.where);
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as (typeof SOFT_DELETE_MODELS)[number])) {
            args.where = withNotDeleted(args.where);
          }
          return query(args);
        },
        async count({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as (typeof SOFT_DELETE_MODELS)[number])) {
            args.where = withNotDeleted(args.where);
          }
          return query(args);
        },
      },
    },
  });
}

export type ExtendedPrismaClient = ReturnType<typeof softDeleteExtension>;
