import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { CreateUserSchema, UpdateUserSchema, ResetPasswordSchema } from '@taohoadon/shared';
import { createAuditLog } from '../audit/audit.service';

// GET /api/users - List users
export async function getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user!;

    let users;
    if (currentUser.role === 'SUPER_ADMIN') {
      // Super Admin sees all users
      users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          tokenVersion: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (currentUser.role === 'ADMIN') {
      // Admin sees ADMIN and USER, but cannot see password hashes
      users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          tokenVersion: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập danh sách tài khoản' });
    }

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
}

// POST /api/users - Create a new user
export async function createUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user!;
    const validatedData = CreateUserSchema.parse(req.body);

    // Permission check for role assignment
    if (validatedData.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Không thể tạo thêm tài khoản SUPER_ADMIN',
      });
    }

    if (currentUser.role === 'ADMIN') {
      // Admin can ONLY create USER
      if (validatedData.role !== 'USER') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản Quản Trị Viên (ADMIN) chỉ có quyền tạo tài khoản Nhân Viên (USER)',
        });
      }
    } else if (currentUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền tạo tài khoản',
      });
    }

    // Check duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã tồn tại trong hệ thống',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email.toLowerCase(),
        passwordHash,
        role: validatedData.role,
        tokenVersion: 0,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tokenVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      req,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'CREATE_USER',
      resource: 'USER',
      resourceId: newUser.id,
      details: { name: newUser.name, email: newUser.email, role: newUser.role },
    });

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công',
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/users/:id - Update user
export async function updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user!;
    const { id } = req.params;
    const validatedData = UpdateUserSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }

    // Permission checks
    if (currentUser.role === 'ADMIN') {
      // Admin cannot edit SUPER_ADMIN or other ADMINs
      if (targetUser.role === 'SUPER_ADMIN' || (targetUser.role === 'ADMIN' && targetUser.id !== currentUser.id)) {
        return res.status(403).json({
          success: false,
          message: 'Quản Trị Viên không có quyền chỉnh sửa tài khoản cấp cao hơn hoặc cùng cấp',
        });
      }

      // Admin cannot promote a user to ADMIN or SUPER_ADMIN
      if (validatedData.role && validatedData.role !== 'USER') {
        return res.status(403).json({
          success: false,
          message: 'Quản Trị Viên không thể nâng quyền lên Quản trị viên hoặc Super Admin',
        });
      }
    }

    // Cannot change any user role to SUPER_ADMIN
    if (validatedData.role === 'SUPER_ADMIN' && targetUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Không thể nâng quyền thành SUPER_ADMIN',
      });
    }

    const updatePayload: any = {};
    let shouldInvalidateTokens = false;

    if (validatedData.name) updatePayload.name = validatedData.name;
    if (validatedData.email) updatePayload.email = validatedData.email.toLowerCase();
    if (validatedData.role && validatedData.role !== targetUser.role) {
      updatePayload.role = validatedData.role;
      shouldInvalidateTokens = true;
    }
    if (validatedData.password) {
      updatePayload.passwordHash = await bcrypt.hash(validatedData.password, 10);
      shouldInvalidateTokens = true;
    }

    if (shouldInvalidateTokens) {
      updatePayload.tokenVersion = (targetUser.tokenVersion ?? 0) + 1;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updatePayload,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tokenVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      req,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'UPDATE_USER',
      resource: 'USER',
      resourceId: updatedUser.id,
      details: {
        updatedFields: Object.keys(updatePayload),
        targetEmail: updatedUser.email,
        targetRole: updatedUser.role,
      },
    });

    res.json({
      success: true,
      message: 'Cập nhật tài khoản thành công',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/users/:id - Delete user
export async function deleteUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user!;
    const { id } = req.params;

    if (currentUser.id === id) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể tự xóa tài khoản của chính mình',
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }

    // Cannot delete SUPER_ADMIN
    if (targetUser.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Không thể xóa tài khoản SUPER_ADMIN',
      });
    }

    if (currentUser.role === 'ADMIN') {
      // Admin can only delete USER
      if (targetUser.role !== 'USER') {
        return res.status(403).json({
          success: false,
          message: 'Quản Trị Viên chỉ có quyền xóa tài khoản Nhân Viên (USER)',
        });
      }
    }

    await prisma.user.delete({
      where: { id },
    });

    await createAuditLog({
      req,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'DELETE_USER',
      resource: 'USER',
      resourceId: id,
      details: { deletedEmail: targetUser.email, deletedName: targetUser.name, role: targetUser.role },
    });

    res.json({
      success: true,
      message: 'Đã xóa tài khoản thành công',
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/users/:id/reset-password - Reset user password
export async function resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const currentUser = req.user!;
    const { id } = req.params;
    const { newPassword } = ResetPasswordSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }

    if (currentUser.role === 'ADMIN' && (targetUser.role === 'SUPER_ADMIN' || (targetUser.role === 'ADMIN' && targetUser.id !== currentUser.id))) {
      return res.status(403).json({
        success: false,
        message: 'Quản Trị Viên không có quyền đổi mật khẩu cho tài khoản cấp cao hơn hoặc cùng cấp',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const newTokenVersion = (targetUser.tokenVersion ?? 0) + 1;

    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        tokenVersion: newTokenVersion,
      },
    });

    await createAuditLog({
      req,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'RESET_PASSWORD',
      resource: 'USER',
      resourceId: targetUser.id,
      details: { targetEmail: targetUser.email, targetName: targetUser.name },
    });

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công',
    });
  } catch (error) {
    next(error);
  }
}

