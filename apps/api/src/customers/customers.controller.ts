import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { CustomerSchema } from '@taohoadon/shared';
import { getCustomerDebtMap } from '../payments/payments.service';

export async function getCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = req.query;

    const where: any = {};
    if (search && typeof search === 'string') {
      const trimmed = search.trim();
      where.OR = [
        { companyName: { contains: trimmed } },
        { contactName: { contains: trimmed } },
        { email: { contains: trimmed } },
        { phone: { contains: trimmed } },
        { taxCode: { contains: trimmed } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { quotations: true },
        },
      },
    });

    const debtMap = await getCustomerDebtMap(customers);

    return res.json({
      success: true,
      data: customers.map((c) => ({ ...c, currentDebt: debtMap.get(c.id) ?? 0 })),
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        quotations: {
          orderBy: { quotationDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin khách hàng',
      });
    }

    return res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = CustomerSchema.parse(req.body);

    const customer = await prisma.customer.create({
      data: {
        companyName: validatedData.companyName.trim(),
        contactName: validatedData.contactName?.trim() || null,
        email: validatedData.email?.trim() || null,
        phone: validatedData.phone?.trim() || null,
        address: validatedData.address?.trim() || null,
        taxCode: validatedData.taxCode?.trim() || null,
        openingDebt: validatedData.openingDebt ?? 0,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Thêm mới khách hàng thành công',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const validatedData = CustomerSchema.partial().parse(req.body);

    const existing = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin khách hàng',
      });
    }

    // "Dư nợ cũ" on every order already includes the opening debt, so shift unpaid orders by the change
    const openingDelta =
      validatedData.openingDebt !== undefined ? Math.round(validatedData.openingDebt - existing.openingDebt) : 0;

    const { updated, adjustedQuotations } = await prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id },
        data: {
          ...(validatedData.companyName ? { companyName: validatedData.companyName.trim() } : {}),
          ...(validatedData.contactName !== undefined ? { contactName: validatedData.contactName?.trim() || null } : {}),
          ...(validatedData.email !== undefined ? { email: validatedData.email?.trim() || null } : {}),
          ...(validatedData.phone !== undefined ? { phone: validatedData.phone?.trim() || null } : {}),
          ...(validatedData.address !== undefined ? { address: validatedData.address?.trim() || null } : {}),
          ...(validatedData.taxCode !== undefined ? { taxCode: validatedData.taxCode?.trim() || null } : {}),
          ...(validatedData.openingDebt !== undefined ? { openingDebt: validatedData.openingDebt } : {}),
        },
      });

      let adjustedQuotations = 0;
      if (openingDelta !== 0) {
        const orders = await tx.quotation.findMany({
          where: { customerId: id, status: { notIn: ['PAID', 'ACCEPTED'] } },
          select: { id: true, previousDebt: true, grandTotal: true },
        });
        for (const order of orders) {
          const previousDebt = Math.max(0, order.previousDebt + openingDelta);
          if (previousDebt === order.previousDebt) continue;
          await tx.quotation.update({
            where: { id: order.id },
            data: { previousDebt, grandTotal: order.grandTotal - order.previousDebt + previousDebt },
          });
          adjustedQuotations++;
        }
      }

      return { updated, adjustedQuotations };
    });

    return res.json({
      success: true,
      message:
        adjustedQuotations > 0
          ? `Cập nhật thông tin khách hàng thành công, đã cập nhật Dư nợ cũ cho ${adjustedQuotations} đơn hàng`
          : 'Cập nhật thông tin khách hàng thành công',
      data: { ...updated, adjustedQuotations },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const count = await prisma.quotation.count({
      where: { customerId: id },
    });

    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa khách hàng này vì đang có ${count} đơn hàng liên kết`,
      });
    }

    const paymentCount = await prisma.payment.count({
      where: { customerId: id },
    });

    if (paymentCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa khách hàng này vì đã có lịch sử thanh toán',
      });
    }

    await prisma.customer.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Đã xóa khách hàng thành công',
    });
  } catch (error) {
    next(error);
  }
}
