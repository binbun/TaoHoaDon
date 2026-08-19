import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { QuotationSchema, QuotationItemInput } from '@taohoadon/shared';
import { generateQuotationNumber, calculateQuotationTotals } from './quotations.service';
import { generateQuotationPdf } from '../pdf/pdf.service';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getQuotations(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, status, customerId, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

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
        { quotationNumber: { contains: trimmed } },
        { title: { contains: trimmed } },
        { customer: { companyName: { contains: trimmed } } },
        { customer: { contactName: { contains: trimmed } } },
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

export async function getQuotationById(req: Request, res: Response, next: NextFunction) {
  try {
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
        message: 'Không tìm thấy báo giá yêu cầu',
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
      validatedData.items as QuotationItemInput[]
    );

    const newQuotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        customerId: validatedData.customerId,
        quotationDate: new Date(validatedData.quotationDate),
        validUntil: new Date(validatedData.validUntil),
        title: validatedData.title.trim(),
        note: validatedData.note?.trim() || null,
        status: validatedData.status || 'DRAFT',
        subtotal: summary.subtotal,
        discountTotal: summary.discountTotal,
        taxableTotal: summary.taxableTotal,
        vatTotal: summary.vatTotal,
        grandTotal: summary.grandTotal,
        createdBy: req.user?.id || null,
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

    return res.status(201).json({
      success: true,
      message: 'Tạo báo giá thành công',
      data: newQuotation,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateQuotation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const validatedData = QuotationSchema.parse(req.body);

    const existing = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy báo giá cần cập nhật',
      });
    }

    const { calculatedItems, summary } = calculateQuotationTotals(
      validatedData.items as QuotationItemInput[]
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
          validUntil: new Date(validatedData.validUntil),
          title: validatedData.title.trim(),
          note: validatedData.note?.trim() || null,
          status: validatedData.status || existing.status,
          subtotal: summary.subtotal,
          discountTotal: summary.discountTotal,
          taxableTotal: summary.taxableTotal,
          vatTotal: summary.vatTotal,
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

    return res.json({
      success: true,
      message: 'Cập nhật báo giá thành công',
      data: updatedQuotation,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuotation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const existing = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy báo giá',
      });
    }

    await prisma.quotation.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Đã xóa báo giá thành công',
    });
  } catch (error) {
    next(error);
  }
}

export async function duplicateQuotation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
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
        message: 'Không tìm thấy báo giá gốc để nhân bản',
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
        createdBy: req.user?.id || null,
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

    return res.status(201).json({
      success: true,
      message: `Đã nhân bản thành công sang báo giá ${newQuotationNumber}`,
      data: duplicated,
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadQuotationPdf(req: Request, res: Response, next: NextFunction) {
  try {
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
        message: 'Không tìm thấy báo giá để xuất PDF',
      });
    }

    const pdfBuffer = await generateQuotationPdf(quotation as any);

    const safeFilename = `Bao_Gia_${quotation.quotationNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}
