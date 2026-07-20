import { BadRequestException } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { PrismaService } from '../prisma.service';
import { RealtimeGateway } from '../realtime.gateway';
import { AuditLogService } from '../audit-log.service';
import { JournalEntryDto } from './accounting.types';

type PrismaMock = {
  account: {
    findMany: jest.Mock;
    createMany: jest.Mock;
    updateMany: jest.Mock;
    update: jest.Mock;
  };
  journalEntry: {
    create: jest.Mock;
    findMany: jest.Mock;
  };
  ledgerEntry: {
    count: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
  };
};

function createPrismaMock(): PrismaMock {
  return {
    account: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockResolvedValue({}),
    },
    journalEntry: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    ledgerEntry: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };
}

function createService(prisma: PrismaMock) {
  const realtimeGateway = { emitLedgerUpdate: jest.fn() };
  const auditLogService = { log: jest.fn() };
  const service = new LedgerService(
    prisma as unknown as PrismaService,
    realtimeGateway as unknown as RealtimeGateway,
    auditLogService as unknown as AuditLogService,
  );
  return { service, prisma, realtimeGateway, auditLogService };
}

function makeAccount(
  id: string,
  name: string,
  code: string,
  type: string,
  subtype?: string,
) {
  return { id, name, code, type, subtype, isSystem: false, isActive: true };
}

function makeLine(
  account: ReturnType<typeof makeAccount>,
  debit: number,
  credit: number,
) {
  return { accountId: account.id, debit, credit, account };
}

function makeJournalEntry(
  id: string,
  reference: string,
  date: Date,
  lines: ReturnType<typeof makeLine>[],
) {
  return { id, reference, date, ledgerEntries: lines };
}

describe('LedgerService.createJournalEntry', () => {
  const baseDto: JournalEntryDto = {
    date: new Date('2026-01-01'),
    description: 'Test entry',
    type: 'manual',
    reference: 'BRANCH:b1:MANUAL',
    lines: [
      { accountId: 'a1', debit: 100, credit: 0 },
      { accountId: 'a2', debit: 0, credit: 100 },
    ],
  };

  it('persists a balanced journal entry and emits a realtime update scoped to the branch', async () => {
    const { service, prisma, realtimeGateway } = createService(
      createPrismaMock(),
    );
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    const created = {
      id: 'je-1',
      reference: 'BRANCH:b1:MANUAL',
      ledgerEntries: [
        { accountId: 'a1', debit: 100, credit: 0 },
        { accountId: 'a2', debit: 0, credit: 100 },
      ],
    };
    prisma.journalEntry.create.mockResolvedValue(created);

    const result = await service.createJournalEntry(
      'tenant-1',
      'user-1',
      baseDto,
    );

    expect(result).toBe(created);
    expect(prisma.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          userId: 'user-1',
          reference: 'BRANCH:b1:MANUAL',
          ledgerEntries: {
            create: baseDto.lines.map((line) => ({
              accountId: line.accountId,
              debit: line.debit,
              credit: line.credit,
              description: undefined,
            })),
          },
        }),
      }),
    );
    expect(realtimeGateway.emitLedgerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        branchId: 'b1',
        journalEntryId: 'je-1',
      }),
    );
  });

  it('rejects an unbalanced journal entry without persisting it', async () => {
    const { service, prisma } = createService(createPrismaMock());
    const dto: JournalEntryDto = {
      ...baseDto,
      lines: [
        { accountId: 'a1', debit: 100, credit: 0 },
        { accountId: 'a2', debit: 0, credit: 50 },
      ],
    };

    await expect(
      service.createJournalEntry('tenant-1', 'user-1', dto),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });

  it('maps a "system" userId to null without looking up a user', async () => {
    const { service, prisma } = createService(createPrismaMock());
    prisma.journalEntry.create.mockResolvedValue({
      id: 'je-2',
      reference: 'MANUAL',
      ledgerEntries: [],
    });

    await service.createJournalEntry('tenant-1', 'system', baseDto);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: null }),
      }),
    );
  });

  it('falls back to a null userId when the actor no longer exists', async () => {
    const { service, prisma } = createService(createPrismaMock());
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.journalEntry.create.mockResolvedValue({
      id: 'je-3',
      reference: 'MANUAL',
      ledgerEntries: [],
    });

    await service.createJournalEntry('tenant-1', 'deleted-user', baseDto);

    expect(prisma.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: null }),
      }),
    );
  });
});

