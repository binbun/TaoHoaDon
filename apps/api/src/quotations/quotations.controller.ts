import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import {
  QuotationSchema,
  UpdateQuotationSchema,
  QuotationItemInput,
  CalculatedQuotationItem,
  formatCurrency,
  getOrderAmount,
  isCovered,
  isSettledStatus,
  syncOrderStatus,
} from '@taohoadon/shared';
import { generateQuotationNumber, calculateQuotationTotals } from './quotations.service';
import {
  generateQuotationPdf,
  generateDeliverySlipPdf,
  generateQuotationPng,
  generateDeliverySlipPng,
} from '../pdf/pdf.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { createAuditLog } from '../audit/audit.service';
import { getCarriedDebt, getCustomerDebtDetail, getOrderPaid, lockCustomer, recordOrderPaid } from '../payments/payments.service';

// Today in Vietnam (UTC+7) as YYYY-MM-DD
const vietnamToday = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

export async function getQuotations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user;
    const { search, status, customerId, creatorId, fromDate, toDate, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // Row-level data isolation: USER role only views their own quotations
    if (currentUser && currentUser.role === 'USER') {
      where.createdBy = currentUser.id;
    } else if (creatorId && typeof creatorId === 'string') {
      where.createdBy = creatorId;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      if (status === 'PAID') {
        where.status = { in: ['PAID', 'ACCEPTED'] };
      } else {
        where.status = status;
      }
    }

    if (customerId && typeof customerId === 'string') {
      where.customerId = customerId;
    }

    // Date range on quotationDate (YYYY-MM-DD, both ends inclusive); dates are stored at UTC midnight
    const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
    if (isDay(fromDate) || isDay(toDate)) {
      where.quotationDate = {};
      if (isDay(fromDate)) where.quotationDate.gte = new Date(`${fromDate}T00:00:00.000Z`);
      if (isDay(toDate)) {
        const end = new Date(`${toDate}T00:00:00.000Z`);
        end.setUTCDate(end.getUTCDate() + 1);
        where.quotationDate.lt = end;
      }
    }

    if (search && typeof search === 'string') {
      const trimmed = search.trim();
      where.OR = [
        { quotationNumber: { contains: trimmed, mode: 'insensitive' } },
        { title: { contains: trimmed, mode: 'insensitive' } },
        { customer: { companyName: { contains: trimmed, mode: 'insensitive' } } },
        { customer: { contactName: { contains: trimmed, mode: 'insensitive' } } },
      ];
    }

    const [total, quotations] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.findMany({
        where,
        include: {
          customer: true,
          creator: {
            select: { id: true, name: true, email: true },
          },
          items: {
            orderBy: { sortOrder: 'asc' },
            include: {
              product: {
                select: { id: true, code: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    return res.json({
      success: true,
      data: quotations,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getQuotationById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user;
    const { id } = req.params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng yêu cầu',
      });
    }

    // Row-level permission check: USER can only access their own quotation
    if (currentUser && currentUser.role === 'USER' && quotation.createdBy !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập đơn hàng này',
      });
    }

    const debt = await getCustomerDebtDetail(quotation.customerId);
    const orderDebt = debt?.orders.find((o) => o.id === quotation.id);
    // Every payment entered on this invoice or paying this order, with all of its parts
    const batchIds = new Set(
      debt?.payments.filter((p) => p.quotationId === quotation.id || p.recordedOnQuotationId === quotation.id).map((p) => p.batchId)
    );

    return res.json({
      success: true,
      data: {
        ...quotation,
        orderAmount: orderDebt?.amount ?? Math.max(0, Math.round(quotation.grandTotal - quotation.previousDebt)),
        paidAmount: orderDebt?.paid ?? 0,
        remainingAmount: orderDebt?.remaining ?? 0,
        customerDebt: debt?.currentDebt ?? 0,
        payments: debt?.payments.filter((p) => batchIds.has(p.batchId)) ?? [],
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createQuotation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user!;
    const validatedData = QuotationSchema.parse(req.body);

    const customer = await prisma.customer.findUnique({
      where: { id: validatedData.customerId },
    });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Khách hàng không tồn tại trong hệ thống',
      });
    }

    const quotationNumber = validatedData.quotationNumber?.trim() || (await generateQuotationNumber());

    if (validatedData.customer) {
      await prisma.customer.update({
        where: { id: validatedData.customerId },
        data: {
          ...(validatedData.customer.companyName ? { companyName: validatedData.customer.companyName.trim() } : {}),
          ...(validatedData.customer.contactName !== undefined ? { contactName: validatedData.customer.contactName?.trim() || null } : {}),
          ...(validatedData.customer.email !== undefined ? { email: validatedData.customer.email?.trim() || null } : {}),
          ...(validatedData.customer.phone !== undefined ? { phone: validatedData.customer.phone?.trim() || null } : {}),
          ...(validatedData.customer.address !== undefined ? { address: validatedData.customer.address?.trim() || null } : {}),
          ...(validatedData.customer.taxCode !== undefined ? { taxCode: validatedData.customer.taxCode?.trim() || null } : {}),
        },
      });
    }

    const newQuotation = await prisma.$transaction(async (tx) => {
      await lockCustomer(tx, validatedData.customerId);
      // "Dư nợ cũ" is the customer's debt before this order, not a typed value
      const previousDebt = await getCarriedDebt(tx, validatedData.customerId);
      const { calculatedItems, summary } = calculateQuotationTotals(
        validatedData.items as QuotationItemInput[],
        previousDebt
      );

      const created = await tx.quotation.create({
        data: {
          quotationNumber,
          customerId: validatedData.customerId,
          quotationDate: new Date(validatedData.quotationDate),
          validUntil: validatedData.validUntil ? new Date(validatedData.validUntil) : new Date(validatedData.quotationDate),
          title: validatedData.title.trim(),
          note: validatedData.note?.trim() || null,
          status: validatedData.status || 'DRAFT',
          subtotal: summary.subtotal,
          discountTotal: summary.discountTotal,
          taxableTotal: summary.taxableTotal,
          vatTotal: summary.vatTotal,
          previousDebt: summary.previousDebt || 0,
          grandTotal: summary.grandTotal,
          createdBy: currentUser.id,
          items: {
            create: calculatedItems.map((item: CalculatedQuotationItem) => ({
              productId: item.productId || null,
              productCodeSnapshot: item.productCodeSnapshot || null,
              productNameSnapshot: item.productNameSnapshot,
              descriptionSnapshot: item.descriptionSnapshot || null,
              unit: item.unit || 'Gói',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              vatRate: item.vatRate,
              subtotal: item.subtotal,
              taxableAmount: item.taxableAmount,
              vatAmount: item.vatAmount,
              total: item.total,
              sortOrder: item.sortOrder,
            })),
          },
        },
        include: {
          customer: true,
          items: {
            orderBy: { sortOrder: 'asc' },
            include: {
              product: {
                select: { id: true, code: true, name: true },
              },
            },
          },
        },
      });

      // Created as "Đã thanh toán": the customer paid for the goods on the order's date
      const amount = getOrderAmount(created);
      if (isSettledStatus(created.status) && amount > 0) {
        await recordOrderPaid(tx, {
          customerId: created.customerId,
          quotationId: created.id,
          amount,
          paidAt: created.quotationDate,
          createdBy: currentUser.id,
        });
      }
      return created;
    });

    await createAuditLog({
      req,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'CREATE_QUOTATION',
      resource: 'QUOTATION',
      resourceId: newQuotation.id,
      details: {
        quotationNumber: newQuotation.quotationNumber,
        grandTotal: newQuotation.grandTotal,
        customerName: customer.companyName,
        itemCount: newQuotation.items.length,
      },
    });

    return res.status(201).json({
      success: true,
      data: newQuotation,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateQuotation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user!;
    const { id } = req.params;
    const validatedData = UpdateQuotationSchema.parse(req.body);

    const existing = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng cần cập nhật',
      });
    }

    // Row-level permission check: USER can only edit their own quotation
    if (currentUser.role === 'USER' && existing.createdBy !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa đơn hàng này',
      });
    }

    // Payments belong to the customer, so an order never moves to another one
    if (validatedData.customerId !== existing.customerId) {
      return res.status(400).json({
        success: false,
        message: 'Không thể đổi khách hàng của đơn hàng đã tạo. Hãy tạo đơn hàng mới cho khách hàng kia.',
      });
    }

    // Run in transaction: update customer, delete old items, create new items, update quotation
    const result = await prisma.$transaction(async (tx) => {
      await lockCustomer(tx, existing.customerId);
      // Re-read under the lock: payments or "Nợ đầu kỳ" may have changed the order meanwhile
      const current = await tx.quotation.findUnique({ where: { id } });
      if (!current) return { error: 'Không tìm thấy đơn hàng cần cập nhật' };

      // Keep the saved "Dư nợ cũ"
      const { calculatedItems, summary } = calculateQuotationTotals(
        validatedData.items as QuotationItemInput[],
        current.previousDebt
      );
      const paid = await getOrderPaid(tx, id);
      const amount = getOrderAmount(summary);
      // Customers never pay more than they owe, so an order can't go below what was paid on it
      if (amount < paid) {
        return { error: `Tiền hàng của đơn không được nhỏ hơn số khách đã trả cho đơn (${formatCurrency(paid)})` };
      }

      // A status is only sent when the user changed it
      const requested = validatedData.status ?? current.status;
      const wasSettled = isSettledStatus(current.status);
      if (wasSettled && !isSettledStatus(requested) && isCovered(amount, paid)) {
        return { error: 'Đơn hàng đã được thanh toán đủ. Muốn mở lại đơn, hãy xóa khoản thanh toán trước.' };
      }

      let status = requested;
      let markPaid = 0;
      if (isSettledStatus(requested) && !wasSettled) {
        // "Đã thanh toán" chosen by hand: the customer paid what is left on the order
        markPaid = amount - paid;
      } else if (isSettledStatus(requested)) {
        status = syncOrderStatus(current.status, amount, paid, isCovered(getOrderAmount(current), paid));
      } else if (isCovered(amount, paid)) {
        status = 'PAID';
      }

      if (validatedData.customer) {
        await tx.customer.update({
          where: { id: validatedData.customerId },
          data: {
            ...(validatedData.customer.companyName ? { companyName: validatedData.customer.companyName.trim() } : {}),
            ...(validatedData.customer.contactName !== undefined ? { contactName: validatedData.customer.contactName?.trim() || null } : {}),
            ...(validatedData.customer.email !== undefined ? { email: validatedData.customer.email?.trim() || null } : {}),
            ...(validatedData.customer.phone !== undefined ? { phone: validatedData.customer.phone?.trim() || null } : {}),
            ...(validatedData.customer.address !== undefined ? { address: validatedData.customer.address?.trim() || null } : {}),
            ...(validatedData.customer.taxCode !== undefined ? { taxCode: validatedData.customer.taxCode?.trim() || null } : {}),
          },
        });
      }

      await tx.quotationItem.deleteMany({
        where: { quotationId: id },
      });

      const updated = await tx.quotation.update({
        where: { id },
        data: {
          quotationDate: new Date(validatedData.quotationDate),
          validUntil: validatedData.validUntil ? new Date(validatedData.validUntil) : new Date(validatedData.quotationDate),
          title: validatedData.title.trim(),
          note: validatedData.note?.trim() || null,
          status,
          subtotal: summary.subtotal,
          discountTotal: summary.discountTotal,
          taxableTotal: summary.taxableTotal,
          vatTotal: summary.vatTotal,
          previousDebt: summary.previousDebt || 0,
          grandTotal: summary.grandTotal,
          items: {
            create: calculatedItems.map((item: CalculatedQuotationItem) => ({
              productId: item.productId || null,
              productCodeSnapshot: item.productCodeSnapshot || null,
              productNameSnapshot: item.productNameSnapshot,
              descriptionSnapshot: item.descriptionSnapshot || null,
              unit: item.unit || 'Gói',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              vatRate: item.vatRate,
              subtotal: item.subtotal,
              taxableAmount: item.taxableAmount,
              vatAmount: item.vatAmount,
              total: item.total,
              sortOrder: item.sortOrder,
            })),
          },
        },
        include: {
          customer: true,
          items: {
            orderBy: { sortOrder: 'asc' },
            include: {
              product: {
                select: { id: true, code: true, name: true },
              },
            },
          },
        },
      });

      if (markPaid > 0) {
        const today = vietnamToday();
        await recordOrderPaid(tx, {
          customerId: existing.customerId,
          quotationId: id,
          amount: markPaid,
          paidAt: new Date(validatedData.quotationDate > today ? validatedData.quotationDate : today),
          createdBy: currentUser.id,
        });
      }
      return { updated, markPaid };
    });

    if ('error' in result) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    const updatedQuotation = result.updated;
    await createAuditLog({
      req,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'UPDATE_QUOTATION',
      resource: 'QUOTATION',
      resourceId: updatedQuotation.id,
      details: {
        quotationNumber: updatedQuotation.quotationNumber,
        grandTotal: updatedQuotation.grandTotal,
        status: updatedQuotation.status,
        itemCount: updatedQuotation.items.length,
        ...(result.markPaid > 0 ? { markedPaid: result.markPaid } : {}),
      },
    });

    return res.json({
      success: true,
      message: 'Cập nhật đơn hàng thành công',
      data: updatedQuotation,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuotation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user!;
    const { id } = req.params;

    const existing = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng',
      });
    }

    // Row-level permission check: USER can only delete their own quotation
    if (currentUser.role === 'USER' && existing.createdBy !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa đơn hàng này',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await lockCustomer(tx, existing.customerId);
      // Its payments would be left over as credit, and customers never pay more than they owe
      if ((await tx.payment.count({ where: { quotationId: id } })) > 0) {
        return { error: 'Đơn hàng đã có thanh toán. Hãy xóa các khoản thanh toán của đơn trước khi xóa đơn.' };
      }
      // Payments entered on this invoice that went to older debt stay, without the invoice link
      await tx.payment.updateMany({ where: { recordedOnQuotationId: id }, data: { recordedOnQuotationId: null } });
      await tx.quotation.delete({ where: { id } });
      return {};
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
      action: 'DELETE_QUOTATION',
      resource: 'QUOTATION',
      resourceId: id,
      details: {
        quotationNumber: existing.quotationNumber,
        grandTotal: existing.grandTotal,
      },
    });

    return res.json({
      success: true,
      message: 'Đã xóa đơn hàng thành công',
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadQuotationPdf(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user;
    const { id } = req.params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng để xuất PDF',
      });
    }

    // Row-level permission check: USER can only download their own quotation PDF
    if (currentUser && currentUser.role === 'USER' && quotation.createdBy !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền tải PDF đơn hàng này',
      });
    }

    const type = req.query.type as string;
    const isDelivery = type === 'delivery';

    const pdfBuffer = isDelivery
      ? await generateDeliverySlipPdf(quotation as any)
      : await generateQuotationPdf(quotation as any);

    const safeNumber = quotation.quotationNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFilename = isDelivery
      ? `Phieu_Giao_Hang_${safeNumber}.pdf`
      : `Don_Hang_${safeNumber}.pdf`;

    if (currentUser) {
      await createAuditLog({
        req,
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        action: 'EXPORT_PDF',
        resource: 'QUOTATION',
        resourceId: quotation.id,
        details: { quotationNumber: quotation.quotationNumber },
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

export async function downloadQuotationImage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user;
    const { id } = req.params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng để xuất ảnh PNG',
      });
    }

    // Row-level permission check: USER can only download their own quotation image
    if (currentUser && currentUser.role === 'USER' && quotation.createdBy !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền tải ảnh đơn hàng này',
      });
    }

    const type = req.query.type as string;
    const isDelivery = type === 'delivery';

    const pngBuffer = isDelivery
      ? await generateDeliverySlipPng(quotation as any)
      : await generateQuotationPng(quotation as any);

    const safeNumber = quotation.quotationNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFilename = isDelivery
      ? `Phieu_Giao_Hang_${safeNumber}.png`
      : `Don_Hang_${safeNumber}.png`;

    if (currentUser) {
      await createAuditLog({
        req,
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        action: 'EXPORT_IMAGE',
        resource: 'QUOTATION',
        resourceId: quotation.id,
        details: { quotationNumber: quotation.quotationNumber },
      });
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pngBuffer.length);

    return res.send(pngBuffer);
  } catch (error) {
    next(error);
  }
}


