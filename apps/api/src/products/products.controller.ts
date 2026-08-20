import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { ProductSchema } from '@taohoadon/shared';

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, active, brand, category, cabinetWidth } = req.query;

    const where: any = {};
    if (active !== undefined && active !== '') {
      where.active = active === 'true';
    }
    if (brand && typeof brand === 'string' && brand.trim() !== '') {
      where.brand = brand.trim();
    }
    if (category && typeof category === 'string' && category.trim() !== '') {
      where.category = category.trim();
    }
    if (cabinetWidth && typeof cabinetWidth === 'string' && cabinetWidth.trim() !== '') {
      where.cabinetWidth = cabinetWidth.trim();
    }

    if (search && typeof search === 'string') {
      const trimmed = search.trim();
      where.OR = [
        { name: { contains: trimmed } },
        { code: { contains: trimmed } },
        { oldCode: { contains: trimmed } },
        { shortDescription: { contains: trimmed } },
        { dimensions: { contains: trimmed } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ brand: 'asc' }, { category: 'asc' }, { code: 'asc' }],
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
        oldCode: validatedData.oldCode?.trim() || null,
        name: validatedData.name.trim(),
        brand: validatedData.brand?.trim() || 'GROB',
        category: validatedData.category?.trim() || 'Khác',
        shortDescription: validatedData.shortDescription?.trim() || null,
        cabinetWidth: validatedData.cabinetWidth?.trim() || null,
        dimensions: validatedData.dimensions?.trim() || null,
        unit: validatedData.unit.trim(),
        price: validatedData.price,
        retailPrice: validatedData.retailPrice || 0,
        discountRate: validatedData.discountRate || 0,
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
        ...(validatedData.oldCode !== undefined ? { oldCode: validatedData.oldCode?.trim() || null } : {}),
        ...(validatedData.name ? { name: validatedData.name.trim() } : {}),
        ...(validatedData.brand ? { brand: validatedData.brand.trim() } : {}),
        ...(validatedData.category ? { category: validatedData.category.trim() } : {}),
        ...(validatedData.shortDescription !== undefined ? { shortDescription: validatedData.shortDescription?.trim() || null } : {}),
        ...(validatedData.cabinetWidth !== undefined ? { cabinetWidth: validatedData.cabinetWidth?.trim() || null } : {}),
        ...(validatedData.dimensions !== undefined ? { dimensions: validatedData.dimensions?.trim() || null } : {}),
        ...(validatedData.unit ? { unit: validatedData.unit.trim() } : {}),
        ...(validatedData.price !== undefined ? { price: validatedData.price } : {}),
        ...(validatedData.retailPrice !== undefined ? { retailPrice: validatedData.retailPrice } : {}),
        ...(validatedData.discountRate !== undefined ? { discountRate: validatedData.discountRate } : {}),
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
