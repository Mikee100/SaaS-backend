export interface Account {
  id: string;
  name: string;
  code: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subtype?: string;
  balance: number;
}

export interface JournalEntryDto {
  date: Date;
  description: string;
  type:
    | 'manual'
    | 'sale'
    | 'expense'
    | 'capital_injection'
    | 'adjustment'
    | 'customer_payment';
  reference?: string;
  lines: LedgerLineDto[];
}

export interface LedgerLineDto {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface TrialBalance {
  accounts: {
    id: string;
    name: string;
    code: string;
    type: string;
    subtype?: string;
    debit: number;
    credit: number;
    balance: number;
  }[];
  totalDebit: number;
  totalCredit: number;
}

export interface ProfitAndLoss {
  revenue: { name: string; amount: number }[];
  cogs: { name: string; amount: number }[];
  expenses: { name: string; amount: number }[];
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
}

export interface BalanceSheet {
  assets: { name: string; amount: number }[];
  liabilities: { name: string; amount: number }[];
  equity: { name: string; amount: number }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}
