import { describe, it, expect } from 'vitest';
import {
  calculateItemRow,
  calculateQuotationTotals,
  QuotationItemInput,
} from '../../packages/shared/src/calculation';

describe('Calculation Engine - Quotation & VAT & Discount', () => {
  it('should calculate accurately with quantity = 1, discount = 0, VAT = 8%', () => {
    const item: QuotationItemInput = {
      productNameSnapshot: 'TOP JOB TRIAL',
      unit: 'Gói',
      quantity: 1,
      unitPrice: 2887500,
      discount: 0,
      vatRate: 8,
      sortOrder: 0,
    };

    const res = calculateItemRow(item);
    expect(res.subtotal).toBe(2887500);
    expect(res.taxableAmount).toBe(2887500);
    // 2,887,500 * 8% = 231,000
    expect(res.vatAmount).toBe(231000);
    // 2,887,500 + 231,000 = 3,118,500
    expect(res.total).toBe(3118500);
  });

  it('should calculate accurately with quantity = 10 and discount = 10%', () => {
    const item: QuotationItemInput = {
      productNameSnapshot: 'TOP PRO TRIAL',
      unit: 'Gói',
      quantity: 10,
      unitPrice: 2448000,
      discount: 10, // 10% discount
      vatRate: 8,
      sortOrder: 0,
    };

    const res = calculateItemRow(item);
    // Subtotal: 10 * 2,448,000 = 24,480,000
    expect(res.subtotal).toBe(24480000);
    // Discount amount: 24,480,000 * 10% = 2,448,000
    expect(res.discountAmount).toBe(2448000);
    // Taxable: 24,480,000 - 2,448,000 = 22,032,000
    expect(res.taxableAmount).toBe(22032000);
    // VAT 8%: 22,032,000 * 0.08 = 1,762,560
    expect(res.vatAmount).toBe(1762560);
    // Total: 22,032,000 + 1,762,560 = 23,794,560
    expect(res.total).toBe(23794560);
  });

  it('should calculate accurately with VAT = 0% and VAT = 10%', () => {
    const itemVat0: QuotationItemInput = {
      productNameSnapshot: 'Dịch vụ miễn thuế',
      unit: 'Lần',
      quantity: 2,
      unitPrice: 1500000,
      discount: 0,
      vatRate: 0,
      sortOrder: 0,
    };

    const res0 = calculateItemRow(itemVat0);
    expect(res0.subtotal).toBe(3000000);
    expect(res0.vatAmount).toBe(0);
    expect(res0.total).toBe(3000000);

    const itemVat10: QuotationItemInput = {
      productNameSnapshot: 'Dịch vụ VAT 10%',
      unit: 'Gói',
      quantity: 1,
      unitPrice: 5000000,
      discount: 10, // 10%
      vatRate: 10,
      sortOrder: 0,
    };

    const res10 = calculateItemRow(itemVat10);
    expect(res10.subtotal).toBe(5000000);
    expect(res10.discountAmount).toBe(500000);
    expect(res10.taxableAmount).toBe(4500000);
    expect(res10.vatAmount).toBe(450000);
    expect(res10.total).toBe(4950000);
  });

  it('should calculate accurately with multiple items and previous debt', () => {
    // Item 1: 2 * 2,000,000 = 4,000,000, discount 10% = 400,000 -> Taxable = 3,600,000, VAT 0% = 0 -> Total = 3,600,000
    // Item 2: 1 * 1,000,000 = 1,000,000, discount 0% -> Taxable = 1,000,000, VAT 8% = 80,000 -> Total = 1,080,000
    // Previous Debt = 500,000
    // Grand Total = 3,600,000 + 1,080,000 + 500,000 = 5,180,000
    const items: QuotationItemInput[] = [
      {
        productNameSnapshot: 'Giá bát nâng hạ SUS304',
        unit: 'Bộ',
        quantity: 2,
        unitPrice: 2000000,
        discount: 10,
        vatRate: 0,
        sortOrder: 0,
      },
      {
        productNameSnapshot: 'Thùng rác đôi thông minh',
        unit: 'Bộ',
        quantity: 1,
        unitPrice: 1000000,
        discount: 0,
        vatRate: 8,
        sortOrder: 1,
      },
    ];

    const { summary } = calculateQuotationTotals(items, 500000);

    expect(summary.subtotal).toBe(5000000);
    expect(summary.discountTotal).toBe(400000);
    expect(summary.taxableTotal).toBe(4600000);
    expect(summary.vatTotal).toBe(80000);
    expect(summary.previousDebt).toBe(500000);
    expect(summary.grandTotal).toBe(5180000);
  });

  it('should handle decimal quantities and fractional amounts without rounding artifacts', () => {
    const item: QuotationItemInput = {
      productNameSnapshot: 'Dịch vụ lẻ',
      unit: 'Giờ',
      quantity: 1.5,
      unitPrice: 333333.33,
      discount: 0,
      vatRate: 8,
      sortOrder: 0,
    };

    const res = calculateItemRow(item);
    expect(res.subtotal).toBe(500000); // 1.5 * 333333.33 = 499999.995 rounded to 500000
    expect(res.vatAmount).toBe(40000);
    expect(res.total).toBe(540000);
  });
});
