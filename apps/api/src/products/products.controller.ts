import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { ProductSchema } from '@taohoadon/shared';

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, active, brand, category, cabinetWidth, page, limit, all } = req.query;

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

    const isAll = all === 'true';
    const isPaginated = !isAll && (page !== undefined || limit !== undefined);

    if (isPaginated) {
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.max(1, Math.min(200, parseInt(limit as string, 10) || 30));
      const skip = (pageNum - 1) * limitNum;

      const [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy: [{ brand: 'asc' }, { category: 'asc' }, { code: 'asc' }],
          skip,
          take: limitNum,
        }),
      ]);

      return res.json({
        success: true,
        data: products,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
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

export async function getProductCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
      where: {
        category: {
          not: '',
        },
      },
      orderBy: { category: 'asc' },
    });

    const categoryList = categories
      .map((c) => c.category)
      .filter((c): c is string => Boolean(c && c.trim()));

    return res.json({
      success: true,
      data: categoryList,
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

export async function bulkImportProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { products, overwriteExisting = true } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách sản phẩm không hợp lệ hoặc rỗng',
      });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ code: string; error: string }> = [];

    await prisma.$transaction(async (tx) => {
      for (const item of products) {
        try {
          const validated = ProductSchema.parse(item);
          const normalizedCode = validated.code.trim().toUpperCase();

          const existing = await tx.product.findUnique({
            where: { code: normalizedCode },
          });

          if (existing) {
            if (overwriteExisting) {
              await tx.product.update({
                where: { id: existing.id },
                data: {
                  oldCode: validated.oldCode?.trim() || null,
                  name: validated.name.trim(),
                  brand: validated.brand?.trim() || existing.brand,
                  category: validated.category?.trim() || existing.category,
                  shortDescription: validated.shortDescription?.trim() || null,
                  cabinetWidth: validated.cabinetWidth?.trim() || null,
                  dimensions: validated.dimensions?.trim() || null,
                  unit: validated.unit?.trim() || existing.unit,
                  price: validated.price,
                  retailPrice: validated.retailPrice !== undefined && validated.retailPrice !== null ? validated.retailPrice : existing.retailPrice,
                  discountRate: validated.discountRate !== undefined && validated.discountRate !== null ? validated.discountRate : existing.discountRate,
                  vatRate: validated.vatRate !== undefined && validated.vatRate !== null ? validated.vatRate : existing.vatRate,
                  active: validated.active !== undefined && validated.active !== null ? validated.active : existing.active,
                },
              });
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            await tx.product.create({
              data: {
                code: normalizedCode,
                oldCode: validated.oldCode?.trim() || null,
                name: validated.name.trim(),
                brand: validated.brand?.trim() || 'GROB',
                category: validated.category?.trim() || 'Khác',
                shortDescription: validated.shortDescription?.trim() || null,
                cabinetWidth: validated.cabinetWidth?.trim() || null,
                dimensions: validated.dimensions?.trim() || null,
                unit: validated.unit?.trim() || 'Bộ',
                price: validated.price,
                retailPrice: validated.retailPrice ?? 0,
                discountRate: validated.discountRate ?? 0,
                vatRate: validated.vatRate ?? 0,
                active: validated.active ?? true,
              },
            });
            createdCount++;
          }
        } catch (err: any) {
          errors.push({
            code: item.code || 'UNKNOWN',
            error: err.errors?.[0]?.message || err.message || 'Lỗi dữ liệu sản phẩm',
          });
        }
      }
    });

    return res.json({
      success: true,
      message: `Nhập sản phẩm hoàn tất: Thêm mới ${createdCount}, Cập nhật ${updatedCount}, Bỏ qua ${skippedCount}`,
      data: {
        createdCount,
        updatedCount,
        skippedCount,
        errors,
      },
    });
  } catch (error) {
    next(error);
  }
}
