import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getDashboardStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const baseWhere: any = {};
    if (currentUser && currentUser.role === 'USER') {
      baseWhere.createdBy = currentUser.id;
    }

    const [
      totalQuotations,
      monthQuotations,
      allQuotations,
      recentQuotations,
    ] = await Promise.all([
      prisma.quotation.count({ where: baseWhere }),
      prisma.quotation.count({
        where: {
          ...baseWhere,
          createdAt: {
            gte: startOfMonth,
          },
        },
      }),
      prisma.quotation.findMany({
        where: baseWhere,
        select: {
          status: true,
          grandTotal: true,
        },
      }),
      prisma.quotation.findMany({
        where: baseWhere,
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
      PAID: 0,
    };

    allQuotations.forEach((q) => {
      totalGrandTotal += q.grandTotal;
      if (q.status === 'PAID' || q.status === 'ACCEPTED') {
        acceptedGrandTotal += q.grandTotal;
        statusDistribution.PAID = (statusDistribution.PAID || 0) + 1;
      } else if (statusDistribution[q.status] !== undefined) {
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

