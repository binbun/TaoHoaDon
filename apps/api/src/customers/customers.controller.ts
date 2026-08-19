import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { CustomerSchema } from '@taohoadon/shared';

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

    return res.json({
      success: true,
      data: customers,
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

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(validatedData.companyName ? { companyName: validatedData.companyName.trim() } : {}),
        ...(validatedData.contactName !== undefined ? { contactName: validatedData.contactName?.trim() || null } : {}),
        ...(validatedData.email !== undefined ? { email: validatedData.email?.trim() || null } : {}),
        ...(validatedData.phone !== undefined ? { phone: validatedData.phone?.trim() || null } : {}),
        ...(validatedData.address !== undefined ? { address: validatedData.address?.trim() || null } : {}),
        ...(validatedData.taxCode !== undefined ? { taxCode: validatedData.taxCode?.trim() || null } : {}),
      },
    });

    return res.json({
      success: true,
      message: 'Cập nhật thông tin khách hàng thành công',
      data: updated,
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
        message: `Không thể xóa khách hàng này vì đang có ${count} báo giá liên kết`,
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
