import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { ProductSchema } from '@taohoadon/shared';

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, active } = req.query;

    const where: any = {};
    if (active !== undefined && active !== '') {
      where.active = active === 'true';
    }

    if (search && typeof search === 'string') {
      const trimmed = search.trim();
      where.OR = [
        { name: { contains: trimmed } },
        { code: { contains: trimmed } },
        { shortDescription: { contains: trimmed } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    return res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = ProductSchema.parse(req.body);

    const existing = await prisma.product.findUnique({
      where: { code: validatedData.code },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Mã sản phẩm '${validatedData.code}' đã tồn tại trong hệ thống`,
      });
    }

    const product = await prisma.product.create({
      data: {
        code: validatedData.code.trim().toUpperCase(),
        name: validatedData.name.trim(),
        shortDescription: validatedData.shortDescription?.trim() || null,
        unit: validatedData.unit.trim(),
        price: validatedData.price,
        vatRate: validatedData.vatRate,
        active: validatedData.active,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo sản phẩm thành công',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const validatedData = ProductSchema.partial().parse(req.body);

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    if (validatedData.code && validatedData.code !== existing.code) {
      const duplicate = await prisma.product.findUnique({
        where: { code: validatedData.code },
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Mã sản phẩm '${validatedData.code}' đã tồn tại trong hệ thống`,
        });
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(validatedData.code ? { code: validatedData.code.trim().toUpperCase() } : {}),
        ...(validatedData.name ? { name: validatedData.name.trim() } : {}),
        ...(validatedData.shortDescription !== undefined ? { shortDescription: validatedData.shortDescription?.trim() || null } : {}),
        ...(validatedData.unit ? { unit: validatedData.unit.trim() } : {}),
        ...(validatedData.price !== undefined ? { price: validatedData.price } : {}),
        ...(validatedData.vatRate !== undefined ? { vatRate: validatedData.vatRate } : {}),
        ...(validatedData.active !== undefined ? { active: validatedData.active } : {}),
      },
    });

    return res.json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { quotationItems: true } } },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    // If product has been referenced in quotations, soft deactivate or allow delete since quotation items have snapshots
    await prisma.product.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Đã xóa sản phẩm thành công',
    });
  } catch (error) {
    next(error);
  }
}
