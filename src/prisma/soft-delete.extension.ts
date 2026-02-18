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
 * Prisma extension that filters out soft-deleted records (deletedAt != null) on all read operations.
 * Delete operations must be replaced with update({ data: { deletedAt: new Date() } }) in services.
 */
export function softDeleteExtension(prisma: PrismaClient) {
  return prisma.$extends({
    name: 'softDelete',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as (typeof SOFT_DELETE_MODELS)[number])) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as (typeof SOFT_DELETE_MODELS)[number])) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as (typeof SOFT_DELETE_MODELS)[number])) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async findFirstOrThrow({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as (typeof SOFT_DELETE_MODELS)[number])) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async findUniqueOrThrow({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as (typeof SOFT_DELETE_MODELS)[number])) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async update({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as (typeof SOFT_DELETE_MODELS)[number])) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as (typeof SOFT_DELETE_MODELS)[number])) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async count({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as (typeof SOFT_DELETE_MODELS)[number])) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
      },
    },
  });
}

export type ExtendedPrismaClient = ReturnType<typeof softDeleteExtension>;
