import { Injectable } from '@nestjs/common';

@Injectable()
export class FormatterService {
  private asObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : null;
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private asString(value: unknown, fallback: string = ''): string {
    return typeof value === 'string' ? value : fallback;
  }

  private asNumber(value: unknown, fallback: number = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    if (typeof value === 'bigint') {
      return Number(value);
    }
    return fallback;
  }

  private asDateInput(value: unknown): string | number | Date | null {
    if (
      value instanceof Date ||
      typeof value === 'string' ||
      typeof value === 'number'
    ) {
      return value;
    }
    return null;
  }

  formatSalesData(sales: unknown, name: string): string {
    const salesObj = this.asObject(sales);
    if (!salesObj) return '';

    let p = `\nSALES PERFORMANCE DATA (${name}):\n`;
    p += `- Total Revenue: ${this.asNumber(salesObj.totalRevenue)}\n`;
    p += `- Transactions: ${this.asNumber(salesObj.totalSales)}\n`;
    p += `- Recent (30d): ${this.asNumber(salesObj.recentRevenue)}\n`;
    p += `- Today: ${this.asNumber(salesObj.todayRevenue)} (${this.asNumber(salesObj.todaySalesCount)} sales)\n`;
    p += `- Sales Trend: ${this.asString(salesObj.trend, 'stable')} (${this.asNumber(salesObj.trendPercentage)}%)\n`;

    const monthlySales = this.asArray(salesObj.monthlySales);
    if (monthlySales.length > 0) {
      p += `\nMONTHLY BREAKDOWN:\n`;
      monthlySales.slice(0, 6).forEach((monthEntry) => {
        const m = this.asObject(monthEntry) ?? {};
        p += `- ${this.asString(m.month, 'N/A')}: ${this.asNumber(m.revenue)} (${this.asNumber(m.count)} sales)\n`;
      });
    }
    return p;
  }

  formatInventoryData(inventory: unknown, name: string): string {
    const inventoryObj = this.asObject(inventory);
    if (!inventoryObj) return '';

    let p = `\nINVENTORY STATUS (${name}):\n`;
    p += `- Total Items: ${this.asNumber(inventoryObj.totalItems)}\n`;
    p += `- Low Stock: ${this.asNumber(inventoryObj.lowStockCount)}\n`;
    p += `- Out of Stock: ${this.asNumber(inventoryObj.outOfStockCount)}\n`;

    const items = this.asArray(inventoryObj.items);
    if (items.length > 0) {
      p += `\nStock Levels:\n`;
      items.slice(0, 10).forEach((item) => {
        const row = this.asObject(item) ?? {};
        const status = this.asString(row.status, 'ok');
        const emoji = status === 'out' ? '🔴' : status === 'low' ? '🟡' : '🟢';
        p += `${emoji} ${this.asString(row.name, 'Unknown')}: ${this.asNumber(row.quantity)} units (Status: ${status})\n`;
      });
    }
    return p;
  }

  formatProductData(products: unknown, name: string): string {
    const productsObj = this.asObject(products);
    if (!productsObj) return '';

    const allProducts = this.asArray(productsObj.allProducts);
    if (allProducts.length === 0) return '';

    let p = `\nPRODUCT CATALOG (${name}):\n`;
    p += `Total Products: ${this.asNumber(productsObj.totalProducts)}\n`;

    allProducts.forEach((product) => {
      const prod = this.asObject(product) ?? {};
      p += `- ${this.asString(prod.name, 'Unknown')} (SKU: ${this.asString(prod.sku, 'N/A')}, Price: ${this.asNumber(prod.price)})\n`;

      const variations = this.asArray(prod.variations);
      if (Boolean(prod.hasVariations) && variations.length > 0) {
        p += `  Variants:\n`;
        variations.forEach((variation) => {
          const v = this.asObject(variation) ?? {};
          const attrs =
            this.asString(v.attributes) ||
            JSON.stringify(v.attributes ?? {}, null, 0);
          p += `    * SKU: ${this.asString(v.sku, 'N/A')}, Stock: ${this.asNumber(v.stock)}, Price: ${this.asNumber(v.price) || this.asNumber(prod.price)}, Attrs: ${attrs}\n`;
        });
      }
    });

    const topProducts = this.asArray(productsObj.topProducts);
    if (topProducts.length > 0) {
      p += `\nTOP PERFORMERS:\n`;
      topProducts.slice(0, 5).forEach((product, i) => {
        const prod = this.asObject(product) ?? {};
        p += `${i + 1}. ${this.asString(prod.name, 'Unknown')} (Revenue: ${this.asNumber(prod.revenue)}, Sold: ${this.asNumber(prod.quantity)})\n`;
      });
    }
    return p;
  }

