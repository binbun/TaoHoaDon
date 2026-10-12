import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { BrandSchema } from '@taohoadon/shared';

export const DEFAULT_BRANDS = [
  {
    name: 'GROB',
    code: 'GROB',
    color: '#1B9550',
    description: 'Phụ kiện tủ bếp thông minh Inox SUS304 GROB',
    sortOrder: 1,
    active: true,
  },
  {
    name: 'EUPLUS',
    code: 'EUPLUS',
    color: '#0D4EA0',
    description: 'Phụ kiện tủ bếp & thiết bị nhà bếp EUPLUS',
    sortOrder: 2,
    active: true,
  },
  {
    name: 'BLUM',
    code: 'BLUM',
    color: '#FF6724',
    description: 'Tay nâng Aventos & bản lề cao cấp BLUM (Áo)',
    sortOrder: 3,
    active: true,
  },
  {
    name: 'EUROKING',
    code: 'EUROKING',
    color: '#1C4C8F',
    description: 'Phụ kiện inox & tủ bếp EUROKING',
    sortOrder: 4,
    active: true,
  },
  {
    name: 'KINGENBLU',
    code: 'KINGENBLU',
    color: '#247948',
    description: 'Phụ kiện tủ bếp KINGENBLU',
    sortOrder: 5,
    active: true,
  },
];

export async function getBrands(req: Request, res: Response, next: NextFunction) {
  try {
    const { activeOnly } = req.query;

    // Auto-seed default brands if table is empty
    const count = await prisma.brand.count();
    if (count === 0) {
      for (const b of DEFAULT_BRANDS) {
        await prisma.brand.upsert({
          where: { name: b.name },
          update: {},
          create: b,
        });
      }
    }

    const where: any = {};
    if (activeOnly !== 'all') {
      where.active = true;
    }

    const brands = await prisma.brand.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    // Enriched with product count
    const productGroups = await prisma.product.groupBy({
      by: ['brand'],
      _count: { id: true },
    });
    const countMap = new Map(productGroups.map((g) => [g.brand.toUpperCase(), g._count.id]));

    const enriched = brands.map((b) => ({
      ...b,
      productCount: countMap.get(b.name.toUpperCase()) || 0,
    }));

    return res.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
}

export async function createBrand(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = BrandSchema.parse(req.body);
    const normalizedName = validated.name.trim().toUpperCase();

    const existing = await prisma.brand.findUnique({
      where: { name: normalizedName },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Thương hiệu "${normalizedName}" đã tồn tại trong hệ thống`,
      });
    }

    const brand = await prisma.brand.create({
      data: {
        name: normalizedName,
        code: validated.code?.trim().toUpperCase() || normalizedName,
        color: validated.color?.trim() || '#1B9550',
        description: validated.description?.trim() || null,
        sortOrder: validated.sortOrder ?? 0,
        active: validated.active ?? true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo thương hiệu thành công',
      data: { ...brand, productCount: 0 },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateBrand(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const validated = BrandSchema.partial().parse(req.body);

    const existing = await prisma.brand.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thương hiệu',
      });
    }

    const newName = validated.name ? validated.name.trim().toUpperCase() : existing.name;

    // Check if new name collides with another brand
    if (newName !== existing.name) {
      const duplicate = await prisma.brand.findUnique({
        where: { name: newName },
      });
      if (duplicate && duplicate.id !== id) {
        return res.status(400).json({
          success: false,
          message: `Tên thương hiệu "${newName}" đã tồn tại`,
        });
      }
    }

    const updated = await prisma.brand.update({
      where: { id },
      data: {
        ...(validated.name ? { name: newName } : {}),
        ...(validated.code !== undefined ? { code: validated.code?.trim().toUpperCase() || null } : {}),
        ...(validated.color ? { color: validated.color.trim() } : {}),
        ...(validated.description !== undefined ? { description: validated.description?.trim() || null } : {}),
        ...(validated.sortOrder !== undefined ? { sortOrder: validated.sortOrder } : {}),
        ...(validated.active !== undefined ? { active: validated.active } : {}),
      },
    });

    // If brand name was updated, update associated products brand field
    if (newName !== existing.name) {
      await prisma.product.updateMany({
        where: { brand: existing.name },
        data: { brand: newName },
      });
    }

    const count = await prisma.product.count({ where: { brand: updated.name } });

    return res.json({
      success: true,
      message: 'Cập nhật thương hiệu thành công',
      data: { ...updated, productCount: count },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteBrand(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const existing = await prisma.brand.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thương hiệu',
      });
    }

    // Check if brand is referenced by existing products
    const productCount = await prisma.product.count({
      where: { brand: existing.name },
    });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa thương hiệu "${existing.name}" vì đang có ${productCount} sản phẩm thuộc hãng này. Bạn có thể tạm ngừng kích hoạt thay vì xóa.`,
      });
    }

    await prisma.brand.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Đã xóa thương hiệu thành công',
    });
  } catch (error) {
    next(error);
  }
}
