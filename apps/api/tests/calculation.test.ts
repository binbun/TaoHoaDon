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

  it('should calculate accurately with quantity = 10 and discount > 0', () => {
    const item: QuotationItemInput = {
      productNameSnapshot: 'TOP PRO TRIAL',
      unit: 'Gói',
      quantity: 10,
      unitPrice: 2448000,
      discount: 1000000, // 1 triệu discount
      vatRate: 8,
      sortOrder: 0,
    };

    const res = calculateItemRow(item);
    // Subtotal: 10 * 2,448,000 = 24,480,000
    expect(res.subtotal).toBe(24480000);
    // Taxable: 24,480,000 - 1,000,000 = 23,480,000
    expect(res.taxableAmount).toBe(23480000);
    // VAT 8%: 23,480,000 * 0.08 = 1,878,400
    expect(res.vatAmount).toBe(1878400);
    // Total: 23,480,000 + 1,878,400 = 25,358,400
    expect(res.total).toBe(25358400);
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
      discount: 500000,
      vatRate: 10,
      sortOrder: 0,
    };

    const res10 = calculateItemRow(itemVat10);
    expect(res10.subtotal).toBe(5000000);
    expect(res10.taxableAmount).toBe(4500000);
    expect(res10.vatAmount).toBe(450000);
    expect(res10.total).toBe(4950000);
  });

  it('should match the exact prompt calculation example in section 8', () => {
    // 2 TOP JOB @ 2,887,500 = 5,775,000 with 500,000 discount
    // 1 TOP PRO @ 2,448,000 = 2,448,000
    // Total Subtotal = 8,223,000
    // Discount = 500,000
    // Taxable = 7,723,000
    // VAT 8% = 617,840
    // Grand Total = 8,340,840
    const items: QuotationItemInput[] = [
      {
        productNameSnapshot: 'TOP JOB',
        unit: 'Gói',
        quantity: 2,
        unitPrice: 2887500,
        discount: 500000,
        vatRate: 8,
        sortOrder: 0,
      },
      {
        productNameSnapshot: 'TOP PRO',
        unit: 'Gói',
        quantity: 1,
        unitPrice: 2448000,
        discount: 0,
        vatRate: 8,
        sortOrder: 1,
      },
    ];

    const { summary } = calculateQuotationTotals(items);

    expect(summary.subtotal).toBe(8223000);
    expect(summary.discountTotal).toBe(500000);
    expect(summary.taxableTotal).toBe(7723000);
    expect(summary.vatTotal).toBe(617840);
    expect(summary.grandTotal).toBe(8340840);
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
