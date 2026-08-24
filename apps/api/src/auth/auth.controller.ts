import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { LoginSchema, ChangePasswordSchema } from '@taohoadon/shared';
import { AuthenticatedRequest } from '../middleware/auth';
import { createAuditLog } from '../audit/audit.service';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-quotation-jwt-token-key-2026';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      await createAuditLog({
        req,
        action: 'AUTH_LOGIN_FAILED',
        resource: 'AUTH',
        details: { email, reason: 'Email không tồn tại' },
      });

      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác',
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      await createAuditLog({
        req,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        action: 'AUTH_LOGIN_FAILED',
        resource: 'AUTH',
        details: { email, reason: 'Sai mật khẩu' },
      });

      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác',
      });
    }

    const tokenVersion = user.tokenVersion ?? 0;
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, tokenVersion },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await createAuditLog({
      req,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      action: 'AUTH_LOGIN_SUCCESS',
      resource: 'AUTH',
      resourceId: user.id,
      details: { role: user.role },
    });

    return res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tokenVersion,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: AuthenticatedRequest, res: Response) {
  if (req.user) {
    await createAuditLog({
      req,
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'AUTH_LOGOUT',
      resource: 'AUTH',
      resourceId: req.user.id,
    });
  }

  return res.json({
    success: true,
    message: 'Đăng xuất thành công',
  });
}

export async function changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user!;
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Tài khoản không tồn tại',
      });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      await createAuditLog({
        req,
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        action: 'CHANGE_PASSWORD_FAILED',
        resource: 'USER',
        resourceId: currentUser.id,
        details: { reason: 'Mật khẩu hiện tại không đúng' },
      });

      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác',
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    const newTokenVersion = (user.tokenVersion ?? 0) + 1;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        tokenVersion: newTokenVersion,
      },
    });

    // Generate new token with updated tokenVersion
    const newToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, tokenVersion: newTokenVersion },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await createAuditLog({
      req,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      action: 'CHANGE_PASSWORD_SUCCESS',
      resource: 'USER',
      resourceId: user.id,
      details: { tokenVersion: newTokenVersion },
    });

    return res.json({
      success: true,
      message: 'Đổi mật khẩu thành công',
      data: {
        token: newToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  return res.json({
    success: true,
    data: req.user,
  });
}

