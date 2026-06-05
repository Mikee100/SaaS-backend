import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

type AccountSeed = {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subtype: string;
};

const ACCOUNT_SEED: AccountSeed[] = [
  { code: '1000', name: 'Cash', type: 'asset', subtype: 'cash' },
  { code: '1100', name: 'Bank Account', type: 'asset', subtype: 'bank' },
  { code: '1200', name: 'Inventory', type: 'asset', subtype: 'inventory' },
  { code: '1300', name: 'Accounts Receivable', type: 'asset', subtype: 'accounts_receivable' },
  { code: '2000', name: 'Accounts Payable', type: 'liability', subtype: 'accounts_payable' },
  { code: '3000', name: 'Owner Capital', type: 'equity', subtype: 'capital' },
  { code: '4000', name: 'Sales Revenue', type: 'revenue', subtype: 'sales' },
  { code: '5000', name: 'Cost of Goods Sold', type: 'expense', subtype: 'cogs' },
  { code: '5100', name: 'Rent Expense', type: 'expense', subtype: 'rent' },
  { code: '5200', name: 'Salary Expense', type: 'expense', subtype: 'salary' },
  { code: '5300', name: 'Utilities Expense', type: 'expense', subtype: 'utilities' },
  { code: '5400', name: 'General & Administrative', type: 'expense', subtype: 'general' },
];

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Transport', 'Supplies', 'Internet', 'Marketing'];

function getArg(name: string, fallback?: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) {
    return hit.split('=').slice(1).join('=');
  }

  const flag = `--${name}`;
  const idx = process.argv.findIndex((a) => a === flag);
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }

  const envKey = name
    .replace(/([A-Z])/g, '_$1')
    .replace(/-/g, '_')
    .toUpperCase();
  return process.env[envKey] || fallback;
}

function numberArg(name: string, fallback: number): number {
  const raw = getArg(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

async function ensureAccounts(prisma: PrismaClient, tenantId: string) {
  for (const acc of ACCOUNT_SEED) {
    await prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: acc.code } },
      update: { isActive: true },
      create: {
        tenantId,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        isSystem: true,
        isActive: true,
      },
    });
  }

  const all = await prisma.account.findMany({ where: { tenantId, isActive: true } });
  const bySubtype = new Map<string, string>();
  for (const a of all) {
    if (a.subtype) bySubtype.set(a.subtype, a.id);
  }
  return bySubtype;
}

