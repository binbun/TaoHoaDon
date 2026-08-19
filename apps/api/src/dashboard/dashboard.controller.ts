import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalQuotations,
      monthQuotations,
      allQuotations,
      recentQuotations,
    ] = await Promise.all([
      prisma.quotation.count(),
      prisma.quotation.count({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
        },
      }),
      prisma.quotation.findMany({
        select: {
          status: true,
          grandTotal: true,
        },
      }),
      prisma.quotation.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          items: { take: 3 },
        },
      }),
    ]);

    let totalGrandTotal = 0;
    let acceptedGrandTotal = 0;
    const statusDistribution: Record<string, number> = {
      DRAFT: 0,
      SENT: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      EXPIRED: 0,
    };

    allQuotations.forEach((q) => {
      totalGrandTotal += q.grandTotal;
      if (q.status === 'ACCEPTED') {
        acceptedGrandTotal += q.grandTotal;
      }
      if (statusDistribution[q.status] !== undefined) {
        statusDistribution[q.status]++;
      }
    });

    return res.json({
      success: true,
      data: {
        totalQuotations,
        monthQuotations,
        totalGrandTotal,
        acceptedGrandTotal,
        statusDistribution,
        recentQuotations,
      },
    });
  } catch (error) {
    next(error);
  }
}
