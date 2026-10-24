import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { calculateCustomerDebt, getOrderAmount, isCovered, syncOrderStatus, DebtOrderInput } from '@taohoadon/shared';

type Db = Prisma.TransactionClient | typeof prisma;

const ORDER_SELECT = {
  id: true,
  quotationNumber: true,
  quotationDate: true,
  status: true,
  grandTotal: true,
  previousDebt: true,
} as const;

/**
 * Locks the customer until the transaction ends, so changes to one customer's debt (payments,
 * order amounts, opening debt) run one at a time and their "never more than owed" checks can't race.
 */
export async function lockCustomer(tx: Prisma.TransactionClient, customerId: string) {
  await tx.$queryRaw`SELECT 1 FROM "Customer" WHERE "id" = ${customerId} FOR UPDATE`;
}

export async function loadCustomerLedger(db: Db, customerId: string) {
  const [customer, orders, payments] = await Promise.all([
    db.customer.findUnique({ where: { id: customerId }, select: { id: true, openingDebt: true } }),
    db.quotation.findMany({ where: { customerId }, select: ORDER_SELECT, orderBy: [{ quotationDate: 'asc' }, { createdAt: 'asc' }] }),
    db.payment.findMany({
      where: { customerId },
      include: {
        quotation: { select: { id: true, quotationNumber: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);
  return { customer, orders, payments };
}

export async function getCustomerDebtDetail(customerId: string) {
  const { customer, orders, payments } = await loadCustomerLedger(prisma, customerId);
  if (!customer) return null;

  const debt = calculateCustomerDebt(customer.openingDebt, orders, payments);
  return {
    customerId,
    openingDebt: debt.openingDebt,
    openingRemaining: debt.openingRemaining,
    currentDebt: debt.currentDebt,
    orders: orders
      .map((o, i) => ({ ...debt.orders[i], quotationNumber: o.quotationNumber, quotationDate: o.quotationDate, status: o.status }))
      .reverse(),
    payments,
  };
}

/** The customer's debt right now, used as a new order's "Dư nợ cũ" (never negative on an invoice). */
export async function getCarriedDebt(db: Db, customerId: string) {
  const { customer, orders, payments } = await loadCustomerLedger(db, customerId);
  if (!customer) return 0;
  return Math.max(0, calculateCustomerDebt(customer.openingDebt, orders, payments).currentDebt);
}

/** Money recorded against one order. */
export async function getOrderPaid(db: Db, quotationId: string) {
  const sum = await db.payment.aggregate({ where: { quotationId }, _sum: { amount: true } });
  return Math.round(sum._sum.amount || 0);
}

/** "Đã thanh toán" chosen by hand: records that the customer paid what was left on the order. */
export async function recordOrderPaid(
  db: Db,
  data: { customerId: string; quotationId: string; amount: number; paidAt: Date; createdBy: string }
) {
  await db.payment.create({
    data: { ...data, batchId: randomUUID(), recordedOnQuotationId: data.quotationId, note: 'Đánh dấu đã thanh toán' },
  });
}

/** Current debt for many customers at once (customer list). */
export async function getCustomerDebtMap(customers: { id: string; openingDebt: number }[]) {
  const ids = customers.map((c) => c.id);
  const [orders, payments] = await Promise.all([
    prisma.quotation.findMany({
      where: { customerId: { in: ids } },
      select: { ...ORDER_SELECT, customerId: true },
      orderBy: [{ quotationDate: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.payment.findMany({ where: { customerId: { in: ids } }, select: { customerId: true, quotationId: true, amount: true } }),
  ]);

  const map = new Map<string, number>();
  for (const c of customers) {
    const debt = calculateCustomerDebt(
      c.openingDebt,
      orders.filter((o) => o.customerId === c.id),
      payments.filter((p) => p.customerId === c.id)
    );
    map.set(c.id, debt.currentDebt);
  }
  return map;
}

/**
 * Keeps order statuses in line with their payments after payments were added or removed
 * (see syncOrderStatus). removed holds the amount just deleted from each order.
 */
export async function syncOrderStatuses(
  db: Db,
  orders: DebtOrderInput[],
  quotationIds: string[],
  removed = new Map<string, number>()
) {
  for (const id of new Set(quotationIds)) {
    const order = orders.find((o) => o.id === id);
    if (!order) continue;
    const amount = getOrderAmount(order);
    const paid = await getOrderPaid(db, id);
    const status = syncOrderStatus(order.status, amount, paid, isCovered(amount, paid + (removed.get(id) ?? 0)));
    if (status !== order.status) {
      await db.quotation.update({ where: { id }, data: { status } });
    }
  }
}
