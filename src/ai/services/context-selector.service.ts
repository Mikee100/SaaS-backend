import { Injectable } from '@nestjs/common';

export interface ContextNeeds {
  needsSales: boolean;
  needsInventory: boolean;
  needsProducts: boolean;
  needsCustomers: boolean;
  needsCreditors: boolean;
  needsExpenses: boolean;
  period?: 'today' | 'week' | 'month' | 'year' | 'all';
}

const SALES_KEYWORDS = [
  'sale', 'sales', 'revenue', 'income', 'earn', 'profit', 'turnover',
  'transaction', 'order', 'sold', 'sell', 'money', 'cash', 'payment',
  'receipt', 'invoice', 'billing', 'total', 'amount', 'performance',
  'trend', 'growth', 'report', 'export', 'download', 'chart', 'graph',
  'visual', 'comparison', 'compare', 'vs', 'versus', 'best',
];

const INVENTORY_KEYWORDS = [
  'inventory', 'stock', 'restock', 'low stock', 'out of stock', 'quantity',
  'units', 'warehouse', 'storage', 'available', 'level', 'replenish',
  'shortage', 'overstock', 'count',
];

const PRODUCT_KEYWORDS = [
  'product', 'item', 'sku', 'variant', 'variation', 'catalog', 'price',
  'category', 'brand', 'model', 'color', 'size', 'type', 'collection',
];

const CUSTOMER_KEYWORDS = [
  'customer', 'client', 'buyer', 'retention', 'loyalty', 'user',
  'member', 'account', 'returning', 'new customer', 'top buyer',
];

const CREDITOR_KEYWORDS = [
  'creditor', 'creditors', 'supplier', 'suppliers', 'vendor', 'vendors',
  'accounts payable', 'payable', 'owe', 'owing', 'debt', 'debtor', 'debtors',
  'credit', 'credits', 'outstanding', 'overdue', 'loan', 'payoff',
  'who do we owe', 'who owes', 'money owed', 'unpaid',
];

const EXPENSE_KEYWORDS = [
  'expense', 'expenses', 'cost', 'costs', 'spending', 'overhead',
  'salary', 'salaries', 'payroll', 'rent', 'utilities', 'bills',
  'operational', 'outgoing', 'outgoings', 'spend', 'expenditure',
  'recurring', 'one-time', 'budget',
];

const PERIOD_MAP: Record<string, ContextNeeds['period']> = {
  today: 'today',
  'this week': 'week',
  weekly: 'week',
  'this month': 'month',
  monthly: 'month',
  month: 'month',
  'this year': 'year',
  yearly: 'year',
  annual: 'year',
  all: 'all',
  everything: 'all',
};

@Injectable()
export class ContextSelectorService {
  /**
   * Classify message intent to determine which data slices to fetch.
   * Falls back to a summary-only context if no domain keywords match.
   * 
   * @param message - The user's current message
   * @param lastAiResponse - Optional last AI response for follow-up intent carryover
   */
  classify(message: string, lastAiResponse?: string): ContextNeeds {
    const lower = message.toLowerCase();

    const needs: ContextNeeds = {
      needsSales: this.matchesKeywords(lower, SALES_KEYWORDS),
      needsInventory: this.matchesKeywords(lower, INVENTORY_KEYWORDS),
      needsProducts: this.matchesKeywords(lower, PRODUCT_KEYWORDS),
      needsCustomers: this.matchesKeywords(lower, CUSTOMER_KEYWORDS),
      needsCreditors: this.matchesKeywords(lower, CREDITOR_KEYWORDS),
      needsExpenses: this.matchesKeywords(lower, EXPENSE_KEYWORDS),
    };

    // Handle affirmative follow-ups: carry over context from last AI response
    const isAffirmative = ['yes', 'yeah', 'do it', 'ok', 'okay', 'sure', 'please', 'go ahead'].some(
      (p) => lower === p || lower.startsWith(p + ' '),
    );

    if (isAffirmative && lastAiResponse && !this.hasAnyNeed(needs)) {
      const lastLower = lastAiResponse.toLowerCase();
      needs.needsSales = this.matchesKeywords(lastLower, SALES_KEYWORDS);
      needs.needsInventory = this.matchesKeywords(lastLower, INVENTORY_KEYWORDS);
      needs.needsProducts = this.matchesKeywords(lastLower, PRODUCT_KEYWORDS);
      needs.needsCustomers = this.matchesKeywords(lastLower, CUSTOMER_KEYWORDS);
      needs.needsCreditors = this.matchesKeywords(lastLower, CREDITOR_KEYWORDS);
      needs.needsExpenses = this.matchesKeywords(lastLower, EXPENSE_KEYWORDS);
    }

    // Inventory questions often need product context too
    if (needs.needsInventory) {
      needs.needsProducts = true;
    }

    // Detect time period
    needs.period = this.detectPeriod(lower);

    return needs;
  }

  private matchesKeywords(lower: string, keywords: string[]): boolean {
    return keywords.some((kw) => lower.includes(kw));
  }

  private hasAnyNeed(needs: ContextNeeds): boolean {
    return needs.needsSales || needs.needsInventory || needs.needsProducts || needs.needsCustomers || needs.needsCreditors || needs.needsExpenses;
  }

  private detectPeriod(lower: string): ContextNeeds['period'] | undefined {
    for (const [phrase, period] of Object.entries(PERIOD_MAP)) {
      if (lower.includes(phrase)) return period;
    }
    return undefined;
  }
}
