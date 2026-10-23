import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { buildDebtReport, getOrderAmount } from '@taohoadon/shared';
import { AuthenticatedRequest } from '../middleware/auth';

const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

// quotationDate / paidAt are stored at UTC midnight of the chosen day
const storedDay = (d: Date) => d.toISOString().slice(0, 10);
// Real timestamps (when an order was marked paid) are read as a Vietnam calendar day
const vietnamDay = (d: Date) => new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

export async function getDebtReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { fromDate, toDate } = req.query;
    if (!isDay(fromDate) || !isDay(toDate) || fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: 'Khoảng ngày không hợp lệ',
      });
    }

    const [customers, orders, payments] = await Promise.all([
      prisma.customer.findMany({ select: { id: true, companyName: true, phone: true, openingDebt: true } }),
      prisma.quotation.findMany({
        select: {
          id: true,
          customerId: true,
          quotationNumber: true,
          quotationDate: true,
          status: true,
          grandTotal: true,
          previousDebt: true,
          updatedAt: true,
          customer: { select: { companyName: true } },
        },
        orderBy: [{ quotationDate: 'asc' }, { quotationNumber: 'asc' }],
      }),
      prisma.payment.findMany({
        select: { customerId: true, quotationId: true, batchId: true, amount: true, paidAt: true, note: true },
      }),
    ]);

    const report = buildDebtReport({
      customers,
      orders: orders.map((o) => ({
        ...o,
        quotationDay: storedDay(o.quotationDate),
        settledDay: vietnamDay(o.updatedAt),
      })),
      payments: payments.map((p) => ({ ...p, paidDay: storedDay(p.paidAt) })),
      fromDay: fromDate,
      toDay: toDate,
    });

    // Quotations created in the period, one row each
    const periodOrders = orders
      .filter((o) => {
        const day = storedDay(o.quotationDate);
        return day >= fromDate && day <= toDate;
      })
      .map((o) => ({
        id: o.id,
        customerId: o.customerId,
        quotationDate: storedDay(o.quotationDate),
        quotationNumber: o.quotationNumber,
        companyName: o.customer.companyName,
        orderAmount: getOrderAmount(o),
        previousDebt: o.previousDebt,
        grandTotal: o.grandTotal,
      }));

    return res.json({
      success: true,
      data: { fromDate, toDate, ...report, orders: periodOrders },
    });
  } catch (error) {
    next(error);
  }
}
