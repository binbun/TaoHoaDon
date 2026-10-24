import { describe, it, expect } from 'vitest';
import { allocatePayment, buildDebtReport, calculateCustomerDebt, syncOrderStatus, DebtOrderInput } from '@taohoadon/shared';

const order = (id: string, grandTotal: number, opts: Partial<DebtOrderInput> = {}): DebtOrderInput => ({
  id,
  status: 'SENT',
  grandTotal,
  previousDebt: 0,
  quotationDate: '2026-01-01',
  ...opts,
});

describe('Customer debt ledger', () => {
  it('keeps the unpaid part of a partially paid order as debt', () => {
    const debt = calculateCustomerDebt(0, [order('A', 5000000)], [{ quotationId: 'A', amount: 2000000 }]);
    expect(debt.orders[0]).toMatchObject({ amount: 5000000, paid: 2000000, remaining: 3000000 });
    expect(debt.currentDebt).toBe(3000000);
  });

  it('does not count carried-over debt twice', () => {
    // B's invoice shows A's 3,000,000 as "Dư nợ cũ" on top of its own 1,000,000
    const debt = calculateCustomerDebt(
      0,
      [order('A', 5000000), order('B', 4000000, { previousDebt: 3000000, quotationDate: '2026-02-01' })],
      [{ quotationId: 'A', amount: 2000000 }]
    );
    expect(debt.currentDebt).toBe(4000000);
  });

  it('counts drafts as owed and treats orders marked paid as settled', () => {
    const debt = calculateCustomerDebt(
      0,
      [order('A', 1000000, { status: 'DRAFT' }), order('B', 2000000, { status: 'PAID' })],
      []
    );
    expect(debt.currentDebt).toBe(1000000);
  });

  it('carries opening debt plus the previous bill onto the next order', () => {
    // First order: 1,000,000 typed as "Dư nợ cũ" + its own 3,000,000 bill, left as draft
    const debt = calculateCustomerDebt(1000000, [order('FIRST', 4000000, { previousDebt: 1000000, status: 'DRAFT' })], []);
    expect(debt.currentDebt).toBe(4000000);
  });

  it('adds opening debt and subtracts unallocated payments', () => {
    const debt = calculateCustomerDebt(1500000, [order('A', 1000000)], [{ quotationId: null, amount: 500000 }]);
    expect(debt.openingRemaining).toBe(1000000);
    expect(debt.currentDebt).toBe(2000000);
  });

  it('allocates to the chosen order, then opening debt, then oldest orders, then credit', () => {
    const orders = [
      order('OLD', 1000000, { quotationDate: '2026-01-01' }),
      order('MID', 2000000, { quotationDate: '2026-02-01' }),
      order('NEW', 3000000, { quotationDate: '2026-03-01' }),
    ];
    const allocations = allocatePayment(5000000, 500000, orders, [], 'NEW');
    expect(allocations).toEqual([
      { quotationId: 'NEW', amount: 3000000 },
      { quotationId: null, amount: 500000 },
      { quotationId: 'OLD', amount: 1000000 },
      { quotationId: 'MID', amount: 500000 },
    ]);
  });

  it('never allocates more than is owed (the API rejects such amounts first)', () => {
    expect(allocatePayment(1500000, 0, [order('A', 1000000)], [], null)).toEqual([{ quotationId: 'A', amount: 1000000 }]);
  });

  it('order status follows its payments, but an older hand-marked PAID stays', () => {
    expect(syncOrderStatus('SENT', 1000000, 1000000, false)).toBe('PAID');
    expect(syncOrderStatus('PAID', 1500000, 1000000, true)).toBe('SENT'); // amount raised or a payment removed
    expect(syncOrderStatus('PAID', 1000000, 300000, false)).toBe('PAID'); // marked by hand before marks were recorded
    expect(syncOrderStatus('DRAFT', 1000000, 300000, false)).toBe('DRAFT');
  });

  it('older data: money paid beyond an edited-down order still counts as credit', () => {
    const debt = calculateCustomerDebt(0, [order('A', 1000000)], [{ quotationId: 'A', amount: 1500000 }]);
    expect(debt.orders[0].remaining).toBe(0);
    expect(debt.currentDebt).toBe(-500000);
  });

  it('counts opening debt and the bill of an order that is still a draft', () => {
    const debt = calculateCustomerDebt(10061000, [order('FIRST', 31595000, { previousDebt: 10061000, status: 'DRAFT' })], []);
    expect(debt.currentDebt).toBe(31595000);
  });

  it('never reads opening debt from an order\'s "Dư nợ cũ"', () => {
    const debt = calculateCustomerDebt(0, [order('FIRST', 4000000, { previousDebt: 1000000 })], []);
    expect(debt.openingDebt).toBe(0);
    expect(debt.currentDebt).toBe(3000000);
  });

  it('monthly report: opening, billed, paid, closing and current debt', () => {
    const customers = [{ id: 'C', companyName: 'Khách', openingDebt: 1000000 }];
    const orders = [
      { ...order('Q1', 3000000), customerId: 'C', quotationNumber: 'DH-1', quotationDay: '2026-09-05', createdAt: '2026-09-05T02:00:00Z' },
      { ...order('Q2', 2000000), customerId: 'C', quotationNumber: 'DH-2', quotationDay: '2026-10-12', createdAt: '2026-10-12T02:00:00Z' },
      { ...order('Q3', 5000000, { status: 'PAID' }), customerId: 'C', quotationNumber: 'DH-3', quotationDay: '2026-10-20', createdAt: '2026-10-20T02:00:00Z' },
    ];
    const payments = [
      { customerId: 'C', quotationId: 'Q1', batchId: 'B1', amount: 1000000, paidDay: '2026-10-15', createdAt: '2026-10-15T02:00:00Z' },
      { customerId: 'C', quotationId: 'Q2', batchId: 'B1', amount: 500000, paidDay: '2026-10-15', createdAt: '2026-10-15T02:00:00Z' },
    ];

    // Lunar month 9/2026 = 10/10/2026 → 08/11/2026
    const { rows, entries } = buildDebtReport({ customers, orders, payments, fromDay: '2026-10-10', toDay: '2026-11-08' });
    expect(rows[0]).toMatchObject({
      openingBalance: 4000000, // 1,000,000 opening + Q1
      billed: 7000000, // Q2 + Q3
      paid: 6500000, // one payment split across Q1 and Q2, plus Q3 marked paid without a payment record
      closingBalance: 4500000,
      currentDebt: 4500000,
    });
    expect(entries.filter((e) => e.kind === 'PAYMENT')).toEqual([
      expect.objectContaining({ paid: 1500000, quotationNumbers: ['DH-1', 'DH-2'] }),
    ]);
    // Same total as everywhere else in the app
    expect(rows[0].currentDebt).toBe(calculateCustomerDebt(1000000, orders, payments).currentDebt);
  });

  it('monthly report invoices: "Đã TT" / "Còn lại" as of the end of the month', () => {
    const customers = [{ id: 'C', companyName: 'Khách', openingDebt: 4000000 }];
    const orders = [
      { ...order('Q1', 6000000, { previousDebt: 4000000 }), customerId: 'C', quotationNumber: 'DH-1', quotationDay: '2026-10-12', createdAt: '2026-10-12T02:00:00Z' },
      { ...order('Q2', 3000000, { previousDebt: 1000000 }), customerId: 'C', quotationNumber: 'DH-2', quotationDay: '2026-10-20', createdAt: '2026-10-20T02:00:00Z' },
    ];
    const payments = [
      // 5,000,000 entered on DH-1: its goods, then 3,000,000 of the opening debt
      { customerId: 'C', quotationId: 'Q1', recordedOnQuotationId: 'Q1', batchId: 'P1', amount: 2000000, paidDay: '2026-10-13', createdAt: '2026-10-13T02:00:00Z' },
      { customerId: 'C', quotationId: null, recordedOnQuotationId: 'Q1', batchId: 'P1', amount: 3000000, paidDay: '2026-10-13', createdAt: '2026-10-13T02:00:00Z' },
      // From the customer screen after DH-2 was made: counts on DH-2
      { customerId: 'C', quotationId: null, recordedOnQuotationId: null, batchId: 'P2', amount: 1000000, paidDay: '2026-10-25', createdAt: '2026-10-25T02:00:00Z' },
      // Next month: not in this month's figures
      { customerId: 'C', quotationId: 'Q2', recordedOnQuotationId: 'Q2', batchId: 'P3', amount: 2000000, paidDay: '2026-11-20', createdAt: '2026-11-20T02:00:00Z' },
    ];

    const { invoices, rows } = buildDebtReport({ customers, orders, payments, fromDay: '2026-10-10', toDay: '2026-11-08' });
    expect(invoices.map((i) => [i.quotationNumber, i.grandTotal, i.paid, i.remaining])).toEqual([
      ['DH-1', 6000000, 5000000, 1000000], // carried to DH-2 as "Nợ cũ"
      ['DH-2', 3000000, 1000000, 2000000],
    ]);
    expect(rows[0].closingBalance).toBe(2000000);
  });

  it('monthly report invoices: an order marked paid without a payment record (older data) still owes its old debt', () => {
    const customers = [{ id: 'C', companyName: 'Khách', openingDebt: 4000000 }];
    const orders = [
      { ...order('Q', 6000000, { previousDebt: 4000000, status: 'PAID' }), customerId: 'C', quotationNumber: 'DH-1', quotationDay: '2026-10-20', createdAt: '2026-10-20T02:00:00Z' },
    ];

    const { invoices, rows } = buildDebtReport({ customers, orders, payments: [], fromDay: '2026-10-10', toDay: '2026-11-08' });
    expect(invoices[0]).toMatchObject({ paid: 2000000, remaining: 4000000 });
    expect(rows[0].currentDebt).toBe(4000000);
  });
});

