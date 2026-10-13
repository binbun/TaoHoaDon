import { prisma } from '../prisma';
import { extractQuotationNumberFromContent } from '@taohoadon/shared';

export interface ReconcilePaymentInput {
  gatewayTransactionId?: string | number;
  amount: number;
  content: string;
  quotationNumber?: string;
  gateway?: string;
  referenceCode?: string;
  paymentDate?: Date;
  recordedBy?: string;
}

export interface ReconcilePaymentResult {
  success: boolean;
  matched: boolean;
  duplicate?: boolean;
  message: string;
  paymentId?: string;
  quotationId?: string;
  quotationNumber?: string;
  previousBalance?: number;
  newBalance?: number;
  status?: string;
  data?: any;
}

/**
 * Core Automated Payment Reconciliation Service
 * Resolves invoice from bank transfer memo, guards idempotency,
 * updates balanceDue and status atomically within a Prisma transaction.
 */
export async function reconcilePaymentTransaction(
  input: ReconcilePaymentInput
): Promise<ReconcilePaymentResult> {
  const {
    gatewayTransactionId,
    amount,
    content,
    gateway = 'VIETQR',
    referenceCode,
    paymentDate = new Date(),
    recordedBy = 'SYSTEM_WEBHOOK',
  } = input;

  const txnIdStr = gatewayTransactionId ? String(gatewayTransactionId) : undefined;

  // 1. Idempotency Check: Prevent duplicate payment recording
  if (txnIdStr) {
    const existing = await prisma.payment.findUnique({
      where: { gatewayTransactionId: txnIdStr },
      include: { quotation: true },
    });

    if (existing) {
      return {
        success: true,
        matched: true,
        duplicate: true,
        message: 'Giao dịch đã được ghi nhận trước đó (Idempotent)',
        paymentId: existing.id,
        quotationId: existing.quotationId,
        quotationNumber: existing.quotation.quotationNumber,
        newBalance: Number(existing.quotation.balanceDue),
        status: existing.quotation.status,
      };
    }
  }

  // 2. Identify Target Quotation Number
  let targetNumber = input.quotationNumber?.trim();

  if (!targetNumber) {
    targetNumber = extractQuotationNumberFromContent(content) || undefined;
  }

  // 3. Query Target Quotation
  let quotation = targetNumber
    ? await prisma.quotation.findFirst({
        where: {
          quotationNumber: {
            equals: targetNumber,
            mode: 'insensitive',
          },
        },
      })
    : null;

  // Fallback: If not found by exact regex, search among active quotations for description matches
  if (!quotation && content) {
    const activeQuotations = await prisma.quotation.findMany({
      where: {
        status: { in: ['ISSUED', 'SENT', 'PARTIALLY_PAID', 'OVERDUE', 'DRAFT'] },
      },
      select: { id: true, quotationNumber: true, grandTotal: true, balanceDue: true, status: true },
      take: 100,
      orderBy: { quotationDate: 'desc' },
    });

    const cleanContent = content.toUpperCase().replace(/[^A-Z0-9]/g, '');
    for (const q of activeQuotations) {
      const cleanNum = q.quotationNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleanContent.includes(cleanNum)) {
        quotation = q as any;
        break;
      }
    }
  }

  if (!quotation) {
    return {
      success: false,
      matched: false,
      message: `Không tìm thấy hóa đơn phù hợp cho nội dung giao dịch: "${content}"`,
    };
  }

  // 4. Verify Invoice Status
  if (quotation.status === 'VOIDED' || quotation.status === 'CANCELLED') {
    return {
      success: false,
      matched: true,
      quotationId: quotation.id,
      quotationNumber: quotation.quotationNumber,
      message: `Hóa đơn ${quotation.quotationNumber} đang ở trạng thái "${quotation.status}". Không thể đối soát thanh toán.`,
    };
  }

  const numericAmount = Math.max(0, Number(amount));
  if (numericAmount <= 0) {
    return {
      success: false,
      matched: true,
      quotationId: quotation.id,
      quotationNumber: quotation.quotationNumber,
      message: 'Số tiền thanh toán phải lớn hơn 0',
    };
  }

  // 5. Execute Atomic Reconciliation Transaction
  const transactionResult = await prisma.$transaction(async (tx) => {
    // A. Create Payment Ledger Record
    const payment = await tx.payment.create({
      data: {
        quotationId: quotation!.id,
        amount: numericAmount,
        currency: quotation!.currency || 'VND',
        gateway,
        gatewayTransactionId: txnIdStr || null,
        referenceCode: referenceCode || null,
        note: `Đối soát ngân hàng tự động: ${content}`,
        paymentDate,
        recordedBy,
      },
    });

    // B. Calculate aggregate total payments
    const agg = await tx.payment.aggregate({
      where: { quotationId: quotation!.id },
      _sum: { amount: true },
    });

    const totalPaid = Number(agg._sum.amount || 0);
    const grandTotal = Number(quotation!.grandTotal);
    const newBalanceDue = Math.max(0, grandTotal - totalPaid);

    // C. Transition status: if balance cleared => PAID, otherwise PARTIALLY_PAID
    let newStatus = quotation!.status;
    if (newBalanceDue <= 0) {
      newStatus = 'PAID';
    } else if (totalPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    const updatedQuotation = await tx.quotation.update({
      where: { id: quotation!.id },
      data: {
        balanceDue: newBalanceDue,
        status: newStatus,
        issuedAt: quotation!.status === 'DRAFT' ? new Date() : undefined,
      },
    });

    return { payment, updatedQuotation, previousBalance: Number(quotation!.balanceDue) };
  });

  // 6. Record Audit Log for Automated Reconciliation
  try {
    await prisma.auditLog.create({
      data: {
        action: 'AUTO_PAYMENT_RECONCILED',
        resource: 'PAYMENT',
        resourceId: transactionResult.payment.id,
        userName: 'Hệ thống Đối soát VietQR',
        userEmail: 'vietqr-reconcile@taohoadon.vn',
        details: JSON.stringify({
          quotationNumber: quotation.quotationNumber,
          amount: numericAmount,
          previousBalance: transactionResult.previousBalance,
          newBalance: Number(transactionResult.updatedQuotation.balanceDue),
          status: transactionResult.updatedQuotation.status,
          gateway,
          gatewayTransactionId: txnIdStr,
          referenceCode,
        }),
      },
    });
  } catch (auditErr) {
    console.error('Lỗi ghi AuditLog cho thanh toán tự động:', auditErr);
  }

  return {
    success: true,
    matched: true,
    message: `Đã đối soát thành công ${numericAmount.toLocaleString('vi-VN')} đ cho hóa đơn ${quotation.quotationNumber}`,
    paymentId: transactionResult.payment.id,
    quotationId: quotation.id,
    quotationNumber: quotation.quotationNumber,
    previousBalance: transactionResult.previousBalance,
    newBalance: Number(transactionResult.updatedQuotation.balanceDue),
    status: transactionResult.updatedQuotation.status,
    data: transactionResult,
  };
}
