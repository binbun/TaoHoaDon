import { Request } from 'express';
import { prisma } from '../prisma';

export interface CreateAuditLogParams {
  req?: Request;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: any;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    const { req, userId, userName, userEmail, action, resource, resourceId, details } = params;

    let ipAddress: string | null = null;
    if (req) {
      const forwarded = req.headers['x-forwarded-for'];
      if (typeof forwarded === 'string') {
        ipAddress = forwarded.split(',')[0].trim();
      } else if (Array.isArray(forwarded)) {
        ipAddress = forwarded[0];
      } else {
        ipAddress = req.ip || req.socket?.remoteAddress || null;
      }
    }

    const detailsString = details
      ? typeof details === 'string'
        ? details
        : JSON.stringify(details)
      : null;

    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userName: userName || null,
        userEmail: userEmail || null,
        action,
        resource,
        resourceId: resourceId || null,
        details: detailsString,
        ipAddress,
      },
    });
  } catch (error) {
    // Non-blocking log failure
    console.error('Lỗi khi ghi nhật ký hoạt động (AuditLog):', error);
  }
}