describe('LedgerService.initializeCOA', () => {
  it('creates every missing default account on first run', async () => {
    const { service, prisma } = createService(createPrismaMock());
    prisma.account.findMany
      .mockResolvedValueOnce([]) // existingAccounts
      .mockResolvedValueOnce([]); // nonViableSystemAccounts

    const defaults = (service as any).viableDefaultAccounts as Array<{
      code: string;
    }>;
    const result = await service.initializeCOA('tenant-1');

    expect(result.missingAccountsCreated).toBe(defaults.length);
    expect(prisma.account.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.account.createMany.mock.calls[0][0].data).toHaveLength(
      defaults.length,
    );
  });

  it('does not recreate accounts that already exist, but still refreshes them', async () => {
    const { service, prisma } = createService(createPrismaMock());
    const defaults = (service as any).viableDefaultAccounts as Array<{
      code: string;
    }>;
    prisma.account.findMany
      .mockResolvedValueOnce(
        defaults.map((a, i) => ({ id: `acc-${i}`, code: a.code, isSystem: true })),
      )
      .mockResolvedValueOnce([]);

    await service.initializeCOA('tenant-1');

    expect(prisma.account.createMany).not.toHaveBeenCalled();
    expect(prisma.account.updateMany).toHaveBeenCalledTimes(defaults.length);
  });

  it('deactivates a stale system account only when it has no posted ledger activity', async () => {
    const { service, prisma } = createService(createPrismaMock());
    prisma.account.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'acc-old' }]);
    prisma.ledgerEntry.count.mockResolvedValueOnce(0);

    await service.initializeCOA('tenant-1');

    expect(prisma.account.update).toHaveBeenCalledWith({
      where: { id: 'acc-old' },
      data: { isActive: false },
    });
  });

  it('never deactivates a stale system account that has posted ledger activity', async () => {
    const { service, prisma } = createService(createPrismaMock());
    prisma.account.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'acc-old' }]);
    prisma.ledgerEntry.count.mockResolvedValueOnce(3);

    await service.initializeCOA('tenant-1');

    expect(prisma.account.update).not.toHaveBeenCalled();
  });

  it('only logs an audit event when explicitly requested', async () => {
    const { service, prisma, auditLogService } = createService(
      createPrismaMock(),
    );
    prisma.account.findMany.mockResolvedValue([]);

    await service.initializeCOA('tenant-1');
    expect(auditLogService.log).not.toHaveBeenCalled();

    await service.initializeCOA('tenant-1', {
      logAuditEvent: true,
      actorUserId: 'user-1',
    });
    expect(auditLogService.log).toHaveBeenCalledWith(
      'user-1',
      'ledger_coa_initialized',
      expect.any(Object),
      undefined,
    );
  });
});

