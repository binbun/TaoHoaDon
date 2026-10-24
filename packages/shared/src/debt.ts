/**
 * Customer debt ledger.
 *
 * Debt is always derived from records, never stored:
 *   currentDebt = openingDebt + Σ remaining of each unpaid order − Σ payments not tied to an order
 *                 − Σ amounts paid beyond an order's own amount
 *
 * An order's own amount excludes its "Dư nợ cũ" line (grandTotal − previousDebt),
 * otherwise old debt carried onto the invoice would be counted twice.
 *
 * Opening debt (owed before the app was used) is the customer's "Nợ đầu kỳ". An order's
 * "Dư nợ cũ" is only a snapshot of the customer's debt when the order was created.
 *
 * Customers never pay more than they owe: the API rejects such payments and any change that would
 * leave money paid beyond what is owed, so the credit terms above only matter for older data.
 * Choosing "Đã thanh toán" by hand records a payment for what is left on the order.
 */

export interface DebtOrderInput {
  id: string;
  status: string;
  grandTotal: number;
  previousDebt?: number | null;
  quotationDate: string | Date;
}

export interface DebtPaymentInput {
  quotationId?: string | null;
  amount: number;
}

export interface OrderDebtState {
  id: string;
  amount: number; // order's own amount (without carried-over debt)
  paid: number; // payments recorded against this order
  remaining: number; // still owed on this order (0 once marked PAID)
}

export interface PaymentAllocation {
  quotationId: string | null; // null = opening debt
  amount: number;
}

const round = (n: number) => Math.round(n);

export function isSettledStatus(status: string): boolean {
  return status === 'PAID' || status === 'ACCEPTED';
}

export function getOrderAmount(order: Pick<DebtOrderInput, 'grandTotal' | 'previousDebt'>): number {
  return Math.max(0, round(order.grandTotal - (order.previousDebt || 0)));
}

/** True when payments recorded against an order cover its own amount. */
export function isCovered(amount: number, paid: number): boolean {
  return amount > 0 && paid >= amount;
}

/**
 * Status an order should have once its payments or amount change: PAID when payments cover it,
 * back to SENT when they covered it before but no longer do. An order marked paid by hand without
 * a payment record (older data) keeps its status.
 */
export function syncOrderStatus(status: string, amount: number, paid: number, coveredBefore: boolean): string {
  if (isCovered(amount, paid)) return 'PAID';
  if (isSettledStatus(status) && coveredBefore) return 'SENT';
  return status;
}

export function getOrderDebtState(order: DebtOrderInput, payments: DebtPaymentInput[]): OrderDebtState {
  const amount = getOrderAmount(order);
  const paid = round(
    payments.filter((p) => p.quotationId === order.id).reduce((sum, p) => sum + p.amount, 0)
  );
  // Every order is owed (drafts included); orders marked paid are settled even without payment records (older data)
  const remaining = isSettledStatus(order.status) ? 0 : Math.max(0, amount - paid);
  return { id: order.id, amount, paid, remaining };
}

export function calculateCustomerDebt(
  customerOpeningDebt: number,
  orders: DebtOrderInput[],
  payments: DebtPaymentInput[]
): {
  currentDebt: number;
  openingDebt: number;
  openingRemaining: number;
  orders: OrderDebtState[];
} {
  const openingDebt = round(customerOpeningDebt || 0);
  const orderStates = orders.map((o) => getOrderDebtState(o, payments));
  const unallocated = payments.filter((p) => !p.quotationId).reduce((sum, p) => sum + p.amount, 0);
  const ordersRemaining = orderStates.reduce((sum, o) => sum + o.remaining, 0);
  // Older data only: money paid beyond an order's amount (it was edited down afterwards) is credit
  const overpaid = orderStates.reduce((sum, o) => sum + Math.max(0, o.paid - o.amount), 0);

  return {
    currentDebt: round(openingDebt + ordersRemaining - unallocated - overpaid),
    openingDebt,
    openingRemaining: Math.max(0, round(openingDebt - unallocated)),
    orders: orderStates,
  };
}

/**
 * Splits a payment: the preferred order first, then opening debt, then the oldest unpaid orders.
 * Customers never pay more than they owe, so callers reject amounts above the current debt;
 * within that limit the whole amount is always allocated.
 */