async function ensureSecondBranch(prisma: PrismaClient, tenantId: string) {
  const branches = await prisma.branch.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  if (branches.length >= 2) return branches;

  const created = await prisma.branch.create({
    data: {
      id: randomUUID(),
      tenantId,
      name: 'Branch 2',
      status: 'active',
      isMainBranch: false,
      address: 'Secondary Branch',
      city: 'Nairobi',
      country: 'Kenya',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return [...branches, created];
}

async function ensureExpenseCategories(prisma: PrismaClient, tenantId: string) {
  for (const name of EXPENSE_CATEGORIES) {
    await prisma.expenseCategory.upsert({
      where: { name_tenantId: { name, tenantId } },
      update: { isActive: true },
      create: { tenantId, name, isActive: true },
    });
  }

  return prisma.expenseCategory.findMany({
    where: { tenantId, isActive: true, deletedAt: null },
    select: { id: true, name: true },
  });
}

async function ensureInventoryRows(
  prisma: PrismaClient,
  tenantId: string,
  branchIds: string[],
  products: Array<{ id: string; branchId: string | null }>,
) {
  for (const branchId of branchIds) {
    for (const p of products) {
      if (p.branchId && p.branchId !== branchId) continue;

      const existing = await prisma.inventory.findFirst({
        where: { tenantId, branchId, productId: p.id },
        select: { id: true, quantity: true },
      });

      if (existing) {
        await prisma.inventory.update({
          where: { id: existing.id },
          data: {
            quantity: Math.max(existing.quantity, randomInt(30, 180)),
            updatedAt: new Date(),
          },
          select: { id: true },
        });
      } else {
        await prisma.inventory.create({
          data: {
            id: randomUUID(),
            tenantId,
            branchId,
            productId: p.id,
            quantity: randomInt(40, 200),
            minStock: 5,
            maxStock: 1000,
            reorderPoint: 15,
            location: 'Main Warehouse',
            updatedAt: new Date(),
          },
          select: { id: true },
        });
      }
    }
  }
}

async function main() {
  const prisma = new PrismaClient();

  const tenantId = getArg('tenantId');
  const userEmail = getArg('userEmail');
  const days = numberArg('days', 90);
  const salesPerDay = numberArg('salesPerDay', 8);
  const expensesPerWeek = numberArg('expensesPerWeek', 4);
  const dryRun = process.argv.includes('--dryRun');

  if (!tenantId) {
    throw new Error('Missing --tenantId=<uuid>');
  }

  const tag = `tenant-seed-${tenantId}-${Date.now()}`;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    let user = userEmail
      ? await prisma.user.findFirst({ where: { tenantId, email: userEmail, deletedAt: null } })
      : null;

    if (!user) {
      user = await prisma.user.findFirst({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!user) {
      throw new Error(`No active user found for tenant ${tenantId}`);
    }

    const branches = await ensureSecondBranch(prisma, tenantId);
    const branchIds = branches.map((b) => b.id);

    const products = await prisma.product.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true, price: true, cost: true, branchId: true },
      orderBy: { createdAt: 'asc' },
    });

    if (products.length === 0) {
      throw new Error(`No products found for tenant ${tenantId}. Add products first, then rerun.`);
    }

    const expenseCategories = await ensureExpenseCategories(prisma, tenantId);
    const accountsBySubtype = await ensureAccounts(prisma, tenantId);

    if (!dryRun) {
      await ensureInventoryRows(prisma, tenantId, branchIds, products);
    }

    let createdSales = 0;
    let createdSaleItems = 0;
    let createdExpenses = 0;
    let createdJournalEntries = 0;
    const customers = ['Walk-in Customer', 'Amina', 'Otieno', 'Wanjiku', 'Kamau', 'Njeri', 'Maina'];
    const paymentTypes = ['cash', 'mpesa', 'bank'];

    for (let day = days; day >= 0; day--) {
      const saleDate = daysAgo(day);
      const todaysSales = randomInt(Math.max(2, Math.floor(salesPerDay * 0.6)), Math.max(3, Math.ceil(salesPerDay * 1.4)));

      for (let i = 0; i < todaysSales; i++) {
        const branchId = pick(branchIds);
        const branchProducts = products.filter((p) => !p.branchId || p.branchId === branchId);
        const pool = branchProducts.length > 0 ? branchProducts : products;

        const itemsCount = randomInt(1, 4);
        const chosen = new Set<number>();
        const saleItems: Array<{ productId: string; quantity: number; price: number; cost: number }> = [];

        while (chosen.size < Math.min(itemsCount, pool.length)) {
          chosen.add(randomInt(0, pool.length - 1));
        }

        for (const idx of chosen) {
          const p = pool[idx];
          const qty = randomInt(1, 5);
          const price = Math.max(1, randomFloat(p.price * 0.9, p.price * 1.15));
          saleItems.push({
            productId: p.id,
            quantity: qty,
            price,
            cost: Math.max(0, p.cost || 0),
          });
        }

        const subtotal = saleItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
        const total = Number(subtotal.toFixed(2));
        const saleId = randomUUID();
        const paymentType = pick(paymentTypes);

        if (!dryRun) {
          await prisma.sale.create({
            data: {
              id: saleId,
              tenantId,
              userId: user.id,
              total,
              paymentType,
              createdAt: new Date(saleDate.getTime() + randomInt(0, 12) * 60 * 60 * 1000),
              customerName: pick(customers),
              customerPhone: `07${randomInt(10, 99)}${randomInt(100000, 999999)}`,
              branchId,
              idempotencyKey: `${tag}-${saleId}`,
            },
          });

          await prisma.saleItem.createMany({
            data: saleItems.map((it) => ({
              id: randomUUID(),
              saleId,
              productId: it.productId,
              quantity: it.quantity,
              price: it.price,
            })),
          });

          const debitAccountId = paymentType === 'cash'
            ? accountsBySubtype.get('cash')
            : accountsBySubtype.get('bank');
          const salesRevenueId = accountsBySubtype.get('sales');
          const cogsId = accountsBySubtype.get('cogs');
          const inventoryId = accountsBySubtype.get('inventory');

          if (debitAccountId && salesRevenueId) {
            const je = await prisma.journalEntry.create({
              data: {
                tenantId,
                userId: user.id,
                date: saleDate,
                description: `Automated Sale Entry: ${saleId}`,
                type: 'sale',
                reference: `SALE-${saleId}`,
              },
            });

            const totalCost = saleItems.reduce((sum, it) => sum + it.cost * it.quantity, 0);
            const lines = [
              {
                journalEntryId: je.id,
                accountId: debitAccountId,
                debit: total,
                credit: 0,
                description: `Payment for Sale ${saleId}`,
              },
              {
                journalEntryId: je.id,
                accountId: salesRevenueId,
                debit: 0,
                credit: total,
                description: `Revenue from Sale ${saleId}`,
              },
            ];

            if (totalCost > 0 && cogsId && inventoryId) {
              lines.push(
                {
                  journalEntryId: je.id,
                  accountId: cogsId,
                  debit: Number(totalCost.toFixed(2)),
                  credit: 0,
                  description: `COGS for Sale ${saleId}`,
                },
                {
                  journalEntryId: je.id,
                  accountId: inventoryId,
                  debit: 0,
                  credit: Number(totalCost.toFixed(2)),
                  description: `Inventory reduction for Sale ${saleId}`,
                },
              );
            }

            await prisma.ledgerEntry.createMany({ data: lines });
            createdJournalEntries += 1;
          }
        }

        createdSales += 1;
        createdSaleItems += saleItems.length;
      }

      if (day % 7 === 0) {
        const weeklyExpenses = randomInt(Math.max(1, Math.floor(expensesPerWeek * 0.6)), Math.max(2, Math.ceil(expensesPerWeek * 1.4)));

        for (let e = 0; e < weeklyExpenses; e++) {
          const branchId = pick(branchIds);
          const category = pick(expenseCategories);
          const amount = randomFloat(450, 6500);
          const expenseDate = new Date(saleDate.getTime() + randomInt(0, 18) * 60 * 60 * 1000);

          if (!dryRun) {
            const expense = await prisma.expense.create({
              data: {
                tenantId,
                userId: user.id,
                branchId,
                amount,
                description: `${category.name} expense`,
                categoryId: category.id,
                expenseType: 'one_time',
                createdAt: expenseDate,
                updatedAt: expenseDate,
              },
            });

            const expenseSubtype = category.name.toLowerCase().includes('rent')
              ? 'rent'
              : category.name.toLowerCase().includes('util') || category.name.toLowerCase().includes('internet')
                ? 'utilities'
                : 'general';

            const expenseAccountId =
              accountsBySubtype.get(expenseSubtype) || accountsBySubtype.get('general');
            const cashAccountId = accountsBySubtype.get('cash');

            if (expenseAccountId && cashAccountId) {
              const je = await prisma.journalEntry.create({
                data: {
                  tenantId,
                  userId: user.id,
                  date: expenseDate,
                  description: `Automated Expense Entry: ${category.name}`,
                  type: 'expense',
                  reference: `EXPENSE-${expense.id}`,
                },
              });

              await prisma.ledgerEntry.createMany({
                data: [
                  {
                    journalEntryId: je.id,
                    accountId: expenseAccountId,
                    debit: amount,
                    credit: 0,
                    description: `Expense recorded (${category.name})`,
                  },
                  {
                    journalEntryId: je.id,
                    accountId: cashAccountId,
                    debit: 0,
                    credit: amount,
                    description: 'Expense payment (cash)',
                  },
                ],
              });
              createdJournalEntries += 1;
            }
          }

          createdExpenses += 1;
        }
      }
    }

    console.log('\nSeed complete');
    console.log(JSON.stringify({
      tenantId,
      tenantName: tenant.name,
      userId: user.id,
      branches: branches.map((b) => ({ id: b.id, name: b.name })),
      productsUsed: products.length,
      dryRun,
      createdSales,
      createdSaleItems,
      createdExpenses,
      createdJournalEntries,
      tag,
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
