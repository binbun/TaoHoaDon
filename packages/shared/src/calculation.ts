import Decimal from 'decimal.js';
import { QuotationItemInput, CalculatedQuotationItem, QuotationSummary } from './types';

// Set decimal precision & rounding mode (HALF_UP is standard for finance/currency)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Calculates line items and totals with zero floating-point arithmetic errors.
 */
export function calculateItemRow(item: QuotationItemInput, fallbackId = ''): CalculatedQuotationItem {
  const qty = new Decimal(item.quantity || 0);
  const price = new Decimal(item.unitPrice || 0);
  const discountPercent = new Decimal(item.discount || 0);
  const vatRate = new Decimal(item.vatRate || 0);

  // Line Subtotal = qty * price
  const subtotal = qty.mul(price);

  // Discount Amount = subtotal * (discountPercent / 100)
  const discountAmount = subtotal.mul(discountPercent.div(100)).round();

  // Taxable Amount = max(0, subtotal - discountAmount)
  const taxableAmount = Decimal.max(0, subtotal.minus(discountAmount));

  // VAT Amount = taxableAmount * (vatRate / 100)
  const vatAmount = taxableAmount.mul(vatRate.div(100)).round();

  // Line Total = taxableAmount + vatAmount
  const total = taxableAmount.plus(vatAmount);

  return {
    ...item,
    id: item.id || fallbackId || `item_${Math.random().toString(36).substr(2, 9)}`,
    quantity: qty.toNumber(),
    unitPrice: price.toNumber(),
    discount: discountPercent.toNumber(),
    discountAmount: discountAmount.toNumber(),
    vatRate: vatRate.toNumber(),
    subtotal: subtotal.round().toNumber(),
    taxableAmount: taxableAmount.round().toNumber(),
    vatAmount: vatAmount.toNumber(),
    total: total.round().toNumber(),
    sortOrder: item.sortOrder ?? 0,
  };
}

/**
 * Calculates complete quotation summary from list of item inputs and previous debt.
 */
export function calculateQuotationTotals(items: QuotationItemInput[], previousDebt = 0): {
  calculatedItems: CalculatedQuotationItem[];
  summary: QuotationSummary;
} {
  let subtotalAcc = new Decimal(0);
  let discountAcc = new Decimal(0);
  let taxableAcc = new Decimal(0);
  let vatAcc = new Decimal(0);
  let orderTotalAcc = new Decimal(0);
  const debt = new Decimal(previousDebt || 0);

  const calculatedItems = (items || []).map((item, index) => {
    const calculated = calculateItemRow(item, `item_${index}`);
    subtotalAcc = subtotalAcc.plus(calculated.subtotal);
    discountAcc = discountAcc.plus(calculated.discountAmount || 0);
    taxableAcc = taxableAcc.plus(calculated.taxableAmount);
    vatAcc = vatAcc.plus(calculated.vatAmount);
    orderTotalAcc = orderTotalAcc.plus(calculated.total);
    return calculated;
  });

  const grandTotalAcc = orderTotalAcc.plus(debt);

  return {
    calculatedItems,
    summary: {
      subtotal: subtotalAcc.round().toNumber(),
      discountTotal: discountAcc.round().toNumber(),
      taxableTotal: taxableAcc.round().toNumber(),
      vatTotal: vatAcc.round().toNumber(),
      previousDebt: debt.round().toNumber(),
      grandTotal: grandTotalAcc.round().toNumber(),
    },
  };
}