export function allocatePayment(
  amount: number,
  openingDebt: number,
  orders: DebtOrderInput[],
  payments: DebtPaymentInput[],
  preferredQuotationId?: string | null
): PaymentAllocation[] {
  let left = round(amount);
  const { openingRemaining, orders: states } = calculateCustomerDebt(openingDebt, orders, payments);
  const allocations: PaymentAllocation[] = [];

  const take = (quotationId: string | null, owed: number) => {
    const portion = Math.min(left, owed);
    if (portion <= 0) return;
    const existing = allocations.find((a) => a.quotationId === quotationId);
    if (existing) existing.amount += portion;
    else allocations.push({ quotationId, amount: portion });
    left -= portion;
  };

  const dateOf = (id: string) => new Date(orders.find((o) => o.id === id)!.quotationDate).getTime();
  const preferred = states.find((s) => s.id === preferredQuotationId);
  if (preferred) take(preferred.id, preferred.remaining);
  take(null, openingRemaining);
  states
    .filter((s) => s.id !== preferredQuotationId && s.remaining > 0)
    .sort((a, b) => dateOf(a.id) - dateOf(b.id))
    .forEach((s) => take(s.id, s.remaining));

  return allocations;
}

// ---------------------------------------------------------------------------
// Debt report for a date range (e.g. a lunar month)
// ---------------------------------------------------------------------------

export interface DebtReportInput {
  customers: { id: string; companyName: string; phone?: string | null; openingDebt: number }[];
  orders: (DebtOrderInput & { customerId: string; quotationNumber: string; quotationDay: string; createdAt: string | Date })[];
  payments: {
    customerId: string;
    quotationId?: string | null;
    recordedOnQuotationId?: string | null;
    batchId: string;
    amount: number;
    paidDay: string;
    createdAt: string | Date;
    note?: string | null;
  }[];
  fromDay: string; // YYYY-MM-DD, inclusive
  toDay: string; // YYYY-MM-DD, inclusive
}

export interface DebtReportRow {
  customerId: string;
  companyName: string;
  phone?: string | null;
  openingBalance: number; // debt at the start of the period
  billed: number; // new orders in the period
  paid: number; // payments (and orders marked paid) in the period
  closingBalance: number; // debt at the end of the period
  currentDebt: number; // debt today
}

export interface DebtReportEntry {
  day: string;
  customerId: string;
  companyName: string;
  kind: 'ORDER' | 'PAYMENT' | 'MARKED_PAID';
  quotationNumbers: string[];
  billed: number;
  paid: number;
  note?: string | null;
}

export interface DebtReportInvoice {
  id: string;
  customerId: string;
  companyName: string;
  quotationDay: string;
  quotationNumber: string;
  orderAmount: number; // "Tổng tiền hàng"
  previousDebt: number; // "Nợ cũ"
  grandTotal: number; // "Tổng thanh toán"
  paid: number; // "Đã TT": paid on this invoice by the last day of the period
  remaining: number; // "Còn lại": grandTotal − paid
}

/**
 * Builds a dated ledger per customer and sums it over the period:
 *   + opening debt (before everything), + each order's own amount on its date,
 *   − each payment on its date, − the unpaid part of orders marked "Đã thanh toán" without a payment
 *     record (older data), on the order's date.
 * The ledger total always equals calculateCustomerDebt's currentDebt.
 *
 * Also lists the invoices dated in the period with "Đã TT" / "Còn lại" as of the period's last day.
 * A payment counts on the invoice it was recorded on; one recorded from the customer screen counts on
 * the latest invoice created before it, because later invoices already carry it in their "Dư nợ cũ".
 */