  formatCustomerData(customers: unknown, name: string): string {
    const customersObj = this.asObject(customers);
    if (!customersObj) return '';

    let p = `\nCUSTOMER INSIGHTS (${name}):\n`;
    p += `- Unique Customers: ${this.asNumber(customersObj.totalCustomers)}\n`;
    p += `- Retention: ${this.asNumber(customersObj.retentionRate)}%\n`;

    const topCustomers = this.asArray(customersObj.topCustomers);
    if (topCustomers.length > 0) {
      p += `\nTop Buyers:\n`;
      topCustomers.slice(0, 5).forEach((customer, i) => {
        const c = this.asObject(customer) ?? {};
        p += `${i + 1}. ${this.asString(c.name, 'Unknown')} (Revenue: ${this.asNumber(c.revenue)})\n`;
      });
    }
    return p;
  }

  formatCreditorData(creditors: unknown, name: string): string {
    const creditorsObj = this.asObject(creditors);
    if (!creditorsObj) return '';

    let p = `\nCREDITORS & SUPPLIERS (${name}):\n`;
    p += `- Active Suppliers: ${this.asNumber(creditorsObj.totalSuppliers)}\n`;
    p += `- Customers with Outstanding Credit: ${this.asNumber(creditorsObj.totalCreditCount)}\n`;
    p += `- Total Outstanding Balance Owed by Customers: ${this.asNumber(creditorsObj.totalOutstandingBalance)}\n`;
    p += `- Overdue Credits: ${this.asNumber(creditorsObj.overdueCount)}\n`;

    const suppliers = this.asArray(creditorsObj.suppliers);
    if (suppliers.length > 0) {
      p += `\nSupplier List:\n`;
      suppliers.slice(0, 15).forEach((supplier) => {
        const s = this.asObject(supplier) ?? {};
        const city = this.asString(s.city);
        const country = this.asString(s.country);
        p += `- ${this.asString(s.name, 'Unknown Supplier')}`;
        if (this.asString(s.contactName))
          p += ` (Contact: ${this.asString(s.contactName)})`;
        if (city || country)
          p += ` | Location: ${[city, country].filter(Boolean).join(', ')}`;
        if (this.asString(s.phone)) p += ` | Phone: ${this.asString(s.phone)}`;
        if (this.asString(s.email)) p += ` | Email: ${this.asString(s.email)}`;
        p += `\n`;
      });
    } else {
      p += `No active suppliers recorded.\n`;
    }

    const customerCredits = this.asArray(creditorsObj.customerCredits);
    if (customerCredits.length > 0) {
      p += `\nTop Outstanding Customer Credits:\n`;
      customerCredits.slice(0, 10).forEach((credit) => {
        const c = this.asObject(credit) ?? {};
        const status =
          this.asString(c.status) === 'overdue' ? '⚠️ OVERDUE' : '🔵 Active';
        p += `- ${this.asString(c.customerName, 'Unknown')}: Balance ${this.asNumber(c.balance)} / ${this.asNumber(c.totalAmount)} total [${status}]`;
        const dueDate = this.asDateInput(c.dueDate);
        if (dueDate) {
          p += ` | Due: ${new Date(dueDate).toLocaleDateString()}`;
        }
        p += `\n`;
      });
    }
    return p;
  }

  formatExpenseData(expenses: unknown, name: string): string {
    const expensesObj = this.asObject(expenses);
    if (!expensesObj) return '';

    let p = `\nBUSINESS EXPENSES (${name}):\n`;
    p += `- Total Expenses (Last 30 days): ${this.asNumber(expensesObj.totalLast30Days)}\n`;
    p += `- Total Expenses (Last 90 days): ${this.asNumber(expensesObj.totalLast90Days)}\n`;
    p += `- Expense Transactions: ${this.asNumber(expensesObj.expenseCount)}\n`;
    p += `- Average Expense: ${this.asNumber(expensesObj.averageExpense).toFixed(2)}\n`;
    p += `- Largest Single Expense: ${this.asNumber(expensesObj.largestExpense)}\n`;
    if (this.asNumber(expensesObj.recurringMonthlyTotal) > 0) {
      p += `- Monthly Recurring Commitments: ${this.asNumber(expensesObj.recurringMonthlyTotal)}\n`;
    }

    const categoryBreakdown = this.asArray(expensesObj.categoryBreakdown);
    if (categoryBreakdown.length > 0) {
      p += `\nExpense Breakdown by Category (last 90 days):\n`;
      categoryBreakdown.forEach((categoryEntry, i) => {
        const c = this.asObject(categoryEntry) ?? {};
        p += `${i + 1}. ${this.asString(c.category, 'Other')}: ${this.asNumber(c.total)} (${this.asNumber(c.count)} transactions)\n`;
      });
    }

    const recurringExpenses = this.asArray(expensesObj.recurringExpenses);
    if (recurringExpenses.length > 0) {
      p += `\nRecurring Expenses:\n`;
      recurringExpenses.slice(0, 5).forEach((expense) => {
        const e = this.asObject(expense) ?? {};
        p += `- ${this.asString(e.description, 'Recurring Expense')} (${this.asString(e.category, 'General')}): ${this.asNumber(e.amount)} / ${this.asString(e.frequency, 'monthly')}`;
        const nextDueDate = this.asDateInput(e.nextDueDate);
        if (nextDueDate) {
          p += ` | Next due: ${new Date(nextDueDate).toLocaleDateString()}`;
        }
        p += `\n`;
      });
    }
    return p;
  }

