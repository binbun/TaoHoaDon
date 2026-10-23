import { describe, it, expect } from 'vitest';
import { allocatePayment, buildDebtReport, calculateCustomerDebt, DebtOrderInput } from '@taohoadon/shared';

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

  it('keeps overpayment as customer credit', () => {
    const allocations = allocatePayment(1500000, 0, [order('A', 1000000)], [], null);
    expect(allocations).toEqual([
      { quotationId: 'A', amount: 1000000 },
      { quotationId: null, amount: 500000 },
    ]);
    const debt = calculateCustomerDebt(0, [order('A', 1000000)], allocations);
    expect(debt.currentDebt).toBe(-500000);
  });

  it('turns money paid beyond an edited-down order into credit', () => {
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
      { ...order('Q1', 3000000), customerId: 'C', quotationNumber: 'DH-1', quotationDay: '2026-09-05', settledDay: '2026-09-05' },
      { ...order('Q2', 2000000), customerId: 'C', quotationNumber: 'DH-2', quotationDay: '2026-10-12', settledDay: '2026-10-12' },
      { ...order('Q3', 5000000, { status: 'PAID' }), customerId: 'C', quotationNumber: 'DH-3', quotationDay: '2026-10-20', settledDay: '2026-11-15' },
    ];
    const payments = [
      { customerId: 'C', quotationId: 'Q1', batchId: 'B1', amount: 1000000, paidDay: '2026-10-15' },
      { customerId: 'C', quotationId: 'Q2', batchId: 'B1', amount: 500000, paidDay: '2026-10-15' },
    ];

    // Lunar month 9/2026 = 10/10/2026 → 08/11/2026
    const { rows, entries } = buildDebtReport({ customers, orders, payments, fromDay: '2026-10-10', toDay: '2026-11-08' });
    expect(rows[0]).toMatchObject({
      openingBalance: 4000000, // 1,000,000 opening + Q1
      billed: 7000000, // Q2 + Q3
      paid: 1500000, // one payment split across Q1 and Q2
      closingBalance: 9500000,
      currentDebt: 4500000, // Q3 was marked paid later, on 15/11
    });
    expect(entries.filter((e) => e.kind === 'PAYMENT')).toEqual([
      expect.objectContaining({ paid: 1500000, quotationNumbers: ['DH-1', 'DH-2'] }),
    ]);
    // Same total as everywhere else in the app
    expect(rows[0].currentDebt).toBe(calculateCustomerDebt(1000000, orders, payments).currentDebt);
  });
});