describe('LedgerService.getAccounts', () => {
  const cash = makeAccount('a1', 'Cash', '1000', 'asset', 'cash');
  const bank = makeAccount('a2', 'Bank', '1100', 'asset', 'bank');

  it('returns all active tenant accounts when no branch is specified', async () => {
    const { service, prisma } = createService(createPrismaMock());
    prisma.account.findMany.mockResolvedValue([cash, bank]);

    const result = await service.getAccounts('tenant-1');

    expect(result).toEqual([cash, bank]);
    expect(prisma.journalEntry.findMany).not.toHaveBeenCalled();
  });

  it('never mutates the chart of accounts as a side effect of a read (regression guard for B1)', async () => {
    const { service, prisma } = createService(createPrismaMock());
    prisma.account.findMany.mockResolvedValue([cash, bank]);

    await service.getAccounts('tenant-1', 'b1');

    expect(prisma.account.createMany).not.toHaveBeenCalled();
    expect(prisma.account.updateMany).not.toHaveBeenCalled();
  });

  it('scopes accounts to only those touched by the branch when the branch has posted activity', async () => {
    const { service, prisma } = createService(createPrismaMock());
    prisma.account.findMany.mockResolvedValue([cash, bank]);
    prisma.journalEntry.findMany.mockResolvedValue([
      makeJournalEntry('je-1', 'BRANCH:b1:MANUAL', new Date(), [
        makeLine(cash, 100, 0),
      ]),
      makeJournalEntry('je-2', 'BRANCH:b2:MANUAL', new Date(), [
        makeLine(bank, 50, 0),
      ]),
    ]);

    const result = await service.getAccounts('tenant-1', 'b1');

    expect(result).toEqual([cash]);
  });

  it('falls back to the full tenant account list when the branch has no posted activity', async () => {
    const { service, prisma } = createService(createPrismaMock());
    prisma.account.findMany.mockResolvedValue([cash, bank]);
    prisma.journalEntry.findMany.mockResolvedValue([]);

    const result = await service.getAccounts('tenant-1', 'b1');

    expect(result).toEqual([cash, bank]);
  });
});

describe('LedgerService branch reference helpers', () => {
  it('extracts the branch id from a branch-scoped reference', () => {
    const { service } = createService(createPrismaMock());
    expect((service as any).extractBranchScope('BRANCH:b1:SALE-123')).toBe(
      'b1',
    );
    expect((service as any).extractBranchScope('SALE-123')).toBeUndefined();
    expect((service as any).extractBranchScope(undefined)).toBeUndefined();
  });

  it('strips the branch scope prefix from a reference', () => {
    const { service } = createService(createPrismaMock());
    expect((service as any).stripBranchScope('BRANCH:b1:SALE-123')).toBe(
      'SALE-123',
    );
    expect((service as any).stripBranchScope('SALE-123')).toBe('SALE-123');
    expect((service as any).stripBranchScope(undefined)).toBe('');
  });
});

