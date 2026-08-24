import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { QuotationSchema, QuotationItemInput } from '@taohoadon/shared';
import { generateQuotationNumber, calculateQuotationTotals } from './quotations.service';
import { generateQuotationPdf } from '../pdf/pdf.service';
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
        subtotal: summary.subtotal,
        discountTotal: summary.discountTotal,
        taxableTotal: summary.taxableTotal,
        vatTotal: summary.vatTotal,
        previousDebt: summary.previousDebt || 0,
        grandTotal: summary.grandTotal,
        createdBy: currentUser.id,
        items: {
          create: calculatedItems.map((item) => ({
            productId: item.productId || null,
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
        items: true,
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
          subtotal: summary.subtotal,
          discountTotal: summary.discountTotal,
          taxableTotal: summary.taxableTotal,
          vatTotal: summary.vatTotal,
          previousDebt: summary.previousDebt || 0,
          grandTotal: summary.grandTotal,
          items: {
            create: calculatedItems.map((item) => ({
              productId: item.productId || null,
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
        items: {
          orderBy: { sortOrder: 'asc' },
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

    const pdfBuffer = await generateQuotationPdf(quotation as any);

    const safeFilename = `Don_Hang_${quotation.quotationNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

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

