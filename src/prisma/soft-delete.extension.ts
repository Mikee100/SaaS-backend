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

class SoftDeleteNotFoundError extends Error {
  code = 'P2025';

  constructor(message: string) {
    super(message);
    this.name = 'SoftDeleteNotFoundError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasDeletedAt(value: unknown): boolean {
  return (
    isRecord(value) && value.deletedAt !== null && value.deletedAt !== undefined
  );
}

function withNotDeletedWhereUnique(
  where: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!where) {
    return { deletedAt: null };
  }
  return {
    ...where,
    deletedAt: null,
  };
}

/**
 * Helper to safely add a deletedAt: null constraint without overwriting or
 * flattening existing where conditions (including nested OR/AND/NOT).
 * Returns a where clause that preserves the original (e.g. unique id) and adds deletedAt: null.
 */
function withNotDeleted(where: unknown): unknown {
  if (
    !where ||
    (typeof where === 'object' && Object.keys(where).length === 0)
  ) {
    return { deletedAt: null };
  }

  // Wrap existing where in an AND clause so we don't override nested logic.
  return {
    AND: [where, { deletedAt: null }],
  };
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
          if (
            SOFT_DELETE_MODELS.includes(
              model as (typeof SOFT_DELETE_MODELS)[number],
            )
          ) {
            args.where = withNotDeleted(args.where) as typeof args.where;
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (
            SOFT_DELETE_MODELS.includes(
              model as (typeof SOFT_DELETE_MODELS)[number],
            )
          ) {
            args.where = withNotDeleted(args.where) as typeof args.where;
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          if (
            SOFT_DELETE_MODELS.includes(
              model as (typeof SOFT_DELETE_MODELS)[number],
            )
          ) {
            // For findUnique, we can't wrap with AND because Prisma requires unique fields at top level
            // Instead, fetch the record and check deletedAt manually
            const result = await query(args);
            if (hasDeletedAt(result)) {
              return null; // Return null if soft-deleted
            }
            return result;
          }
          return query(args);
        },
        async findFirstOrThrow({ model, args, query }) {
          if (
            SOFT_DELETE_MODELS.includes(
              model as (typeof SOFT_DELETE_MODELS)[number],
            )
          ) {
            args.where = withNotDeleted(args.where) as typeof args.where;
          }
          return query(args);
        },
        async findUniqueOrThrow({ model, args, query }) {
          if (
            SOFT_DELETE_MODELS.includes(
              model as (typeof SOFT_DELETE_MODELS)[number],
            )
          ) {
            // For findUniqueOrThrow, fetch and check deletedAt manually
            const result = await query(args);
            if (hasDeletedAt(result)) {
              // Throw a NotFoundError to match Prisma's behavior
              throw new SoftDeleteNotFoundError(
                `Record to findUniqueOrThrow does not exist or is soft-deleted`,
              );
            }
            return result;
          }
          return query(args);
        },
        async update({ model, args, query }) {
          if (
            SOFT_DELETE_MODELS.includes(
              model as (typeof SOFT_DELETE_MODELS)[number],
            )
          ) {
            // Prisma update() requires WhereUniqueInput (e.g. { id }). Wrapping in AND makes it
            // a general WhereInput and breaks. Guard by ensuring the row exists and is not
            // soft-deleted, then run the update with the original where.
            args.where = withNotDeletedWhereUnique(
              args.where as Record<string, unknown> | undefined,
            ) as typeof args.where;
            try {
              return await query(args);
            } catch (error: unknown) {
              if (isRecord(error) && error.code === 'P2025') {
                throw new SoftDeleteNotFoundError(
                  'Record to update does not exist or is soft-deleted',
                );
              }
              throw error;
            }
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (
            SOFT_DELETE_MODELS.includes(
              model as (typeof SOFT_DELETE_MODELS)[number],
            )
          ) {
            args.where = withNotDeleted(args.where) as typeof args.where;
          }
          return query(args);
        },
        async count({ model, args, query }) {
          if (
            SOFT_DELETE_MODELS.includes(
              model as (typeof SOFT_DELETE_MODELS)[number],
            )
          ) {
            args.where = withNotDeleted(args.where) as typeof args.where;
          }
          return query(args);
        },
      },
    },
  });
}

export type ExtendedPrismaClient = ReturnType<typeof softDeleteExtension>;