describe('LedgerService financial statements', () => {
  const cash = makeAccount('acc-cash', 'Cash', '1000', 'asset', 'cash');
  const payable = makeAccount(
    'acc-payable',
    'Accounts Payable',
    '2000',
    'liability',
  );
  const capital = makeAccount('acc-capital', 'Capital', '3000', 'equity');
  const revenue = makeAccount('acc-revenue', 'Sales Revenue', '4000', 'revenue');
  const expense = makeAccount('acc-expense', 'Operating Expense', '5000', 'expense');
  const accounts = [cash, payable, capital, revenue, expense];

  function buildJournalEntries() {
    return [
      // Sale: cash in, revenue recognized (tenant-wide).
      makeJournalEntry('je-1', 'MANUAL-1', new Date('2026-01-05'), [
        makeLine(cash, 1000, 0),
        makeLine(revenue, 0, 1000),
      ]),
      // Expense paid from cash (tenant-wide).
      makeJournalEntry('je-2', 'MANUAL-2', new Date('2026-01-06'), [
        makeLine(expense, 400, 0),
        makeLine(cash, 0, 400),
      ]),
      // A branch-b1 sale.
      makeJournalEntry('je-3', 'BRANCH:b1:MANUAL-3', new Date('2026-01-07'), [
        makeLine(cash, 200, 0),
        makeLine(revenue, 0, 200),
      ]),
      // Capital injection (tenant-wide).
      makeJournalEntry('je-4', 'MANUAL-4', new Date('2026-01-01'), [
        makeLine(cash, 500, 0),
        makeLine(capital, 0, 500),
      ]),
    ];
  }

  it('produces a balanced trial balance across all accounts', async () => {
    const { service, prisma } = createService(createPrismaMock());
    prisma.account.findMany.mockResolvedValue(accounts);
    prisma.journalEntry.findMany.mockResolvedValue(buildJournalEntries());

    const trialBalance = await service.getTrialBalance('tenant-1');

    expect(trialBalance.totalDebit).toBe(trialBalance.totalCredit);
    const cashRow = trialBalance.accounts.find((a) => a.id === 'acc-cash')!;
    expect(cashRow).toMatchObject({ debit: 1300, credit: 0, balance: 1300 });
    const revenueRow = trialBalance.accounts.find(
      (a) => a.id === 'acc-revenue',
    )!;
    expect(revenueRow).toMatchObject({ debit: 0, credit: 1200, balance: 1200 });
  });

  it('scopes the trial balance to a single branch and remains balanced', async () => {
    const { service, prisma } = createService(createPrismaMock());
    prisma.account.findMany.mockResolvedValue(accounts);
    prisma.journalEntry.findMany.mockResolvedValue(buildJournalEntries());

    const trialBalance = await service.getTrialBalance(
      'tenant-1',
      undefined,
      'b1',
    );

    expect(trialBalance.totalDebit).toBe(trialBalance.totalCredit);
    expect(trialBalance.totalDebit).toBe(200);
  });

  it('computes net profit as revenue minus expenses, scoped by branch', async () => {
    const { service, prisma } = createService(createPrismaMock());
    prisma.journalEntry.findMany.mockResolvedValue(buildJournalEntries());

    const fullPnl = await service.getProfitAndLoss('tenant-1');
    expect(fullPnl.totalRevenue).toBe(1200);
    expect(fullPnl.totalExpenses).toBe(400);
    expect(fullPnl.netProfit).toBe(800);

    const branchPnl = await service.getProfitAndLoss(
      'tenant-1',
      undefined,
      undefined,
      'b1',
    );
    expect(branchPnl.totalRevenue).toBe(200);
    expect(branchPnl.totalExpenses).toBe(0);
    expect(branchPnl.netProfit).toBe(200);
  });

  it('keeps the balance sheet identity (assets = liabilities + equity) intact', async () => {
    const { service, prisma } = createService(createPrismaMock());
    prisma.account.findMany.mockResolvedValue(accounts);
    prisma.journalEntry.findMany.mockResolvedValue(buildJournalEntries());

    const balanceSheet = await service.getBalanceSheet('tenant-1');

    expect(balanceSheet.totalAssets).toBe(
      balanceSheet.totalLiabilities + balanceSheet.totalEquity,
    );
    expect(balanceSheet.totalAssets).toBe(1300);
  });
});

describe('LedgerService.updateLedgerEntryTag', () => {
  it('persists a whitelisted tag as-is', async () => {
    const { service, prisma } = createService(createPrismaMock());
    prisma.ledgerEntry.findFirst.mockResolvedValue({
      id: 'le-1',
      accountId: 'a1',
      journalEntryId: 'je-1',
      journalEntry: { reference: 'MANUAL' },
    });

    await service.updateLedgerEntryTag('tenant-1', 'le-1', 'tax');

    expect(prisma.ledgerEntry.update).toHaveBeenCalledWith({
      where: { id: 'le-1' },
      data: { tag: 'tax' },
    });
  });

  it('coerces an unrecognized tag to "other"', async () => {
    const { service, prisma } = createService(createPrismaMock());
    prisma.ledgerEntry.findFirst.mockResolvedValue({
      id: 'le-1',
      accountId: 'a1',
      journalEntryId: 'je-1',
      journalEntry: { reference: 'MANUAL' },
    });

    await service.updateLedgerEntryTag('tenant-1', 'le-1', 'not-a-real-tag');

    expect(prisma.ledgerEntry.update).toHaveBeenCalledWith({
      where: { id: 'le-1' },
      data: { tag: 'other' },
    });
  });

  it('returns a non-mutating failure result when the entry does not belong to the tenant', async () => {
    const { service, prisma } = createService(createPrismaMock());
    prisma.ledgerEntry.findFirst.mockResolvedValue(null);

    const result = await service.updateLedgerEntryTag(
      'tenant-1',
      'missing-entry',
      'tax',
    );

    expect(result).toEqual({ success: false, tag: 'tax' });
    expect(prisma.ledgerEntry.update).not.toHaveBeenCalled();
  });
});
