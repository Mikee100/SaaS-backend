// Unified Ledger Entry Type
export type LedgerEntryType =
  | 'sale'
  | 'expense'
  | 'stock_addition'
  | 'refund'
  | 'customer_payment'
  | 'capital_injection'
  | 'capital_withdrawal'
  | 'adjustment'
  | 'manual';

export interface LedgerEntry {
  date: Date;
  reference: string;
  type: LedgerEntryType;
  description: string;
  product?: string;
  variation?: string;
  debit: number; // Money out
  credit: number; // Money in
  balance?: number; // Running balance (optional, can be calculated)
  user?: string;
  meta?: Record<string, any>; // For extra details (e.g., saleId, expenseId, etc.)
}
