import Decimal from 'decimal.js';
import {
  QuotationItemInput,
  CalculatedQuotationItem,
  QuotationSummary,
  TaxBracketBreakdown,
} from './types';

// Set decimal precision & rounding mode (HALF_UP is standard for finance/currency)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Calculates line items and totals with zero floating-point arithmetic errors.
 */
export function calculateItemRow(
  item: QuotationItemInput,
  fallbackId = '',
  decimals = 0
): CalculatedQuotationItem {
  const qty = new Decimal(item.quantity || 0);
  const price = new Decimal(item.unitPrice || 0);
  const discountPercent = new Decimal(item.discount || 0);
  const vatRate = new Decimal(item.vatRate || 0);

  // Line Subtotal = qty * price
  const subtotal = qty.mul(price);

  // Discount Amount = subtotal * (discountPercent / 100)
  const discountAmount = subtotal
    .mul(discountPercent.div(100))
    .toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);

  // Taxable Amount = max(0, subtotal - discountAmount)
  const taxableAmount = Decimal.max(0, subtotal.minus(discountAmount));

  // VAT Amount = taxableAmount * (vatRate / 100)
  const vatAmount = taxableAmount
    .mul(vatRate.div(100))
    .toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);

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
    subtotal: subtotal.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber(),
    taxableAmount: taxableAmount.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber(),
    vatAmount: vatAmount.toNumber(),
    total: total.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber(),
    sortOrder: item.sortOrder ?? 0,
  };
}

/**
 * Calculates complete quotation summary from list of item inputs, previous debt, and payments.
 * Groups line items by VAT rate bracket for compliance and audit consistency.
 */
export function calculateQuotationTotals(
  items: QuotationItemInput[],
  previousDebt = 0,
  totalPaid = 0,
  decimals = 0
): {
  calculatedItems: CalculatedQuotationItem[];
  summary: QuotationSummary;
} {
  let subtotalAcc = new Decimal(0);
  let discountAcc = new Decimal(0);
  let taxableAcc = new Decimal(0);
  let vatAcc = new Decimal(0);
  let orderTotalAcc = new Decimal(0);
  const debt = new Decimal(previousDebt || 0);
  const paid = new Decimal(totalPaid || 0);

  // Map to accumulate taxable base per VAT bracket
  const bracketTaxableBases = new Map<number, Decimal>();

  const calculatedItems = (items || []).map((item, index) => {
    const calculated = calculateItemRow(item, `item_${index}`, decimals);
    subtotalAcc = subtotalAcc.plus(calculated.subtotal);
    discountAcc = discountAcc.plus(calculated.discountAmount || 0);
    taxableAcc = taxableAcc.plus(calculated.taxableAmount);
    vatAcc = vatAcc.plus(calculated.vatAmount);
    orderTotalAcc = orderTotalAcc.plus(calculated.total);

    // Grouping taxable bases by VAT bracket
    const rate = calculated.vatRate;
    const currentBase = bracketTaxableBases.get(rate) || new Decimal(0);
    bracketTaxableBases.set(rate, currentBase.plus(calculated.taxableAmount));

    return calculated;
  });

  // Calculate breakdown per VAT bracket
  const taxBreakdown: TaxBracketBreakdown[] = Array.from(bracketTaxableBases.entries())
    .sort(([a], [b]) => a - b)
    .map(([vatRate, taxableBaseDec]) => {
      const vatAmountDec = taxableBaseDec
        .mul(new Decimal(vatRate).div(100))
        .toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
      return {
        vatRate,
        taxableBase: taxableBaseDec.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber(),
        vatAmount: vatAmountDec.toNumber(),
      };
    });

  const grandTotalAcc = orderTotalAcc.plus(debt);
  const balanceDueAcc = Decimal.max(0, grandTotalAcc.minus(paid));

  return {
    calculatedItems,
    summary: {
      subtotal: subtotalAcc.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber(),
      discountTotal: discountAcc.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber(),
      taxableTotal: taxableAcc.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber(),
      vatTotal: vatAcc.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber(),
      previousDebt: debt.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber(),
      grandTotal: grandTotalAcc.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber(),
      balanceDue: balanceDueAcc.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber(),
      taxBreakdown,
    },
  };
}
