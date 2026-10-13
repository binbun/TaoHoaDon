import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { reconcilePaymentTransaction } from './payments.service';

/**
 * Handles incoming webhooks from SePay, Casso, or custom VietQR payment gateways.
 */
export async function handlePaymentWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;

    // Optional webhook authentication header verification
    if (webhookSecret) {
      const authHeader = req.headers['x-api-key'] || req.headers['authorization'] || req.headers['x-sepay-api-key'];
      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader;

      if (token !== webhookSecret) {
        return res.status(401).json({
          success: false,
          message: 'Webhook Secret không hợp lệ hoặc thiếu quyền truy cập',
        });
      }
    }

    const body = req.body || {};
    const results: any[] = [];

    // Case 1: Casso format (data is an array of transactions)
    if (Array.isArray(body.data)) {
      for (const item of body.data) {
        const result = await reconcilePaymentTransaction({
          gatewayTransactionId: item.id || item.tid,
          amount: Number(item.amount || 0),
          content: item.description || '',
          referenceCode: item.tid,
          gateway: 'CASSO_VIETQR',
          paymentDate: item.when ? new Date(item.when) : new Date(),
          recordedBy: 'WEBHOOK_CASSO',
        });
        results.push(result);
      }
      return res.json({ error: 0, message: 'Processed', data: results });
    }

    // Case 2: SePay format (transferAmount, transactionContent, referenceCode, id)
    if (body.transferAmount !== undefined || body.transferType !== undefined) {
      const result = await reconcilePaymentTransaction({
        gatewayTransactionId: body.id,
        amount: Number(body.transferAmount || 0),
        content: body.transactionContent || body.description || '',
        referenceCode: body.referenceCode,
        gateway: 'SEPAY_VIETQR',
        paymentDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
        recordedBy: 'WEBHOOK_SEPAY',
      });
      return res.json({ success: result.success, message: result.message, data: result });
    }

    // Case 3: Direct / Custom VietQR Webhook format
    const amount = Number(body.amount ?? body.transferAmount ?? 0);
    const content = body.content || body.description || body.transactionContent || body.note || '';
    const quotationNumber = body.quotationNumber;
    const gatewayTransactionId = body.gatewayTransactionId || body.transactionId || body.id;
    const referenceCode = body.referenceCode || body.tid;
    const gateway = body.gateway || 'VIETQR';

    const result = await reconcilePaymentTransaction({
      gatewayTransactionId,
      amount,
      content,
      quotationNumber,
      gateway,
      referenceCode,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      recordedBy: 'WEBHOOK_DIRECT',
    });

    return res.json({
      success: result.success,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Simulates a payment webhook event for interactive testing and demonstration.
 */
export async function simulatePaymentWebhook(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { quotationNumber, amount, note, gateway, referenceCode } = req.body;

    if (!quotationNumber) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã hóa đơn (quotationNumber)',
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp số tiền hợp lệ (> 0)',
      });
    }

    const simulatedTxnId = `SIM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const result = await reconcilePaymentTransaction({
      gatewayTransactionId: simulatedTxnId,
      amount: Number(amount),
      content: note ? `${quotationNumber} ${note}` : quotationNumber,
      quotationNumber,
      gateway: gateway || 'VIETQR',
      referenceCode: referenceCode || `REF-${Date.now()}`,
      recordedBy: req.user ? `${req.user.name} (Mô phỏng)` : 'SIMULATOR',
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves payment history across all invoices with pagination.
 */
export async function getPayments(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const gateway = req.query.gateway as string;
    const search = req.query.search as string;

    const where: any = {};
    if (gateway) {
      where.gateway = gateway;
    }
    if (search) {
      where.OR = [
        { referenceCode: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
        { quotation: { quotationNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: {
          quotation: {
            select: {
              id: true,
              quotationNumber: true,
              grandTotal: true,
              balanceDue: true,
              status: true,
              customer: {
                select: { id: true, companyName: true, phone: true },
              },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return res.json({
      success: true,
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}
