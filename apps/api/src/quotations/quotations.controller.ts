import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import {
  QuotationSchema,
  QuotationItemInput,
  CalculatedQuotationItem,
  VoidQuotationSchema,
  CreditNoteSchema,
  RecordPaymentSchema,
} from '@taohoadon/shared';
import { generateQuotationNumber, calculateQuotationTotals } from './quotations.service';
import { generateQuotationPdf, generateDeliverySlipPdf } from '../pdf/pdf.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { createAuditLog } from '../audit/audit.service';

export async function getQuotations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user;
    const { search, status, customerId, creatorId, page = '1', limit = '50' } = req.query;

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

    return res.json({
      success: true,
      data: quotation,
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

    const { calculatedItems, summary } = calculateQuotationTotals(
      validatedData.items as QuotationItemInput[],
      validatedData.previousDebt || 0
    );

    const newQuotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        customerId: validatedData.customerId,
        quotationDate: new Date(validatedData.quotationDate),
        validUntil: validatedData.validUntil ? new Date(validatedData.validUntil) : new Date(validatedData.quotationDate),
        title: validatedData.title.trim(),
        note: validatedData.note?.trim() || null,
        status: validatedData.status || 'DRAFT',
        currency: validatedData.currency || 'VND',
        invoiceType: validatedData.invoiceType || 'STANDARD',
        originalInvoiceId: validatedData.originalInvoiceId || null,
        subtotal: summary.subtotal,
        discountTotal: summary.discountTotal,
        taxableTotal: summary.taxableTotal,
        vatTotal: summary.vatTotal,
        previousDebt: summary.previousDebt || 0,
        grandTotal: summary.grandTotal,
        balanceDue: summary.grandTotal,
        issuedAt:
          validatedData.status === 'ISSUED' ||
          validatedData.status === 'SENT' ||
          validatedData.status === 'PAID'
            ? new Date()
            : null,
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
    const validatedData = QuotationSchema.parse(req.body);

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

    // Immutability Check: Locked invoices cannot be modified directly
    const LOCKED_STATUSES = [
      'ISSUED',
      'SENT',
      'PARTIALLY_PAID',
      'PAID',
      'OVERDUE',
      'VOIDED',
      'CANCELLED',
    ];
    if (LOCKED_STATUSES.includes(existing.status)) {
      return res.status(400).json({
        success: false,
        message: `Hóa đơn đã ở trạng thái "${existing.status}" và đã được khóa chứng từ. Không thể chỉnh sửa trực tiếp. Vui lòng lập Hóa đơn điều chỉnh (Credit Note) hoặc Hủy hóa đơn (Void).`,
      });
    }

    const { calculatedItems, summary } = calculateQuotationTotals(
      validatedData.items as QuotationItemInput[],
      validatedData.previousDebt || 0
    );

    // Run in transaction: delete old items, create new items, update quotation
    const updatedQuotation = await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({
        where: { quotationId: id },
      });

      return tx.quotation.update({
        where: { id },
        data: {
          customerId: validatedData.customerId,
          quotationDate: new Date(validatedData.quotationDate),
          validUntil: validatedData.validUntil ? new Date(validatedData.validUntil) : new Date(validatedData.quotationDate),
          title: validatedData.title.trim(),
          note: validatedData.note?.trim() || null,
          status: validatedData.status || existing.status,
          currency: validatedData.currency || existing.currency,
          subtotal: summary.subtotal,
          discountTotal: summary.discountTotal,
          taxableTotal: summary.taxableTotal,
          vatTotal: summary.vatTotal,
          previousDebt: summary.previousDebt || 0,
          grandTotal: summary.grandTotal,
          balanceDue: summary.grandTotal,
          issuedAt:
            (validatedData.status === 'ISSUED' ||
              validatedData.status === 'SENT' ||
              validatedData.status === 'PAID') &&
            !existing.issuedAt
              ? new Date()
              : existing.issuedAt,
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
    });

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
        before: {
          status: existing.status,
          grandTotal: existing.grandTotal,
        },
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
      include: {
        items: true,
      },
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

    // Hard delete prevention: Only DRAFT quotations can be deleted
    if (existing.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa hóa đơn ở trạng thái "${existing.status}". Theo quy tắc kế toán, chỉ hóa đơn Bản nháp (DRAFT) mới có thể xóa. Hóa đơn đã phát hành hoặc thanh toán phải thực hiện Hủy hóa đơn (Void) để bảo toàn chuỗi số chứng từ.`,
      });
    }

    await prisma.quotation.delete({
      where: { id },
    });

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
        itemCount: existing.items.length,
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

export async function duplicateQuotation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user!;
    const { id } = req.params;

    const source = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!source) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng gốc để nhân bản',
      });
    }

    // Row-level permission check: USER can only duplicate their own quotation
    if (currentUser.role === 'USER' && source.createdBy !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền nhân bản đơn hàng này',
      });
    }

    const newQuotationNumber = await generateQuotationNumber();
    const newDate = new Date();
    const newValidUntil = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    const duplicated = await prisma.quotation.create({
      data: {
        quotationNumber: newQuotationNumber,
        customerId: source.customerId,
        quotationDate: newDate,
        validUntil: newValidUntil,
        title: `${source.title} (Bản sao)`,
        note: source.note,
        status: 'DRAFT',
        subtotal: source.subtotal,
        discountTotal: source.discountTotal,
        taxableTotal: source.taxableTotal,
        vatTotal: source.vatTotal,
        grandTotal: source.grandTotal,
        createdBy: currentUser.id,
        items: {
          create: source.items.map((item) => ({
            productId: item.productId,
            productCodeSnapshot: item.productCodeSnapshot || (item as any).product?.code || null,
            productNameSnapshot: item.productNameSnapshot,
            descriptionSnapshot: item.descriptionSnapshot,
            unit: item.unit,
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

    await createAuditLog({
      req,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'DUPLICATE_QUOTATION',
      resource: 'QUOTATION',
      resourceId: duplicated.id,
      details: {
        sourceQuotationNumber: source.quotationNumber,
        newQuotationNumber: duplicated.quotationNumber,
        grandTotal: duplicated.grandTotal,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Đã nhân bản thành công sang đơn hàng ${newQuotationNumber}`,
      data: duplicated,
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

/**
 * Transitions a DRAFT quotation into an officially locked, ISSUED invoice.
 */
export async function issueQuotation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user!;
    const { id } = req.params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng',
      });
    }

    if (currentUser.role === 'USER' && quotation.createdBy !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền phát hành đơn hàng này',
      });
    }

    if (quotation.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: `Đơn hàng đang ở trạng thái "${quotation.status}", không thể thực hiện phát hành lại.`,
      });
    }

    const issued = await prisma.quotation.update({
      where: { id },
      data: {
        status: 'ISSUED',
        issuedAt: new Date(),
        balanceDue: quotation.grandTotal,
      },
      include: {
        customer: true,
        items: true,
      },
    });

    await createAuditLog({
      req,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'ISSUE_QUOTATION',
      resource: 'QUOTATION',
      resourceId: issued.id,
      details: {
        quotationNumber: issued.quotationNumber,
        grandTotal: issued.grandTotal,
      },
    });

    return res.json({
      success: true,
      message: `Đã phát hành chính thức hóa đơn ${issued.quotationNumber}. Chứng từ hiện đã được khóa để bảo vệ tính toàn vẹn dữ liệu.`,
      data: issued,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Marks an issued invoice as VOIDED with an explicit reason, preventing hard-deletes.
 */
export async function voidQuotation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user!;
    const { id } = req.params;
    const { reason } = VoidQuotationSchema.parse(req.body);

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        payments: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hóa đơn cần hủy',
      });
    }

    if (currentUser.role === 'USER' && quotation.createdBy !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy hóa đơn này',
      });
    }

    if (quotation.status === 'VOIDED') {
      return res.status(400).json({
        success: false,
        message: 'Hóa đơn này đã được hủy trước đó.',
      });
    }

    if (quotation.payments && quotation.payments.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          'Hóa đơn đã có các giao dịch thanh toán được ghi nhận. Vui lòng lập Hóa đơn điều chỉnh / giảm trừ (Credit Note) thay vì Hủy toàn bộ hóa đơn.',
      });
    }

    const voided = await prisma.quotation.update({
      where: { id },
      data: {
        status: 'VOIDED',
        voidedAt: new Date(),
        voidReason: reason,
        voidedBy: currentUser.id,
        balanceDue: 0,
      },
    });

    await createAuditLog({
      req,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'VOID_QUOTATION',
      resource: 'QUOTATION',
      resourceId: voided.id,
      details: {
        quotationNumber: voided.quotationNumber,
        reason,
      },
    });

    return res.json({
      success: true,
      message: `Đã hủy hóa đơn ${voided.quotationNumber} thành công.`,
      data: voided,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Creates a Credit Note (Hóa đơn điều chỉnh / giảm trừ) referencing an original invoice.
 */
export async function createCreditNote(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user!;
    const { id } = req.params;
    const validatedData = CreditNoteSchema.parse(req.body);

    const original = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!original) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hóa đơn gốc cần điều chỉnh',
      });
    }

    if (original.status === 'DRAFT' || original.status === 'VOIDED' || original.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: `Không thể lập hóa đơn điều chỉnh cho hóa đơn ở trạng thái "${original.status}". Chỉ hóa đơn đã phát hành mới có thể điều chỉnh.`,
      });
    }

    const { calculatedItems, summary } = calculateQuotationTotals(
      validatedData.items as QuotationItemInput[],
      0
    );

    const currentYear = new Date().getFullYear();
    const cnNumber = await generateQuotationNumber(`CN-${currentYear}-`);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Credit Note Quotation record
      const creditNote = await tx.quotation.create({
        data: {
          quotationNumber: cnNumber,
          invoiceType: 'CREDIT_NOTE',
          originalInvoiceId: original.id,
          customerId: original.customerId,
          quotationDate: new Date(),
          validUntil: new Date(),
          title: `HÓA ĐƠN ĐIỀU CHỈNH - ${original.quotationNumber}`,
          note: validatedData.note?.trim() || `Điều chỉnh cho hóa đơn ${original.quotationNumber}. Lý do: ${validatedData.reason}`,
          status: 'ISSUED',
          currency: original.currency,
          subtotal: summary.subtotal,
          discountTotal: summary.discountTotal,
          taxableTotal: summary.taxableTotal,
          vatTotal: summary.vatTotal,
          previousDebt: 0,
          grandTotal: summary.grandTotal,
          balanceDue: 0,
          issuedAt: new Date(),
          createdBy: currentUser.id,
          items: {
            create: calculatedItems.map((item: CalculatedQuotationItem) => ({
              productId: item.productId || null,
              productCodeSnapshot: item.productCodeSnapshot || null,
              productNameSnapshot: item.productNameSnapshot,
              descriptionSnapshot: item.descriptionSnapshot || null,
              unit: item.unit || 'Bộ',
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
          items: true,
        },
      });

      // 2. Adjust remaining balance of original invoice
      const updatedBalanceDue = Math.max(0, Number(original.balanceDue) - summary.grandTotal);
      await tx.quotation.update({
        where: { id: original.id },
        data: {
          balanceDue: updatedBalanceDue,
        },
      });

      return creditNote;
    });

    await createAuditLog({
      req,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'CREATE_CREDIT_NOTE',
      resource: 'QUOTATION',
      resourceId: result.id,
      details: {
        creditNoteNumber: result.quotationNumber,
        originalQuotationNumber: original.quotationNumber,
        adjustmentTotal: result.grandTotal,
        reason: validatedData.reason,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Đã tạo hóa đơn điều chỉnh ${result.quotationNumber} thành công.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Records a payment against an invoice and updates balanceDue / status atomically.
 */
export async function recordPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user!;
    const { id } = req.params;
    const validatedData = RecordPaymentSchema.parse(req.body);

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hóa đơn cần thanh toán',
      });
    }

    if (quotation.status === 'DRAFT' || quotation.status === 'VOIDED' || quotation.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: `Không thể ghi nhận thanh toán cho hóa đơn ở trạng thái "${quotation.status}".`,
      });
    }

    const paymentResult = await prisma.$transaction(async (tx) => {
      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          quotationId: quotation.id,
          amount: validatedData.amount,
          currency: quotation.currency,
          gateway: validatedData.gateway,
          referenceCode: validatedData.referenceCode || null,
          note: validatedData.note || null,
          paymentDate: validatedData.paymentDate ? new Date(validatedData.paymentDate) : new Date(),
          recordedBy: currentUser.id,
        },
      });

      // 2. Aggregate all payments
      const totalPaidAgg = await tx.payment.aggregate({
        where: { quotationId: quotation.id },
        _sum: { amount: true },
      });

      const totalPaid = Number(totalPaidAgg._sum.amount || 0);
      const grandTotalNum = Number(quotation.grandTotal);
      const newBalanceDue = Math.max(0, grandTotalNum - totalPaid);

      // Determine updated status
      let newStatus = quotation.status;
      if (newBalanceDue <= 0) {
        newStatus = 'PAID';
      } else if (totalPaid > 0) {
        newStatus = 'PARTIALLY_PAID';
      }

      const updatedQuotation = await tx.quotation.update({
        where: { id: quotation.id },
        data: {
          balanceDue: newBalanceDue,
          status: newStatus,
        },
      });

      return { payment, updatedQuotation };
    });

    await createAuditLog({
      req,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'RECORD_PAYMENT',
      resource: 'PAYMENT',
      resourceId: paymentResult.payment.id,
      details: {
        quotationNumber: quotation.quotationNumber,
        amount: validatedData.amount,
        balanceDue: paymentResult.updatedQuotation.balanceDue,
        newStatus: paymentResult.updatedQuotation.status,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Đã ghi nhận thanh toán ${validatedData.amount.toLocaleString('vi-VN')} đ thành công.`,
      data: paymentResult,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves all payment transactions for a given quotation.
 */
export async function getQuotationPayments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const payments = await prisma.payment.findMany({
      where: { quotationId: id },
      orderBy: { paymentDate: 'desc' },
    });

    return res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
}

