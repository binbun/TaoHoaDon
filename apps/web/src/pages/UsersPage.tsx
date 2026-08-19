import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { User, UserRole, formatDate } from '@taohoadon/shared';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import {
  ShieldCheck,
  UserPlus,
  Edit2,
  Trash2,
  Key,
  Shield,
  User as UserIcon,
  Crown,
  Search,
  Check,
  AlertCircle,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // Search & Filter
  const [search, setSearch] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('USER');

  // Reset password form
  const [newPassword, setNewPassword] = useState('');

  // Fetch Users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => apiClient('/users'),
  });

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('USER');
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
  };

  // Open Reset Password Modal
  const handleOpenResetPasswordModal = (u: User) => {
    setResettingUser(u);
    setNewPassword('');
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient('/users', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      success('Tạo tài khoản người dùng mới thành công!');
      setIsCreateModalOpen(false);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể tạo tài khoản');
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient(`/users/${id}`, { method: 'PATCH', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      success('Cập nhật tài khoản thành công!');
      setEditingUser(null);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể cập nhật tài khoản');
    },
  });

  // Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      apiClient(`/users/${id}/reset-password`, { method: 'POST', data: { newPassword } }),
    onSuccess: () => {
      success('Đặt lại mật khẩu thành công!');
      setResettingUser(null);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể đặt lại mật khẩu');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      success('Đã xóa tài khoản thành công!');
      setDeletingUser(null);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể xóa tài khoản');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      error('Vui lòng điền đầy đủ họ tên, email và mật khẩu');
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !name.trim() || !email.trim()) {
      error('Vui lòng điền đầy đủ họ tên và email');
      return;
    }

    updateMutation.mutate({
      id: editingUser.id,
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: isSuperAdmin ? role : undefined,
      },
    });
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || newPassword.length < 6) {
      error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    resetPasswordMutation.mutate({
      id: resettingUser.id,
      newPassword,
    });
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const renderRoleBadge = (userRole: UserRole) => {
    switch (userRole) {
      case 'SUPER_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-300/80 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-xs">
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            <span>SUPER ADMIN</span>
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Quản trị viên</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-medium">
            <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Nhân viên</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <span>Quản Lý Tài Khoản & Phân Quyền</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSuperAdmin
              ? 'Tài khoản Super Admin có quyền tạo thêm Quản trị viên (ADMIN) và Nhân viên (USER).'
              : 'Tài khoản Quản trị viên (ADMIN) có quyền tạo và quản lý tài khoản Nhân viên (USER).'}
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<UserPlus className="w-4 h-4" />}
          onClick={handleOpenCreateModal}
        >
          + Thêm tài khoản mới
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="max-w-md">
          <Input
            placeholder="Tìm theo họ tên hoặc email người dùng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftElement={<Search className="w-4 h-4" />}
          />
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        {isLoading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Người dùng</th>
                  <th className="py-3 px-4">Email đăng nhập</th>
                  <th className="py-3 px-4 text-center">Vai trò phân quyền</th>
                  <th className="py-3 px-4">Ngày tạo</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const canEdit =
                    isSuperAdmin || (currentUser?.role === 'ADMIN' && u.role === 'USER') || isSelf;
                  const canDelete =
                    !isSelf &&
                    u.role !== 'SUPER_ADMIN' &&
                    (isSuperAdmin || (currentUser?.role === 'ADMIN' && u.role === 'USER'));
                  const canResetPassword =
                    isSuperAdmin || (currentUser?.role === 'ADMIN' && u.role === 'USER') || isSelf;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-300">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.2 rounded">
                                  Bạn
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                        {u.email}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {renderRoleBadge(u.role)}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(u.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1">
                        {canResetPassword && (
                          <button
                            onClick={() => handleOpenResetPasswordModal(u)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                            title="Đặt lại mật khẩu"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                        )}

                        {canEdit && (
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Chỉnh sửa thông tin"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Không tìm thấy tài khoản nào"
            description="Hãy bấm Thêm tài khoản mới để tạo thêm nhân viên hoặc quản trị viên."
            actionText="Tạo tài khoản đầu tiên"
            onAction={handleOpenCreateModal}
            icon={<UserPlus className="w-10 h-10" />}
          />
        )}
      </Card>

      {/* Modal: Create User */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Thêm Tài Khoản Mới"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Họ và tên"
            placeholder="VD: Nguyễn Văn Nam"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Email đăng nhập"
            type="email"
            placeholder="VD: nam.nv@euplus.vn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Mật khẩu khởi tạo"
            type="password"
            placeholder="Tối thiểu 6 ký tự"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Phân quyền tài khoản
            </label>
            {isSuperAdmin ? (
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="USER">Nhân viên (USER) - Tạo & quản lý báo giá, sản phẩm</option>
                <option value="ADMIN">Quản trị viên (ADMIN) - Quản lý nhân viên & toàn bộ báo giá</option>
              </select>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
                  <UserIcon className="w-4 h-4 text-emerald-600" />
                  <span>Quyền hạn: Nhân viên (USER)</span>
                </div>
                <p>Tài khoản Quản trị viên (ADMIN) chỉ có quyền khởi tạo tài khoản cấp Nhân viên.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending}
            >
              Tạo tài khoản
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit User */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Chỉnh Sửa Tài Khoản"
        maxWidth="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Họ và tên"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Email đăng nhập"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {isSuperAdmin && editingUser?.role !== 'SUPER_ADMIN' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Vai trò phân quyền
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="USER">Nhân viên (USER)</option>
                <option value="ADMIN">Quản trị viên (ADMIN)</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingUser(null)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateMutation.isPending}
            >
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Reset Password */}
      <Modal
        isOpen={!!resettingUser}
        onClose={() => setResettingUser(null)}
        title={`Đặt Lại Mật Khẩu: ${resettingUser?.name || ''}`}
        maxWidth="sm"
      >
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Nhập mật khẩu mới cho tài khoản <strong className="text-slate-800">{resettingUser?.email}</strong>
          </p>

          <Input
            label="Mật khẩu mới"
            type="password"
            placeholder="Tối thiểu 6 ký tự"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResettingUser(null)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={resetPasswordMutation.isPending}
            >
              Cập nhật mật khẩu
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete User Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
        title="Xác nhận xóa tài khoản"
        message={`Bạn có chắc chắn muốn xóa tài khoản "${deletingUser?.name}" (${deletingUser?.email})? Hành động này không thể khôi phục.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
