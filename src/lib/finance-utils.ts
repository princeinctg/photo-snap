import { roundToTwoDecimals } from "./utils";
import type { Invoice, Payment, Income, Expense } from "@/types";

/**
 * Calculates line items subtotal, tax, discount, and total
 */
export function calculateInvoiceTotals(
  items: Array<{ quantity: number; unitPrice: number }>,
  discountAmount: number = 0,
  taxRatePercent: number = 0
) {
  const subtotal = items.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return acc + qty * price;
  }, 0);

  const cleanSubtotal = roundToTwoDecimals(subtotal);
  const cleanDiscount = Math.min(cleanSubtotal, roundToTwoDecimals(discountAmount || 0));
  const afterDiscount = Math.max(0, cleanSubtotal - cleanDiscount);
  
  const taxAmount = roundToTwoDecimals((afterDiscount * (taxRatePercent || 0)) / 100);
  const totalAmount = roundToTwoDecimals(afterDiscount + taxAmount);

  return {
    subtotal: cleanSubtotal,
    discount: cleanDiscount,
    taxRate: taxRatePercent,
    taxAmount,
    totalAmount,
  };
}

/**
 * Calculates financial metrics strictly avoiding double counting:
 * - Recognized Income = Cash actually collected (from Income records or Payments)
 * - Expenses = All documented business expenditures
 * - Net Profit = Recognized Income - Total Expenses
 * - Outstanding Receivables = Sum of unpaid balances of active/unpaid/partially_paid invoices
 */
export function calculateStudioFinancials(
  incomes: Income[],
  expenses: Expense[],
  invoices: Invoice[]
) {
  // 1. Total recognized income
  const totalRecognizedIncome = incomes.reduce((acc, inc) => {
    return acc + (Number(inc.amount) || 0);
  }, 0);

  // 2. Total expenses
  const totalExpenses = expenses.reduce((acc, exp) => {
    return acc + (Number(exp.amount) || 0);
  }, 0);

  // 3. Outstanding receivables (Unpaid invoice balances, excluding cancelled & draft)
  const outstandingReceivables = invoices.reduce((acc, inv) => {
    if (inv.status === 'cancelled' || inv.status === 'draft') return acc;
    return acc + Math.max(0, Number(inv.balanceDue) || 0);
  }, 0);

  // 4. Net Profit = Income - Expenses
  const netProfit = roundToTwoDecimals(totalRecognizedIncome - totalExpenses);

  return {
    totalRevenue: roundToTwoDecimals(totalRecognizedIncome),
    totalExpenses: roundToTwoDecimals(totalExpenses),
    netProfit,
    outstandingReceivables: roundToTwoDecimals(outstandingReceivables),
  };
}

/**
 * Formats data for monthly income vs expense bar chart and profit trend
 */
export function generateMonthlyFinancialTrends(
  incomes: Income[],
  expenses: Expense[],
  monthsCount: number = 6
) {
  const monthsMap = new Map<string, { income: number; expenses: number }>();

  // Initialize recent months in chronological order
  const now = new Date();
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    monthsMap.set(key, { income: 0, expenses: 0 });
  }

  incomes.forEach((inc) => {
    if (!inc.date) return;
    const d = new Date(inc.date);
    const key = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    if (monthsMap.has(key)) {
      const entry = monthsMap.get(key)!;
      entry.income += Number(inc.amount) || 0;
    }
  });

  expenses.forEach((exp) => {
    if (!exp.date) return;
    const d = new Date(exp.date);
    const key = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    if (monthsMap.has(key)) {
      const entry = monthsMap.get(key)!;
      entry.expenses += Number(exp.amount) || 0;
    }
  });

  return Array.from(monthsMap.entries()).map(([month, data]) => {
    const inc = roundToTwoDecimals(data.income);
    const exp = roundToTwoDecimals(data.expenses);
    return {
      month,
      income: inc,
      expenses: exp,
      netProfit: roundToTwoDecimals(inc - exp),
    };
  });
}
