import { Injectable } from '@nestjs/common';

@Injectable()
export class FormatterService {
  formatSalesData(sales: any, name: string): string {
    if (!sales) return '';
    let p = `\nSALES PERFORMANCE DATA (${name}):\n`;
    p += `- Total Revenue: ${sales.totalRevenue || 0}\n`;
    p += `- Transactions: ${sales.totalSales || 0}\n`;
    p += `- Recent (30d): ${sales.recentRevenue || 0}\n`;
    p += `- Today: ${sales.todayRevenue || 0} (${sales.todaySalesCount || 0} sales)\n`;
    p += `- Sales Trend: ${sales.trend || 'stable'} (${sales.trendPercentage || 0}%)\n`;
    
    if (sales.monthlySales?.length > 0) {
      p += `\nMONTHLY BREAKDOWN:\n`;
      sales.monthlySales.slice(0, 6).forEach((m: any) => {
        p += `- ${m.month}: ${m.revenue} (${m.count} sales)\n`;
      });
    }
    return p;
  }

  formatInventoryData(inventory: any, name: string): string {
    if (!inventory) return '';
    let p = `\nINVENTORY STATUS (${name}):\n`;
    p += `- Total Items: ${inventory.totalItems || 0}\n`;
    p += `- Low Stock: ${inventory.lowStockCount || 0}\n`;
    p += `- Out of Stock: ${inventory.outOfStockCount || 0}\n`;
    
    if (inventory.items?.length > 0) {
      p += `\nStock Levels:\n`;
      inventory.items.slice(0, 10).forEach((item: any) => {
        const emoji = item.status === 'out' ? '🔴' : item.status === 'low' ? '🟡' : '🟢';
        p += `${emoji} ${item.name}: ${item.quantity} units (Status: ${item.status})\n`;
      });
    }
    return p;
  }

  formatProductData(products: any, name: string): string {
    if (!products || !products.allProducts) return '';
    let p = `\nPRODUCT CATALOG (${name}):\n`;
    p += `Total Products: ${products.totalProducts || 0}\n`;
    
    products.allProducts.forEach((prod: any) => {
      p += `- ${prod.name} (SKU: ${prod.sku}, Price: ${prod.price})\n`;
      if (prod.hasVariations && prod.variations?.length > 0) {
        p += `  Variants:\n`;
        prod.variations.forEach((v: any) => {
          const attrs = typeof v.attributes === 'string' ? v.attributes : JSON.stringify(v.attributes);
          p += `    * SKU: ${v.sku}, Stock: ${v.stock}, Price: ${v.price || prod.price}, Attrs: ${attrs}\n`;
        });
      }
    });

    if (products.topProducts?.length > 0) {
      p += `\nTOP PERFORMERS:\n`;
      products.topProducts.slice(0, 5).forEach((prod: any, i: number) => {
        p += `${i + 1}. ${prod.name} (Revenue: ${prod.revenue}, Sold: ${prod.quantity})\n`;
      });
    }
    return p;
  }

  formatCustomerData(customers: any, name: string): string {
    if (!customers) return '';
    let p = `\nCUSTOMER INSIGHTS:\n`;
    p += `- Unique Customers: ${customers.totalCustomers || 0}\n`;
    p += `- Retention: ${customers.retentionRate || 0}%\n`;
    
    if (customers.topCustomers?.length > 0) {
      p += `\nTop Buyers:\n`;
      customers.topCustomers.slice(0, 5).forEach((c: any, i: number) => {
        p += `${i + 1}. ${c.name} (Revenue: ${c.revenue})\n`;
      });
    }
    return p;
  }

  formatCreditorData(creditors: any, name: string): string {
    if (!creditors) return '';
    let p = `\nCREDITORS & SUPPLIERS (${name}):\n`;
    p += `- Active Suppliers: ${creditors.totalSuppliers || 0}\n`;
    p += `- Customers with Outstanding Credit: ${creditors.totalCreditCount || 0}\n`;
    p += `- Total Outstanding Balance Owed by Customers: ${creditors.totalOutstandingBalance || 0}\n`;
    p += `- Overdue Credits: ${creditors.overdueCount || 0}\n`;

    if (creditors.suppliers?.length > 0) {
      p += `\nSupplier List:\n`;
      creditors.suppliers.slice(0, 15).forEach((s: any) => {
        p += `- ${s.name}`;
        if (s.contactName) p += ` (Contact: ${s.contactName})`;
        if (s.city || s.country) p += ` | Location: ${[s.city, s.country].filter(Boolean).join(', ')}`;
        if (s.phone) p += ` | Phone: ${s.phone}`;
        if (s.email) p += ` | Email: ${s.email}`;
        p += `\n`;
      });
    } else {
      p += `No active suppliers recorded.\n`;
    }

    if (creditors.customerCredits?.length > 0) {
      p += `\nTop Outstanding Customer Credits:\n`;
      creditors.customerCredits.slice(0, 10).forEach((c: any) => {
        const status = c.status === 'overdue' ? '⚠️ OVERDUE' : '🔵 Active';
        p += `- ${c.customerName || 'Unknown'}: Balance ${c.balance} / ${c.totalAmount} total [${status}]`;
        if (c.dueDate) p += ` | Due: ${new Date(c.dueDate).toLocaleDateString()}`;
        p += `\n`;
      });
    }
    return p;
  }

  formatExpenseData(expenses: any, name: string): string {
    if (!expenses) return '';
    let p = `\nBUSINESS EXPENSES (${name}):\n`;
    p += `- Total Expenses (Last 30 days): ${expenses.totalLast30Days || 0}\n`;
    p += `- Total Expenses (Last 90 days): ${expenses.totalLast90Days || 0}\n`;
    p += `- Expense Transactions: ${expenses.expenseCount || 0}\n`;
    p += `- Average Expense: ${expenses.averageExpense?.toFixed(2) || 0}\n`;
    p += `- Largest Single Expense: ${expenses.largestExpense || 0}\n`;
    if (expenses.recurringMonthlyTotal > 0) {
      p += `- Monthly Recurring Commitments: ${expenses.recurringMonthlyTotal}\n`;
    }

    if (expenses.categoryBreakdown?.length > 0) {
      p += `\nExpense Breakdown by Category (last 90 days):\n`;
      expenses.categoryBreakdown.forEach((c: any, i: number) => {
        p += `${i + 1}. ${c.category}: ${c.total} (${c.count} transactions)\n`;
      });
    }

    if (expenses.recurringExpenses?.length > 0) {
      p += `\nRecurring Expenses:\n`;
      expenses.recurringExpenses.slice(0, 5).forEach((e: any) => {
        p += `- ${e.description} (${e.category}): ${e.amount} / ${e.frequency}`;
        if (e.nextDueDate) p += ` | Next due: ${new Date(e.nextDueDate).toLocaleDateString()}`;
        p += `\n`;
      });
    }
    return p;
  }

  formatGeneralInfo(context: any): string {
    let p = '';
    if (context.tenantInfo) {
      p += `\n=== BUSINESS INFORMATION ===\n`;
      p += `Name: ${context.tenantInfo.name || 'Not specified'}\n`;
      p += `Type: ${context.tenantInfo.businessType || 'Not specified'}\n`;
    }
    if (context.branchInfo) {
      p += `\nBranch: ${context.branchInfo.name || 'Not specified'}\n`;
    }
    return p;
  }
}
