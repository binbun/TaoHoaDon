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
      totalRevenueAgg,
      paidRevenueAgg,
      statusGroups,
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
      prisma.quotation.aggregate({
        where: {
          ...baseWhere,
          status: { notIn: ['VOIDED', 'CANCELLED'] },
        },
        _sum: {
          grandTotal: true,
        },
      }),
      prisma.quotation.aggregate({
        where: {
          ...baseWhere,
          status: { in: ['PAID', 'ACCEPTED'] },
        },
        _sum: {
          grandTotal: true,
        },
      }),
      prisma.quotation.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { id: true },
      }),
      prisma.quotation.findMany({
        where: baseWhere,
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          creator: {
            select: { id: true, name: true, email: true },
          },
          items: { take: 3 },
        },
      }),
    ]);

    const totalGrandTotal = Number(totalRevenueAgg._sum.grandTotal || 0);
    const acceptedGrandTotal = Number(paidRevenueAgg._sum.grandTotal || 0);

    const statusDistribution: Record<string, number> = {
      DRAFT: 0,
      ISSUED: 0,
      SENT: 0,
      PARTIALLY_PAID: 0,
      PAID: 0,
      OVERDUE: 0,
      VOIDED: 0,
      CANCELLED: 0,
    };

    statusGroups.forEach((group) => {
      const statusKey = group.status === 'ACCEPTED' ? 'PAID' : group.status;
      statusDistribution[statusKey] = (statusDistribution[statusKey] || 0) + group._count.id;
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

