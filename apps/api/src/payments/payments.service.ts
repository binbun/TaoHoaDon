import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { calculateCustomerDebt, getOrderAmount, DebtOrderInput } from '@taohoadon/shared';

type Db = Prisma.TransactionClient | typeof prisma;

const ORDER_SELECT = {
  id: true,
  quotationNumber: true,
  quotationDate: true,
  status: true,
  grandTotal: true,
  previousDebt: true,
} as const;

export async function loadCustomerLedger(db: Db, customerId: string) {
  const [customer, orders, payments] = await Promise.all([
    db.customer.findUnique({ where: { id: customerId }, select: { id: true, openingDebt: true } }),
    db.quotation.findMany({ where: { customerId }, select: ORDER_SELECT, orderBy: { quotationDate: 'asc' } }),
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
    openingDebt: customer.openingDebt,
    openingRemaining: debt.openingRemaining,
    currentDebt: debt.currentDebt,
    orders: orders
      .map((o, i) => ({ ...debt.orders[i], quotationNumber: o.quotationNumber, quotationDate: o.quotationDate, status: o.status }))
      .filter((o) => o.status !== 'DRAFT')
      .reverse(),
    payments,
  };
}

/** Current debt for many customers at once (customer list). */
export async function getCustomerDebtMap(customers: { id: string; openingDebt: number }[]) {
  const ids = customers.map((c) => c.id);
  const [orders, payments] = await Promise.all([
    prisma.quotation.findMany({ where: { customerId: { in: ids } }, select: { ...ORDER_SELECT, customerId: true } }),
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
 * Keeps order status in line with its payments: fully paid → PAID,
 * a PAID order that is no longer covered after a payment is removed → SENT.
 */
export async function syncOrderStatuses(db: Db, orders: DebtOrderInput[], quotationIds: string[]) {
  for (const id of quotationIds) {
    const order = orders.find((o) => o.id === id);
    if (!order) continue;
    const paid = await db.payment.aggregate({ where: { quotationId: id }, _sum: { amount: true } });
    const remaining = getOrderAmount(order) - Math.round(paid._sum.amount || 0);

    if (remaining <= 0 && order.status !== 'PAID') {
      await db.quotation.update({ where: { id }, data: { status: 'PAID' } });
    } else if (remaining > 0 && order.status === 'PAID') {
      await db.quotation.update({ where: { id }, data: { status: 'SENT' } });
    }
  }
}
