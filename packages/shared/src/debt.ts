/**
 * Customer debt ledger.
 *
 * Debt is always derived from records, never stored:
 *   currentDebt = openingDebt + Σ remaining of each SENT order − Σ payments not tied to an order
 *                 − Σ amounts paid beyond an order's own amount
 *
 * An order's own amount excludes its "Dư nợ cũ" line (grandTotal − previousDebt),
 * otherwise old debt carried onto the invoice would be counted twice.
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
  remaining: number; // still owed on this order (0 for DRAFT / PAID)
}

export interface PaymentAllocation {
  quotationId: string | null; // null = opening debt or customer credit
  amount: number;
}

const round = (n: number) => Math.round(n);

export function isSettledStatus(status: string): boolean {
  return status === 'PAID' || status === 'ACCEPTED';
}

export function getOrderAmount(order: Pick<DebtOrderInput, 'grandTotal' | 'previousDebt'>): number {
  return Math.max(0, round(order.grandTotal - (order.previousDebt || 0)));
}

export function getOrderDebtState(order: DebtOrderInput, payments: DebtPaymentInput[]): OrderDebtState {
  const amount = getOrderAmount(order);
  const paid = round(
    payments.filter((p) => p.quotationId === order.id).reduce((sum, p) => sum + p.amount, 0)
  );
  // Drafts are not owed yet; orders marked paid are settled even without payment records
  const counts = order.status !== 'DRAFT' && !isSettledStatus(order.status);
  return { id: order.id, amount, paid, remaining: counts ? Math.max(0, amount - paid) : 0 };
}

export function calculateCustomerDebt(
  openingDebt: number,
  orders: DebtOrderInput[],
  payments: DebtPaymentInput[]
): { currentDebt: number; openingRemaining: number; orders: OrderDebtState[] } {
  const orderStates = orders.map((o) => getOrderDebtState(o, payments));
  const unallocated = payments.filter((p) => !p.quotationId).reduce((sum, p) => sum + p.amount, 0);
  const ordersRemaining = orderStates.reduce((sum, o) => sum + o.remaining, 0);
  // Money paid beyond an order's amount (e.g. the order was edited down afterwards) becomes credit
  const overpaid = orderStates.reduce((sum, o) => sum + Math.max(0, o.paid - o.amount), 0);

  return {
    currentDebt: round((openingDebt || 0) + ordersRemaining - unallocated - overpaid),
    openingRemaining: Math.max(0, round((openingDebt || 0) - unallocated)),
    orders: orderStates,
  };
}

/**
 * Splits a payment: the preferred order first, then opening debt, then the oldest unpaid orders.
 * Anything left over is kept as customer credit (quotationId = null).
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
  if (left > 0) take(null, left);

  return allocations;
}