  formatPayrollData(payroll: unknown, name: string): string {
    const payrollObj = this.asObject(payroll);
    if (!payrollObj) return '';

    let p = `\nPAYROLL (${name}):\n`;
    p += `- Active Employees on Payroll: ${this.asNumber(payrollObj.employeeCount)}\n`;
    p += `- Total Active Salaries (per pay period): ${this.asNumber(payrollObj.totalActiveSalaries)}\n`;
    p += `- Estimated Monthly Payroll Cost: ${this.asNumber(payrollObj.monthlyPayrollTotal).toFixed(2)}\n`;

    const schemes = this.asArray(payrollObj.schemes);
    if (schemes.length > 0) {
      p += `\nSalary Schemes:\n`;
      schemes.slice(0, 15).forEach((scheme) => {
        const s = this.asObject(scheme) ?? {};
        p += `- ${this.asString(s.employeeName, 'Unknown')}: ${this.asNumber(s.salaryAmount)} / ${this.asString(s.frequency, 'monthly')}`;
        const nextDueDate = this.asDateInput(s.nextDueDate);
        if (nextDueDate) {
          p += ` | Next due: ${new Date(nextDueDate).toLocaleDateString()}`;
        }
        p += `\n`;
      });
    }
    return p;
  }

  formatRestaurantData(restaurant: unknown, name: string): string {
    const restaurantObj = this.asObject(restaurant);
    if (!restaurantObj) return '';

    let p = `\nRESTAURANT OPERATIONS (${name}):\n`;
    p += `- Total Tables: ${this.asNumber(restaurantObj.totalTables)}\n`;
    const tableStatusCounts = this.asObject(restaurantObj.tableStatusCounts) ?? {};
    Object.entries(tableStatusCounts).forEach(([status, count]) => {
      p += `  - ${status}: ${this.asNumber(count)}\n`;
    });
    p += `- Orders (Last 30 days): ${this.asNumber(restaurantObj.totalOrdersLast30Days)}\n`;
    p += `- Revenue (Last 30 days): ${this.asNumber(restaurantObj.revenueLast30Days)}\n`;

    const orderStatusCounts = this.asObject(restaurantObj.orderStatusCounts) ?? {};
    if (Object.keys(orderStatusCounts).length > 0) {
      p += `\nOrder Status Breakdown:\n`;
      Object.entries(orderStatusCounts).forEach(([status, count]) => {
        p += `- ${status}: ${this.asNumber(count)}\n`;
      });
    }

    const topItems = this.asArray(restaurantObj.topItems);
    if (topItems.length > 0) {
      p += `\nTop-Selling Dishes (Last 30 days):\n`;
      topItems.slice(0, 10).forEach((item, i) => {
        const it = this.asObject(item) ?? {};
        p += `${i + 1}. ${this.asString(it.product, 'Unknown')}: ${this.asNumber(it.quantitySold)} sold\n`;
      });
    }
    return p;
  }

  formatSalesTargetData(salesTargets: unknown, name: string): string {
    const targetsObj = this.asObject(salesTargets);
    if (!targetsObj) return '';

    const targets = this.asArray(targetsObj.targets);
    if (targets.length === 0) return '';

    let p = `\nSALES TARGETS (${name}):\n`;
    p += `- Actual Revenue This Month So Far: ${this.asNumber(targetsObj.actualThisMonth)}\n`;

    p += `\nTargets:\n`;
    targets.forEach((target) => {
      const t = this.asObject(target) ?? {};
      p += `- ${this.asString(t.name, 'Target')}: Monthly goal ${this.asNumber(t.monthly)}, achieved ${this.asNumber(t.progressPercent)}% so far (Daily: ${this.asNumber(t.daily)}, Weekly: ${this.asNumber(t.weekly)})\n`;
    });
    return p;
  }

  formatGeneralInfo(context: unknown): string {
    const contextObj = this.asObject(context) ?? {};
    let p = '';
    const tenantInfo = this.asObject(contextObj.tenantInfo);
    if (tenantInfo) {
      p += `\n=== BUSINESS INFORMATION ===\n`;
      p += `Name: ${this.asString(tenantInfo.name, 'Not specified')}\n`;
      p += `Type: ${this.asString(tenantInfo.businessType, 'Not specified')}\n`;
    }
    const branchInfo = this.asObject(contextObj.branchInfo);
    if (branchInfo) {
      p += `\nBranch: ${this.asString(branchInfo.name, 'Not specified')}\n`;
    }
    return p;
  }
}
