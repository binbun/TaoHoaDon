import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { buildDebtReport } from '@taohoadon/shared';
import { AuthenticatedRequest } from '../middleware/auth';

const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

// quotationDate / paidAt are stored at UTC midnight of the chosen day
const storedDay = (d: Date) => d.toISOString().slice(0, 10);

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
          createdAt: true,
        },
        orderBy: [{ quotationDate: 'asc' }, { quotationNumber: 'asc' }],
      }),
      prisma.payment.findMany({
        select: {
          customerId: true,
          quotationId: true,
          batchId: true,
          recordedOnQuotationId: true,
          amount: true,
          paidAt: true,
          note: true,
          createdAt: true,
        },
      }),
    ]);

    const { rows, entries, invoices } = buildDebtReport({
      customers,
      orders: orders.map((o) => ({ ...o, quotationDay: storedDay(o.quotationDate) })),
      payments: payments.map((p) => ({ ...p, paidDay: storedDay(p.paidAt) })),
      fromDay: fromDate,
      toDay: toDate,
    });

    return res.json({
      success: true,
      data: {
        fromDate,
        toDate,
        rows,
        entries,
        // Quotations created in the period, one row each
        orders: invoices.map(({ quotationDay, ...invoice }) => ({ ...invoice, quotationDate: quotationDay })),
      },
    });
  } catch (error) {
    next(error);
  }
}
