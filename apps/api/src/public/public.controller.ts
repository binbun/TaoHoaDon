import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

// Whitelist of fields exposed to anonymous visitors.
// Never add price, retailPrice, discountRate, vatRate or isFavorite here.
const PUBLIC_PRODUCT_SELECT = {
  id: true,
  code: true,
  name: true,
  brand: true,
  category: true,
  shortDescription: true,
  cabinetWidth: true,
  dimensions: true,
  unit: true,
} as const;

const PUBLIC_BRAND_SELECT = {
  id: true,
  name: true,
  code: true,
  color: true,
  description: true,
} as const;

export async function getPublicProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, brand, category, page, limit } = req.query;

    const where: any = { active: true };
    if (brand && typeof brand === 'string' && brand.trim() !== '') {
      where.brand = brand.trim();
    }
    if (category && typeof category === 'string' && category.trim() !== '') {
      where.category = category.trim();
    }
    if (search && typeof search === 'string' && search.trim() !== '') {
      const trimmed = search.trim();
      where.OR = [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { code: { contains: trimmed, mode: 'insensitive' } },
        { shortDescription: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(60, parseInt(limit as string, 10) || 24));

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: PUBLIC_PRODUCT_SELECT,
        orderBy: [{ brand: 'asc' }, { category: 'asc' }, { code: 'asc' }],
        skip: (pageNum - 1) * limitNum,
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
  } catch (error) {
    next(error);
  }
}

export async function getPublicProductById(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, active: true },
      select: PUBLIC_PRODUCT_SELECT,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    return res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function getPublicCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { active: true, category: { not: '' } },
      orderBy: { category: 'asc' },
    });

    return res.json({
      success: true,
      data: categories.map((c) => c.category).filter((c): c is string => Boolean(c && c.trim())),
    });
  } catch (error) {
    next(error);
  }
}

export async function getPublicBrands(req: Request, res: Response, next: NextFunction) {
  try {
    const brands = await prisma.brand.findMany({
      where: { active: true },
      select: PUBLIC_BRAND_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return res.json({ success: true, data: brands });
  } catch (error) {
    next(error);
  }
}