export function buildDebtReport(input: DebtReportInput): {
  rows: DebtReportRow[];
  entries: DebtReportEntry[];
  invoices: DebtReportInvoice[];
} {
  const { fromDay, toDay } = input;
  const rows: DebtReportRow[] = [];
  const entries: DebtReportEntry[] = [];
  const invoices: DebtReportInvoice[] = [];
  const time = (d: string | Date) => new Date(d).getTime();

  for (const c of input.customers) {
    const orders = input.orders.filter((o) => o.customerId === c.id);
    const payments = input.payments.filter((p) => p.customerId === c.id);
    const ledger: Omit<DebtReportEntry, 'customerId' | 'companyName'>[] = [];
    const settledWithoutPayment = new Map<string, number>();

    for (const o of orders) {
      const state = getOrderDebtState(o, payments);
      ledger.push({ day: o.quotationDay, kind: 'ORDER', quotationNumbers: [o.quotationNumber], billed: state.amount, paid: 0 });
      const unrecorded = isSettledStatus(o.status) ? Math.max(0, state.amount - state.paid) : 0;
      if (unrecorded > 0) {
        settledWithoutPayment.set(o.id, unrecorded);
        ledger.push({ day: o.quotationDay, kind: 'MARKED_PAID', quotationNumbers: [o.quotationNumber], billed: 0, paid: unrecorded });
      }
    }

    // One entry per payment, even when it was split across several orders
    const batches = new Map<string, Omit<DebtReportEntry, 'customerId' | 'companyName'>>();
    for (const p of payments) {
      const batch = batches.get(p.batchId) ?? { day: p.paidDay, kind: 'PAYMENT' as const, quotationNumbers: [], billed: 0, paid: 0, note: p.note };
      batch.paid += p.amount;
      const number = orders.find((o) => o.id === p.quotationId)?.quotationNumber;
      if (number && !batch.quotationNumbers.includes(number)) batch.quotationNumbers.push(number);
      batches.set(p.batchId, batch);
    }
    ledger.push(...batches.values());

    const opening = round(c.openingDebt || 0);
    const net = (e: { billed: number; paid: number }) => e.billed - e.paid;
    const before = ledger.filter((e) => e.day < fromDay).reduce((sum, e) => sum + net(e), 0);
    const inPeriod = ledger.filter((e) => e.day >= fromDay && e.day <= toDay);
    const billed = round(inPeriod.reduce((sum, e) => sum + e.billed, 0));
    const paid = round(inPeriod.reduce((sum, e) => sum + e.paid, 0));
    const openingBalance = round(opening + before);

    const row: DebtReportRow = {
      customerId: c.id,
      companyName: c.companyName,
      phone: c.phone,
      openingBalance,
      billed,
      paid,
      closingBalance: openingBalance + billed - paid,
      currentDebt: round(opening + ledger.reduce((sum, e) => sum + net(e), 0)),
    };
    if (row.openingBalance || row.billed || row.paid || row.closingBalance || row.currentDebt) {
      rows.push(row);
      entries.push(...inPeriod.map((e) => ({ ...e, customerId: c.id, companyName: c.companyName })));
    }

    const invoiceOf = (p: (typeof payments)[number]) => {
      if (p.recordedOnQuotationId && orders.some((o) => o.id === p.recordedOnQuotationId)) return p.recordedOnQuotationId;
      let latest: (typeof orders)[number] | undefined;
      for (const o of orders) {
        if (time(o.createdAt) <= time(p.createdAt) && (!latest || time(o.createdAt) >= time(latest.createdAt))) latest = o;
      }
      return latest?.id;
    };
    const paidOnInvoice = new Map<string, number>();
    for (const p of payments) {
      const id = p.paidDay <= toDay ? invoiceOf(p) : undefined;
      if (id) paidOnInvoice.set(id, (paidOnInvoice.get(id) ?? 0) + p.amount);
    }
    for (const o of orders.filter((o) => o.quotationDay >= fromDay && o.quotationDay <= toDay)) {
      const grandTotal = round(o.grandTotal);
      const paid = round((paidOnInvoice.get(o.id) ?? 0) + (settledWithoutPayment.get(o.id) ?? 0));
      invoices.push({
        id: o.id,
        customerId: c.id,
        companyName: c.companyName,
        quotationDay: o.quotationDay,
        quotationNumber: o.quotationNumber,
        orderAmount: getOrderAmount(o),
        previousDebt: round(o.previousDebt || 0),
        grandTotal,
        paid,
        remaining: Math.max(0, grandTotal - paid),
      });
    }
  }

  // Invoices keep the order they were given in
  const position = new Map(input.orders.map((o, i) => [o.id, i]));
  invoices.sort((a, b) => position.get(a.id)! - position.get(b.id)!);
  rows.sort((a, b) => a.companyName.localeCompare(b.companyName, 'vi'));
  entries.sort((a, b) => a.day.localeCompare(b.day) || a.companyName.localeCompare(b.companyName, 'vi'));
  return { rows, entries, invoices };
}
