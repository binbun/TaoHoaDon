import { Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../prisma';
import { PaymentSchema, allocatePayment, calculateCustomerDebt, formatCurrency } from '@taohoadon/shared';
import { AuthenticatedRequest } from '../middleware/auth';
import { createAuditLog } from '../audit/audit.service';
import { getCustomerDebtDetail, loadCustomerLedger, lockCustomer, syncOrderStatuses } from './payments.service';

export async function getCustomerDebt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const detail = await getCustomerDebtDetail(req.params.id);
    if (!detail) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin khách hàng',
      });
    }

    return res.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    next(error);
  }
}

export async function createPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user!;
    const { id: customerId } = req.params;
    const validatedData = PaymentSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      await lockCustomer(tx, customerId);
      const { customer, orders, payments } = await loadCustomerLedger(tx, customerId);
      if (!customer) return { error: 'Không tìm thấy thông tin khách hàng' };

      let preferredId: string | null = null;
      if (validatedData.quotationId) {
        const order = orders.find((o) => o.id === validatedData.quotationId);
        if (!order) return { error: 'Đơn hàng không thuộc khách hàng này' };
        preferredId = order.id;
      }

      // Customers never pay more than they owe
      const { currentDebt } = calculateCustomerDebt(customer.openingDebt, orders, payments);
      if (validatedData.amount > currentDebt) {
        return {
          error:
            currentDebt > 0
              ? `Số tiền vượt quá tổng nợ hiện tại của khách (${formatCurrency(currentDebt)})`
              : 'Khách hàng không còn nợ',
        };
      }

      const allocations = allocatePayment(validatedData.amount, customer.openingDebt, orders, payments, preferredId);
      const batchId = randomUUID();
      const paidAt = new Date(validatedData.paidAt);

      await tx.payment.createMany({
        data: allocations.map((a) => ({
          customerId,
          quotationId: a.quotationId,
          batchId,
          recordedOnQuotationId: preferredId,
          amount: a.amount,
          paidAt,
          note: validatedData.note?.trim() || null,
          createdBy: currentUser.id,
        })),
      });

      await syncOrderStatuses(
        tx,
        orders,
        allocations.filter((a) => a.quotationId).map((a) => a.quotationId!)
      );

      return { batchId, allocations, orders };
    });

    if ('error' in result) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    await createAuditLog({
      req,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'CREATE_PAYMENT',
      resource: 'CUSTOMER',
      resourceId: customerId,
      details: {
        amount: validatedData.amount,
        batchId: result.batchId,
        allocations: result.allocations.map((a) => ({
          quotationNumber: result.orders.find((o) => o.id === a.quotationId)?.quotationNumber || null,
          amount: a.amount,
        })),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Đã ghi nhận thanh toán',
      data: await getCustomerDebtDetail(customerId),
    });
  } catch (error) {
    next(error);
  }
}

export async function deletePayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user!;
    const { id: customerId, batchId } = req.params;

    const rows = await prisma.$transaction(async (tx) => {
      await lockCustomer(tx, customerId);
      const rows = await tx.payment.findMany({ where: { customerId, batchId } });
      if (rows.length === 0) return rows;

      await tx.payment.deleteMany({ where: { customerId, batchId } });
      const removed = new Map<string, number>();
      for (const r of rows) {
        if (r.quotationId) removed.set(r.quotationId, (removed.get(r.quotationId) ?? 0) + r.amount);
      }
      const { orders } = await loadCustomerLedger(tx, customerId);
      await syncOrderStatuses(tx, orders, [...removed.keys()], removed);
      return rows;
    });

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khoản thanh toán',
      });
    }

    await createAuditLog({
      req,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'DELETE_PAYMENT',
      resource: 'CUSTOMER',
      resourceId: customerId,
      details: {
        batchId,
        amount: rows.reduce((sum, r) => sum + r.amount, 0),
      },
    });

    return res.json({
      success: true,
      message: 'Đã xóa khoản thanh toán',
      data: await getCustomerDebtDetail(customerId),
    });
  } catch (error) {
    next(error);
  }
}
