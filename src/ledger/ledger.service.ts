import { Injectable, BadRequestException } from '@nestjs/common';
import { LedgerEntry as LedgerEntryType } from './ledger.types';
import { PrismaService } from '../prisma.service';
import { JournalEntryDto, TrialBalance, ProfitAndLoss, BalanceSheet } from './accounting.types';
import { RealtimeGateway } from '../realtime.gateway';

@Injectable()
export class LedgerService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  private readonly viableDefaultAccounts = [
    // Assets (1000-1999)
    { name: 'Cash', code: '1000', type: 'asset', subtype: 'cash' },
    { name: 'Bank Account', code: '1100', type: 'asset', subtype: 'bank' },
    { name: 'Inventory', code: '1200', type: 'asset', subtype: 'inventory' },
    {
      name: 'Accounts Receivable',
      code: '1300',
      type: 'asset',
      subtype: 'accounts_receivable',
    },

    // Liabilities (2000-2999)
    {
      name: 'Accounts Payable',
      code: '2000',
      type: 'liability',
      subtype: 'accounts_payable',
    },

    // Equity (3000-3999)
    { name: 'Owner Capital', code: '3000', type: 'equity', subtype: 'capital' },

    // Revenue (4000-4999)
    { name: 'Sales Revenue', code: '4000', type: 'revenue', subtype: 'sales' },

    // Expenses (5000-5999)
    { name: 'Cost of Goods Sold', code: '5000', type: 'expense', subtype: 'cogs' },
    { name: 'Rent Expense', code: '5100', type: 'expense', subtype: 'rent' },
    { name: 'Salary Expense', code: '5200', type: 'expense', subtype: 'salary' },
    { name: 'Utilities Expense', code: '5300', type: 'expense', subtype: 'utilities' },
    {
      name: 'General & Administrative',
      code: '5400',
      type: 'expense',
      subtype: 'general',
    },
  ] as const;

  private resolveExpenseSubtype(categoryName?: string, description?: string) {
    const lowerHints = `${categoryName || ''} ${description || ''}`.toLowerCase();

    if (lowerHints.includes('rent')) return 'rent';
    if (
      lowerHints.includes('salary') ||
      lowerHints.includes('wage') ||
      lowerHints.includes('payroll')
    ) {
      return 'salary';
    }
    if (
      lowerHints.includes('utility') ||
      lowerHints.includes('electric') ||
      lowerHints.includes('water') ||
      lowerHints.includes('internet')
    ) {
      return 'utilities';
    }

    return 'general';
  }

  private selectExpenseAccount(
    accounts: Array<{ id: string; subtype: string | null }>,
    categoryName?: string,
    description?: string,
  ) {
    const subtype = this.resolveExpenseSubtype(categoryName, description);
    const account = accounts.find((a) => a.subtype === subtype);
    return account || accounts.find((a) => a.subtype === 'general') || null;
  }

  private extractBranchScope(reference?: string | null): string | undefined {
    if (!reference) return undefined;
    const match = /^BRANCH:([^:]+):/.exec(reference);
    return match?.[1];
  }

  private stripBranchScope(reference?: string | null): string {
    if (!reference) return '';
    return reference.replace(/^BRANCH:[^:]+:/, '');
  }

  private extractCreditId(reference: string): string | undefined {
    const scopedReference = this.stripBranchScope(reference);
    const modernMatch = /^CREDIT:([^:]+):PAYMENT:/.exec(scopedReference);
    if (modernMatch?.[1]) return modernMatch[1];

    // Legacy fallback: "CREDIT-<creditId>".
    if (
      scopedReference.startsWith('CREDIT-') &&
      !scopedReference.startsWith('CREDIT-PAYMENT-')
    ) {
      return scopedReference.slice('CREDIT-'.length);
    }

    return undefined;
  }

  private resolveLedgerSource(reference?: string | null): {
    type: 'invoice' | 'payment' | 'expense' | 'credit_note' | 'sale' | 'return' | 'manual' | 'stock';
    id?: string;
    paymentId?: string;
    url: string;
    label: string;
  } {
    const scopedReference = this.stripBranchScope(reference || '');

    const creditPayment = /^CREDIT:([^:]+):PAYMENT:([^:]+)$/.exec(scopedReference);
    if (creditPayment) {
      const creditId = creditPayment[1];
      const paymentId = creditPayment[2];
      return {
        type: 'payment',
        id: creditId,
        paymentId,
        url: `/credit?creditId=${encodeURIComponent(creditId)}&paymentId=${encodeURIComponent(paymentId)}`,
        label: 'Open payment',
      };
    }

    if (scopedReference.startsWith('CREDIT-')) {
      const creditId = scopedReference.slice('CREDIT-'.length);
      return {
        type: 'credit_note',
        id: creditId,
        url: `/credit?creditId=${encodeURIComponent(creditId)}`,
        label: 'Open credit note',
      };
    }

    if (scopedReference.startsWith('EXPENSE-')) {
      const expenseId = scopedReference.slice('EXPENSE-'.length);
      return {
        type: 'expense',
        id: expenseId,
        url: `/expenses?expenseId=${encodeURIComponent(expenseId)}`,
        label: 'Open expense',
      };
    }

    if (scopedReference.startsWith('SALE-')) {
      const saleId = scopedReference.slice('SALE-'.length);
      return {
        type: 'invoice',
        id: saleId,
        url: `/sales/history?saleId=${encodeURIComponent(saleId)}`,
        label: 'Open invoice',
      };
    }

    if (scopedReference.startsWith('RETURN-')) {
      const returnId = scopedReference.slice('RETURN-'.length);
      return {
        type: 'return',
        id: returnId,
        url: `/sales/history?returnId=${encodeURIComponent(returnId)}`,
        label: 'Open return',
      };
    }

    if (scopedReference.startsWith('INIT-STOCK-')) {
      const stockId = scopedReference.slice('INIT-STOCK-'.length);
      return {
        type: 'stock',
        id: stockId,
        url: `/products/unified`,
        label: 'Open stock item',
      };
    }

    return {
      type: 'manual',
      url: '/accounts/ledgers',
      label: 'Open ledger',
    };
  }

  private async filterJournalEntriesByBranch(
    tenantId: string,
    branchId: string,
    journalEntries: any[],
  ) {
    if (!journalEntries.length) return journalEntries;

    const saleIds = new Set<string>();
    const expenseIds = new Set<string>();
    const initStockIds = new Set<string>();
    const creditIds = new Set<string>();

    for (const journalEntry of journalEntries) {
      const reference = this.stripBranchScope(journalEntry.reference);
      if (reference.startsWith('SALE-')) {
        saleIds.add(reference.slice('SALE-'.length));
      } else if (reference.startsWith('EXPENSE-')) {
        expenseIds.add(reference.slice('EXPENSE-'.length));
      } else if (reference.startsWith('INIT-STOCK-')) {
        initStockIds.add(reference.slice('INIT-STOCK-'.length));
      }

      const creditId = this.extractCreditId(reference);
      if (creditId) creditIds.add(creditId);
    }

    const [sales, expenses, products, variations, credits] = await Promise.all([
      saleIds.size
        ? this.prisma.sale.findMany({
            where: {
              tenantId,
              branchId,
              id: { in: Array.from(saleIds) },
            },
            select: { id: true },
          })
        : Promise.resolve([]),
      expenseIds.size
        ? this.prisma.expense.findMany({
            where: {
              tenantId,
              branchId,
              deletedAt: null,
              id: { in: Array.from(expenseIds) },
            },
            select: { id: true },
          })
        : Promise.resolve([]),
      initStockIds.size
        ? this.prisma.product.findMany({
            where: {
              tenantId,
              branchId,
              id: { in: Array.from(initStockIds) },
            },
            select: { id: true },
          })
        : Promise.resolve([]),
      initStockIds.size
        ? this.prisma.productVariation.findMany({
            where: {
              tenantId,
              branchId,
              id: { in: Array.from(initStockIds) },
            },
            select: { id: true },
          })
        : Promise.resolve([]),
      creditIds.size
        ? this.prisma.credit.findMany({
            where: {
              tenantId,
              id: { in: Array.from(creditIds) },
              sale: { branchId },
            },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);

    const allowedSaleIds = new Set(sales.map((sale) => sale.id));
    const allowedExpenseIds = new Set(expenses.map((expense) => expense.id));
    const allowedInitStockIds = new Set([
      ...products.map((product) => product.id),
      ...variations.map((variation) => variation.id),
    ]);
    const allowedCreditIds = new Set(credits.map((credit) => credit.id));

    return journalEntries.filter((journalEntry) => {
      const explicitBranchScope = this.extractBranchScope(journalEntry.reference);
      if (explicitBranchScope) {
        return explicitBranchScope === branchId;
      }

      const reference = this.stripBranchScope(journalEntry.reference);
      if (!reference) return false;

      if (reference.startsWith('SALE-')) {
        const saleId = reference.slice('SALE-'.length);
        return allowedSaleIds.has(saleId);
      }

      if (reference.startsWith('EXPENSE-')) {
        const expenseId = reference.slice('EXPENSE-'.length);
        return allowedExpenseIds.has(expenseId);
      }

      if (reference.startsWith('INIT-STOCK-')) {
        const stockId = reference.slice('INIT-STOCK-'.length);
        return allowedInitStockIds.has(stockId);
      }

      const creditId = this.extractCreditId(reference);
      if (creditId) {
        return allowedCreditIds.has(creditId);
      }

      return false;
    });
  }

  private async getJournalEntriesForReporting(
    tenantId: string,
    params: {
      asOfDate?: Date;
      startDate?: Date;
      endDate?: Date;
      branchId?: string;
    },
  ) {
    const whereClause: any = { tenantId };

    if (params.asOfDate) {
      whereClause.date = { lte: params.asOfDate };
    } else if (params.startDate || params.endDate) {
      whereClause.date = {};
      if (params.startDate) whereClause.date.gte = params.startDate;
      if (params.endDate) {
        const endOfDay = new Date(params.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        whereClause.date.lte = endOfDay;
      }
    }

    const journalEntries = await this.prisma.journalEntry.findMany({
      where: whereClause,
      include: {
        user: true,
        ledgerEntries: {
          include: { account: true },
        },
      },
    });

    if (!params.branchId) return journalEntries;

    return this.filterJournalEntriesByBranch(
      tenantId,
      params.branchId,
      journalEntries,
    );
  }

  // --- Formal Accounting Methods ---

  async initializeCOA(tenantId: string) {
    const existingAccounts = await this.prisma.account.findMany({
      where: { tenantId },
      select: { id: true, code: true, isSystem: true },
    });

    const existingCodes = new Set(existingAccounts.map((a) => a.code));
    const viableCodes = new Set(this.viableDefaultAccounts.map((a) => a.code));

    const missingAccounts = this.viableDefaultAccounts.filter(
      (acc) => !existingCodes.has(acc.code),
    );

    if (missingAccounts.length > 0) {
      await this.prisma.account.createMany({
        data: missingAccounts.map((acc) => ({
          ...acc,
          tenantId,
          isSystem: true,
          isActive: true,
        })),
      });
    }

    // Keep viable defaults active for consistent posting and reporting.
    for (const account of this.viableDefaultAccounts) {
      await this.prisma.account.updateMany({
        where: { tenantId, code: account.code },
        data: {
          name: account.name,
          type: account.type,
          subtype: account.subtype,
          isSystem: true,
          isActive: true,
        },
      });
    }

    // Deactivate old non-viable system accounts only when they have no posted lines.
    const nonViableSystemAccounts = await this.prisma.account.findMany({
      where: {
        tenantId,
        isSystem: true,
        code: { notIn: Array.from(viableCodes) },
      },
      select: { id: true },
    });

    for (const account of nonViableSystemAccounts) {
      const usageCount = await this.prisma.ledgerEntry.count({
        where: { accountId: account.id },
      });

      if (usageCount === 0) {
        await this.prisma.account.update({
          where: { id: account.id },
          data: { isActive: false },
        });
      }
    }
  }

  async getAccounts(tenantId: string) {
    return this.prisma.account.findMany({
      where: { tenantId, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async createJournalEntry(tenantId: string, userId: string | null, dto: JournalEntryDto) {
    // Validate if user exists, otherwise set to null for system-generated entries
    let validUserId = userId;
    if (validUserId === 'system') {
      validUserId = null;
    } else if (validUserId) {
      const userExists = await this.prisma.user.findUnique({
        where: { id: validUserId },
        select: { id: true },
      });
      if (!userExists) {
        validUserId = null;
      }
    }

    const totalDebit = dto.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = dto.lines.reduce((sum, line) => sum + line.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException('Journal entry must be balanced (Total Debit must equal Total Credit)');
    }

    const created = await this.prisma.journalEntry.create({
      data: {
        tenantId,
        userId: validUserId,
        date: new Date(dto.date),
        description: dto.description,
        type: dto.type,
        reference: dto.reference,
        ledgerEntries: {
          create: dto.lines.map(line => ({
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            description: line.description,
          })),
        },
      },
      include: { ledgerEntries: { include: { account: true } } },
    });

    this.realtimeGateway.emitLedgerUpdate({
      tenantId,
      type: 'journal_entry_created',
      reference: created.reference,
      accountIds: created.ledgerEntries.map((entry) => entry.accountId),
      branchId: this.extractBranchScope(created.reference),
      journalEntryId: created.id,
      timestamp: new Date().toISOString(),
    });

    return created;
  }

  async getTrialBalance(
    tenantId: string,
    asOfDate?: Date,
    branchId?: string,
  ): Promise<TrialBalance> {
    const journalEntries = await this.getJournalEntriesForReporting(tenantId, {
      asOfDate,
      branchId,
    });

    // Use all tenant accounts so reports remain historically accurate even
    // when some system accounts were later deactivated.
    const accounts = await this.prisma.account.findMany({
      where: { tenantId },
    });

    const accountMap = new Map<string, { debit: number; credit: number }>();
    accounts.forEach(acc => accountMap.set(acc.id, { debit: 0, credit: 0 }));

    journalEntries.forEach(je => {
      je.ledgerEntries.forEach(le => {
        const current = accountMap.get(le.accountId);
        if (current) {
          current.debit += le.debit;
          current.credit += le.credit;
        }
      });
    });

    let totalDebit = 0;
    let totalCredit = 0;

    const trialBalanceAccounts = accounts.map(account => {
      const { debit: movementDebit, credit: movementCredit } =
        accountMap.get(account.id) || { debit: 0, credit: 0 };
      const netMovement = movementDebit - movementCredit;
      
      // Calculate balance based on account type
      let balance = 0;
      if (['asset', 'expense'].includes(account.type)) {
        balance = movementDebit - movementCredit;
      } else {
        balance = movementCredit - movementDebit;
      }

      // Trial balance columns should reflect raw ledger net movement per account.
      const debit = netMovement > 0 ? netMovement : 0;
      const credit = netMovement < 0 ? Math.abs(netMovement) : 0;

      totalDebit += debit;
      totalCredit += credit;

      return {
        id: account.id,
        name: account.name,
        code: account.code,
        type: account.type,
        subtype: account.subtype || undefined,
        debit,
        credit,
        balance,
      };
    });

    return {
      accounts: trialBalanceAccounts,
      totalDebit,
      totalCredit,
    };
  }

  async getProfitAndLoss(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
    branchId?: string,
  ): Promise<ProfitAndLoss> {
    const journalEntries = await this.getJournalEntriesForReporting(tenantId, {
      startDate,
      endDate,
      branchId,
    });

    const revenueMap = new Map<string, number>();
    const cogsMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();

    journalEntries.forEach(je => {
      je.ledgerEntries.forEach(le => {
        if (le.account.type === 'revenue') {
          const current = revenueMap.get(le.account.name) || 0;
          revenueMap.set(le.account.name, current + (le.credit - le.debit));
        } else if (le.account.type === 'expense') {
          if (le.account.subtype === 'cogs') {
            const current = cogsMap.get(le.account.name) || 0;
            cogsMap.set(le.account.name, current + (le.debit - le.credit));
          } else {
            const current = expenseMap.get(le.account.name) || 0;
            expenseMap.set(le.account.name, current + (le.debit - le.credit));
          }
        }
      });
    });

    const revenue = Array.from(revenueMap.entries()).map(([name, amount]) => ({ name, amount }));
    const cogs = Array.from(cogsMap.entries()).map(([name, amount]) => ({ name, amount }));
    const expenses = Array.from(expenseMap.entries()).map(([name, amount]) => ({ name, amount }));

    const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
    const totalCOGS = cogs.reduce((sum, c) => sum + c.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      revenue,
      cogs,
      expenses,
      totalRevenue,
      totalCOGS,
      grossProfit: totalRevenue - totalCOGS,
      totalExpenses,
      netProfit: totalRevenue - totalCOGS - totalExpenses,
    };
  }

  async getBalanceSheet(
    tenantId: string,
    asOfDate?: Date,
    branchId?: string,
  ): Promise<BalanceSheet> {
    const trialBalance = await this.getTrialBalance(tenantId, asOfDate, branchId);
    
    const assets = trialBalance.accounts
      .filter(a => a.type === 'asset')
      .map(a => ({ name: a.name, amount: a.balance }));
    
    const liabilities = trialBalance.accounts
      .filter(a => a.type === 'liability')
      .map(a => ({ name: a.name, amount: a.balance }));
    
    const equity = trialBalance.accounts
      .filter(a => a.type === 'equity')
      .map(a => ({ name: a.name, amount: a.balance }));

    // Derive current earnings from the same trial-balance scope to keep
    // Assets and Liabilities+Equity in sync.
    const totalRevenue = trialBalance.accounts
      .filter((a) => a.type === 'revenue')
      .reduce((sum, a) => sum + a.balance, 0);
    const totalExpenses = trialBalance.accounts
      .filter((a) => a.type === 'expense')
      .reduce((sum, a) => sum + a.balance, 0);
    const currentEarnings = totalRevenue - totalExpenses;

    const retainedEarningsIndex = trialBalance.accounts.findIndex(
      (a) =>
        a.type === 'equity' &&
        (a.subtype === 'retained_earnings' || a.name.toLowerCase() === 'retained earnings'),
    );

    if (retainedEarningsIndex >= 0) {
      const retainedName = trialBalance.accounts[retainedEarningsIndex].name;
      const equityIndex = equity.findIndex((e) => e.name === retainedName);
      if (equityIndex >= 0) {
        equity[equityIndex].amount += currentEarnings;
      }
    } else {
      equity.push({ name: 'Retained Earnings', amount: currentEarnings });
    }

    const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
    const totalEquity = equity.reduce((sum, e) => sum + e.amount, 0);

    return {
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
    };
  }

  // --- Automated Accounting Methods ---

  async recordSaleAutomation(tenantId: string, userId: string, data: {
    saleId: string,
    total: number,
    paymentMethod: string,
    date?: Date,
    items: { productId: string, name: string, quantity: number, price: number, cost?: number }[]
  }) {
    try {
      // Ensure COA is initialized
      await this.initializeCOA(tenantId);
      
      // 1. Get relevant accounts
      const accounts = await this.getAccounts(tenantId);
      const getAccount = (subtype: string) => accounts.find(a => a.subtype === subtype);

      const salesRevenueAcc = getAccount('sales');
      const cogsAcc = getAccount('cogs');
      const inventoryAcc = getAccount('inventory');
      
      let paymentAcc = getAccount('cash'); // Default
      if (data.paymentMethod === 'mpesa' || data.paymentMethod === 'bank') {
        paymentAcc = getAccount('bank') || paymentAcc;
      } else if (data.paymentMethod === 'credit') {
        paymentAcc = getAccount('accounts_receivable') || paymentAcc;
      }

      if (!salesRevenueAcc || !paymentAcc) {
        console.warn('Accounting setup incomplete for tenant', tenantId);
        return;
      }

      const lines = [
        { accountId: paymentAcc.id, debit: data.total, credit: 0, description: `Payment for Sale ${data.saleId}` },
        { accountId: salesRevenueAcc.id, debit: 0, credit: data.total, description: `Revenue from Sale ${data.saleId}` }
      ];

      // COGS and Inventory
      let totalCost = 0;
      for (const item of data.items) {
        if (item.cost && item.cost > 0) {
          totalCost += item.cost * item.quantity;
        }
      }

      if (totalCost > 0 && cogsAcc && inventoryAcc) {
        lines.push({ accountId: cogsAcc.id, debit: totalCost, credit: 0, description: `COGS for Sale ${data.saleId}` });
        lines.push({ accountId: inventoryAcc.id, debit: 0, credit: totalCost, description: `Inventory reduction for Sale ${data.saleId}` });
      }

      return this.createJournalEntry(tenantId, userId, {
        date: data.date || new Date(),
        description: `Automated Sale Entry: ${data.saleId}`,
        type: 'sale',
        reference: `SALE-${data.saleId}`,
        lines
      });
    } catch (error) {
      console.error('Failed to record automated sale entry:', error);
    }
  }

  async recordInitialCapital(tenantId: string, userId: string, data: {
    productId: string,
    sku: string,
    name: string,
    quantity: number,
    cost: number
  }) {
    try {
      if (data.quantity <= 0 || data.cost <= 0) return;

      // Ensure COA is initialized
      await this.initializeCOA(tenantId);

      const accounts = await this.getAccounts(tenantId);
      const inventoryAcc = accounts.find(a => a.subtype === 'inventory');
      const capitalAcc = accounts.find(a => a.subtype === 'capital');

      if (!inventoryAcc || !capitalAcc) return;

      const totalValue = data.quantity * data.cost;

      return this.createJournalEntry(tenantId, userId, {
        date: new Date(),
        description: `Initial stock for ${data.name} (${data.sku})`,
        type: 'adjustment',
        reference: `INIT-STOCK-${data.productId}`,
        lines: [
          { accountId: inventoryAcc.id, debit: totalValue, credit: 0, description: `Added ${data.quantity} units to inventory` },
          { accountId: capitalAcc.id, debit: 0, credit: totalValue, description: `Owner investment in stock` }
        ]
      });
    } catch (error) {
      console.error('Failed to record initial capital entry:', error);
    }
  }

  async recordReturnAutomation(tenantId: string, userId: string, data: {
    returnId: string,
    originalSaleId: string,
    total: number,
    refundMethod: string,
    items: { productId: string, name: string, quantity: number, price: number, cost?: number }[]
  }) {
    try {
      await this.initializeCOA(tenantId);
      const accounts = await this.getAccounts(tenantId);
      const getAccount = (subtype: string) => accounts.find(a => a.subtype === subtype);

      const salesRevenueAcc = getAccount('sales');
      const cogsAcc = getAccount('cogs');
      const inventoryAcc = getAccount('inventory');
      
      let paymentAcc = getAccount('cash');
      if (data.refundMethod === 'mpesa' || data.refundMethod === 'bank') {
        paymentAcc = getAccount('bank') || paymentAcc;
      }

      if (!salesRevenueAcc || !paymentAcc) return;

      const lines = [
        { accountId: salesRevenueAcc.id, debit: data.total, credit: 0, description: `Return for Sale ${data.originalSaleId}` },
        { accountId: paymentAcc.id, debit: 0, credit: data.total, description: `Refund for Return ${data.returnId}` }
      ];

      let totalCost = 0;
      for (const item of data.items) {
        if (item.cost && item.cost > 0) {
          totalCost += item.cost * item.quantity;
        }
      }

      if (totalCost > 0 && cogsAcc && inventoryAcc) {
        lines.push({ accountId: inventoryAcc.id, debit: totalCost, credit: 0, description: `Restocking for Return ${data.returnId}` });
        lines.push({ accountId: cogsAcc.id, debit: 0, credit: totalCost, description: `COGS reversal for Return ${data.returnId}` });
      }

      return this.createJournalEntry(tenantId, userId, {
        date: new Date(),
        description: `Automated Return Entry: ${data.returnId}`,
        type: 'adjustment',
        reference: `RETURN-${data.returnId}`,
        lines
      });
    } catch (error) {
      console.error('Failed to record automated return entry:', error);
    }
  }

  async recordExpenseAutomation(tenantId: string, userId: string | null, data: {
    expenseId: string,
    amount: number,
    description: string,
    categoryName?: string,
    paymentMethod?: string,
    date?: Date,
  }) {
    try {
      if (!data.amount || data.amount <= 0) return;

      await this.initializeCOA(tenantId);

      const accounts = await this.getAccounts(tenantId);
      const getAccount = (subtype: string) => accounts.find(a => a.subtype === subtype);
      const expenseAcc = this.selectExpenseAccount(
        accounts,
        data.categoryName,
        data.description,
      );

      const normalizedPayment = (data.paymentMethod || 'cash').toLowerCase();
      let paymentAcc = getAccount('cash');
      if (['mpesa', 'bank', 'card'].includes(normalizedPayment)) {
        paymentAcc = getAccount('bank') || paymentAcc;
      } else if (['credit', 'payable', 'on_credit'].includes(normalizedPayment)) {
        paymentAcc = getAccount('accounts_payable') || paymentAcc;
      }

      if (!expenseAcc || !paymentAcc) {
        console.warn('Accounting setup incomplete for expense posting', {
          tenantId,
          expenseId: data.expenseId,
        });
        return;
      }

      return this.createJournalEntry(tenantId, userId, {
        date: data.date || new Date(),
        description: `Automated Expense Entry: ${data.description}`,
        type: 'expense',
        reference: `EXPENSE-${data.expenseId}`,
        lines: [
          { accountId: expenseAcc.id, debit: data.amount, credit: 0, description: `Expense recorded (${data.categoryName || 'General'})` },
          { accountId: paymentAcc.id, debit: 0, credit: data.amount, description: `Expense payment (${normalizedPayment})` },
        ],
      });
    } catch (error) {
      console.error('Failed to record automated expense entry:', error);
    }
  }

  async recordCustomerPaymentAutomation(
    tenantId: string,
    userId: string | null,
    data: {
      creditId: string;
      amount: number;
      paymentMethod: string;
      paymentId?: string;
      date?: Date;
      notes?: string;
    },
  ) {
    try {
      if (!data.amount || data.amount <= 0) return;

      await this.initializeCOA(tenantId);

      const accounts = await this.getAccounts(tenantId);
      const getAccount = (subtype: string) =>
        accounts.find((a) => a.subtype === subtype);

      const receivableAcc = getAccount('accounts_receivable');

      const normalizedPayment = (data.paymentMethod || 'cash').toLowerCase();
      let paymentAcc = getAccount('cash');
      if (['mpesa', 'bank', 'card'].includes(normalizedPayment)) {
        paymentAcc = getAccount('bank') || paymentAcc;
      }

      if (!receivableAcc || !paymentAcc) {
        console.warn('Accounting setup incomplete for customer payment posting', {
          tenantId,
          creditId: data.creditId,
        });
        return;
      }

      return this.createJournalEntry(tenantId, userId, {
        date: data.date || new Date(),
        description: `Automated Credit Payment Entry${data.notes ? `: ${data.notes}` : ''}`,
        type: 'customer_payment',
        reference: data.paymentId
          ? `CREDIT:${data.creditId}:PAYMENT:${data.paymentId}`
          : `CREDIT-${data.creditId}`,
        lines: [
          {
            accountId: paymentAcc.id,
            debit: data.amount,
            credit: 0,
            description: `Customer payment received via ${normalizedPayment}`,
          },
          {
            accountId: receivableAcc.id,
            debit: 0,
            credit: data.amount,
            description: `Receivable settlement for credit ${data.creditId}`,
          },
        ],
      });
    } catch (error) {
      console.error('Failed to record customer payment entry:', error);
    }
  }

  async reclassifyExpenseEntries(tenantId: string, branchId?: string) {
    await this.initializeCOA(tenantId);

    const accounts = await this.getAccounts(tenantId);

    const journalEntries = await this.prisma.journalEntry.findMany({
      where: {
        tenantId,
        type: 'expense',
        reference: { startsWith: 'EXPENSE-' },
      },
      include: {
        ledgerEntries: {
          include: { account: true },
        },
      },
    });

    const scopedJournalEntries = branchId
      ? await this.filterJournalEntriesByBranch(tenantId, branchId, journalEntries)
      : journalEntries;

    const expenseIds = Array.from(
      new Set(
        scopedJournalEntries
          .map((je) => je.reference?.replace('EXPENSE-', ''))
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const expenses = expenseIds.length
      ? await this.prisma.expense.findMany({
          where: {
            tenantId,
            ...(branchId ? { branchId } : {}),
            id: { in: expenseIds },
          },
          include: { category: true },
        })
      : [];

    const expenseMap = new Map(expenses.map((expense) => [expense.id, expense]));

    let reclassifiedCount = 0;
    let unchangedCount = 0;
    let skippedNoExpense = 0;
    let skippedNoExpenseLine = 0;
    const movedToAccount: Record<string, number> = {};

    for (const journalEntry of scopedJournalEntries) {
      const expenseId = journalEntry.reference?.replace('EXPENSE-', '');
      if (!expenseId) {
        skippedNoExpense += 1;
        continue;
      }

      const expense = expenseMap.get(expenseId);
      if (!expense) {
        skippedNoExpense += 1;
        continue;
      }

      const targetExpenseAccount = this.selectExpenseAccount(
        accounts,
        expense.category?.name,
        expense.description,
      );

      if (!targetExpenseAccount) {
        skippedNoExpenseLine += 1;
        continue;
      }

      const expenseLine = journalEntry.ledgerEntries.find(
        (line) => line.account.type === 'expense' && line.debit > 0,
      );

      if (!expenseLine) {
        skippedNoExpenseLine += 1;
        continue;
      }

      if (expenseLine.accountId === targetExpenseAccount.id) {
        unchangedCount += 1;
        continue;
      }

      await this.prisma.ledgerEntry.update({
        where: { id: expenseLine.id },
        data: {
          accountId: targetExpenseAccount.id,
        },
      });

      reclassifiedCount += 1;
      const key = `${targetExpenseAccount.code} - ${targetExpenseAccount.name}`;
      movedToAccount[key] = (movedToAccount[key] || 0) + 1;
    }

    return {
      scanned: scopedJournalEntries.length,
      reclassifiedCount,
      unchangedCount,
      skippedNoExpense,
      skippedNoExpenseLine,
      movedToAccount,
    };
  }

  // --- Virtual Ledger Methods (Aggregated from other tables) ---

  // Aggregates all relevant transactions into unified ledger entries
  async getLedgerEntries(
    tenantId: string,
    branchId?: string,
  ): Promise<LedgerEntryType[]> {
    // Keep existing logic for transaction history view
    // ... (omitted for brevity, will merge in the next step or keep as is)
    const [
      sales,
      expenses,
      inventoryMovements,
      payments,
      journalEntries,
    ] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId, ...(branchId ? { branchId } : {}) },
        include: { SaleItem: { include: { product: true } }, User: true },
      }),
      this.prisma.expense.findMany({
        where: { tenantId, ...(branchId ? { branchId } : {}) },
        include: { user: true, branch: true, category: true },
      }),
      this.prisma.inventoryMovement.findMany({
        where: { tenantId, ...(branchId ? { branchId } : {}) },
        include: { product: true, branch: true },
      }),
      this.prisma.payment.findMany({ where: { tenantId } }),
      this.getJournalEntriesForReporting(tenantId, { branchId }),
    ]);

    // Normalize sales, expenses, inventory, payments (existing logic)
    const saleEntries: LedgerEntryType[] = sales.map((sale) => ({
      date: sale.createdAt,
      reference: `SALE-${sale.id}`,
      type: 'sale',
      description: `Sale${sale.SaleItem && sale.SaleItem.length > 0 ? `: ${sale.SaleItem.map(i => i.product?.name).filter(Boolean).join(', ')}` : ''}`,
      debit: 0,
      credit: sale.total,
      user: sale.User?.name || undefined,
      meta: { saleId: sale.id },
    }));

    const expenseEntries: LedgerEntryType[] = expenses.map((expense) => ({
      date: expense.createdAt,
      reference: `EXPENSE-${expense.id}`,
      type: 'expense',
      description: expense.description,
      debit: expense.amount,
      credit: 0,
      user: expense.user?.name || undefined,
      meta: { expenseId: expense.id, category: expense.category?.name },
    }));

    // Normalize manual journal entries
    const journalLedgerEntries: LedgerEntryType[] = journalEntries.flatMap(je => 
      je.ledgerEntries.map(le => ({
        date: je.date,
        reference: `JE-${je.id}`,
        type: je.type as any,
        description: je.description + (le.description ? ` (${le.description})` : ''),
        debit: le.debit,
        credit: le.credit,
        user: undefined,
        meta: { journalEntryId: je.id, account: le.account.name },
      }))
    );

    // Combine all
    let allEntries: LedgerEntryType[] = [
      ...saleEntries,
      ...expenseEntries,
      ...journalLedgerEntries,
    ];

    allEntries = allEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

    let balance = 0;
    allEntries = allEntries.map((entry) => {
      balance += (entry.credit || 0) - (entry.debit || 0);
      return { ...entry, balance };
    });

    return allEntries;
  }

  async syncLedger(tenantId: string, userId: string, branchId?: string) {
    await this.initializeCOA(tenantId);

    // 1. Sync Sales
    const sales = await this.prisma.sale.findMany({
      where: { tenantId, ...(branchId ? { branchId } : {}) },
      include: { SaleItem: { include: { product: true } } },
    });

    const syncedSales: string[] = [];
    for (const sale of sales) {
      const existing = await this.prisma.journalEntry.findFirst({
        where: { tenantId, reference: `SALE-${sale.id}` },
      });

      if (!existing) {
        await this.recordSaleAutomation(tenantId, userId, {
          saleId: sale.id,
          total: sale.total,
          paymentMethod: sale.paymentType,
          date: sale.createdAt,
          items: sale.SaleItem.map(item => ({
            productId: item.productId,
            name: item.product?.name || 'Unknown',
            quantity: item.quantity,
            price: item.price,
            cost: item.product?.cost,
          })),
        });
        syncedSales.push(sale.id);
      }
    }

    // 2. Sync Expenses
    const expenses = await this.prisma.expense.findMany({
      where: { tenantId, deletedAt: null, ...(branchId ? { branchId } : {}) },
      include: { category: true },
    });

    const syncedExpenses: string[] = [];
    for (const expense of expenses) {
      const existing = await this.prisma.journalEntry.findFirst({
        where: { tenantId, reference: `EXPENSE-${expense.id}` },
      });

      if (!existing) {
        await this.recordExpenseAutomation(tenantId, userId, {
          expenseId: expense.id,
          amount: expense.amount,
          description: expense.description,
          categoryName: expense.category?.name,
          paymentMethod: 'cash',
          date: expense.createdAt,
        });
        syncedExpenses.push(expense.id);
      }
    }
    
    const result = {
      syncedSalesCount: syncedSales.length,
      syncedSales: syncedSales,
      syncedExpensesCount: syncedExpenses.length,
      syncedExpenses,
    };

    this.realtimeGateway.emitLedgerUpdate({
      tenantId,
      type: 'ledger_synced',
      branchId,
      syncedSalesCount: syncedSales.length,
      syncedExpensesCount: syncedExpenses.length,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  async getAccountEntries(
    tenantId: string,
    accountId: string,
    branchId?: string,
    options?: {
      cursor?: string;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const requestedLimit = Number(options?.limit || 50);
    const limit = Math.min(Math.max(requestedLimit, 10), 200);

    const journalWhere: any = {
      tenantId,
    };

    if (options?.startDate || options?.endDate) {
      journalWhere.date = {};
      if (options.startDate) journalWhere.date.gte = options.startDate;
      if (options.endDate) {
        const endOfDay = new Date(options.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        journalWhere.date.lte = endOfDay;
      }
    }

    if (branchId) {
      journalWhere.reference = {
        startsWith: `BRANCH:${branchId}:`,
      };
    }

    const rows = await this.prisma.ledgerEntry.findMany({
      where: {
        accountId,
        journalEntry: journalWhere,
      },
      include: {
        journalEntry: {
          select: {
            id: true,
            date: true,
            reference: true,
            type: true,
            description: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: [
        { journalEntry: { date: 'desc' } },
        { id: 'desc' },
      ],
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const items = pageRows.map((row) => ({
      id: row.id,
      date: row.journalEntry.date,
      reference: row.journalEntry.reference || `JE-${row.journalEntryId}`,
      type: row.journalEntry.type,
      description:
        row.journalEntry.description +
        (row.description ? ` (${row.description})` : ''),
      debit: row.debit,
      credit: row.credit,
      user: row.journalEntry.user?.name,
      tag: row.tag || 'general',
      source: this.resolveLedgerSource(row.journalEntry.reference),
      meta: { journalEntryId: row.journalEntryId },
    }));

    return {
      items,
      hasMore,
      nextCursor: hasMore ? pageRows[pageRows.length - 1].id : null,
    };
  }

  async updateLedgerEntryTag(tenantId: string, entryId: string, tag: string) {
    // Only allow tags from a safe list or sanitize input as needed
    const allowedTags = ['general', 'tax', 'refund', 'adjustment', 'expense', 'income', 'other'];
    const safeTag = allowedTags.includes(tag) ? tag : 'other';

    const existingEntry = await this.prisma.ledgerEntry.findFirst({
      where: { id: entryId, journalEntry: { tenantId } },
      select: {
        id: true,
        accountId: true,
        journalEntryId: true,
        journalEntry: { select: { reference: true } },
      },
    });

    if (!existingEntry) {
      return { success: false, tag: safeTag };
    }

    await this.prisma.ledgerEntry.update({
      where: { id: existingEntry.id },
      data: { tag: safeTag },
    });

    this.realtimeGateway.emitLedgerUpdate({
      tenantId,
      type: 'ledger_tag_updated',
      entryId: existingEntry.id,
      journalEntryId: existingEntry.journalEntryId,
      accountId: existingEntry.accountId,
      branchId: this.extractBranchScope(existingEntry.journalEntry.reference),
      tag: safeTag,
      timestamp: new Date().toISOString(),
    });

    return { success: true, tag: safeTag };
  }
}
