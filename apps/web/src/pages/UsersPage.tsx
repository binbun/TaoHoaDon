import React, { useState } from 'react';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useResetPassword,
  useDeleteUser,
} from '../hooks';
import { User, UserRole, formatDate } from '@taohoadon/shared';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../components/ui/tooltip';
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
  MoreVertical,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { error } = useToast();

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

  // Custom Hooks
  const { data: users = [], isLoading } = useUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const resetPasswordMutation = useResetPassword();
  const deleteMutation = useDeleteUser();

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

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      error('Vui lòng điền đầy đủ họ tên, email và mật khẩu');
      return;
    }

    createMutation.mutate(
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      },
      {
        onSuccess: () => setIsCreateModalOpen(false),
      }
    );
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !name.trim() || !email.trim()) {
      error('Vui lòng điền đầy đủ họ tên và email');
      return;
    }

    updateMutation.mutate(
      {
        id: editingUser.id,
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: isSuperAdmin ? role : undefined,
        },
      },
      {
        onSuccess: () => setEditingUser(null),
      }
    );
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || newPassword.length < 6) {
      error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    resetPasswordMutation.mutate(
      {
        id: resettingUser.id,
        newPassword,
      },
      {
        onSuccess: () => setResettingUser(null),
      }
    );
  };

  const handleDelete = () => {
    if (deletingUser) {
      deleteMutation.mutate(deletingUser.id, {
        onSuccess: () => setDeletingUser(null),
      });
    }
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
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-300/80 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-xs whitespace-nowrap">
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            <span>SUPER ADMIN</span>
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Quản trị viên</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">
            <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Nhân viên</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            Quản Lý Tài Khoản & Phân Quyền ({users.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản trị viên khởi tạo tài khoản nhân viên kinh doanh, phân bổ quyền hạn và bảo mật
          </p>
        </div>
        <Button
          variant="primary"
          className="self-stretch sm:self-auto justify-center"
          leftIcon={<UserPlus className="w-4 h-4" />}
          onClick={handleOpenCreateModal}
        >
          Thêm tài khoản
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3 sm:p-4">
        <div className="w-full sm:w-96">
          <Input
            placeholder="Tìm theo tên hoặc email tài khoản..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftElement={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </Card>

      {/* Users Table with Radix Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ) : filteredUsers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Họ và tên</TableHead>
                <TableHead>Email đăng nhập</TableHead>
                <TableHead className="text-center">Vai trò phân quyền</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u: User) => {
                const isSelf = currentUser?.id === u.id;
                const canEdit = isSuperAdmin || (currentUser?.role === 'ADMIN' && u.role === 'USER') || isSelf;
                const canResetPassword = isSuperAdmin || (currentUser?.role === 'ADMIN' && u.role === 'USER');
                const canDelete = !isSelf && (isSuperAdmin ? u.role !== 'SUPER_ADMIN' : currentUser?.role === 'ADMIN' && u.role === 'USER');

                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200 flex-shrink-0">
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.5 rounded">
                                Bạn
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-slate-700">
                      {u.email}
                    </TableCell>

                    <TableCell className="text-center whitespace-nowrap">
                      {renderRoleBadge(u.role)}
                    </TableCell>

                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(u.createdAt)}
                    </TableCell>

                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {canResetPassword && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleOpenResetPasswordModal(u)}
                                className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors active:scale-95"
                              >
                                <Key className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Đặt lại mật khẩu</TooltipContent>
                          </Tooltip>
                        )}

                        {canEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleOpenEditModal(u)}
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors active:scale-95"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Chỉnh sửa</TooltipContent>
                          </Tooltip>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors active:scale-95">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEdit && (
                              <DropdownMenuItem onClick={() => handleOpenEditModal(u)}>
                                <Edit2 className="w-4 h-4 text-blue-500 mr-2" />
                                <span>Sửa thông tin</span>
                              </DropdownMenuItem>
                            )}
                            {canResetPassword && (
                              <DropdownMenuItem onClick={() => handleOpenResetPasswordModal(u)}>
                                <Key className="w-4 h-4 text-amber-500 mr-2" />
                                <span>Reset mật khẩu</span>
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeletingUser(u)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  <span>Xóa tài khoản</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
        <form onSubmit={handleCreateSubmit} className="space-y-3 sm:space-y-4">
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
              <Select value={role} onValueChange={(val) => setRole(val as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Nhân viên (USER) - Tạo & quản lý báo giá, sản phẩm</SelectItem>
                  <SelectItem value="ADMIN">Quản trị viên (ADMIN) - Quản lý nhân viên & toàn bộ báo giá</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
                  <UserIcon className="w-4 h-4 text-emerald-600" />
                  <span>Quyền hạn: Nhân viên (USER)</span>
                </div>
                <p>Tài khoản Quản trị viên (ADMIN) chỉ có quyền khởi tạo tài khoản cấp Nhân viên.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
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
        <form onSubmit={handleEditSubmit} className="space-y-3 sm:space-y-4">
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
              <Select value={role} onValueChange={(val) => setRole(val as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Nhân viên (USER)</SelectItem>
                  <SelectItem value="ADMIN">Quản trị viên (ADMIN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
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
        <form onSubmit={handleResetPasswordSubmit} className="space-y-3 sm:space-y-4">
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

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
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
        onConfirm={handleDelete}
        title="Xác nhận xóa tài khoản"
        message={`Bạn có chắc chắn muốn xóa tài khoản "${deletingUser?.name}" (${deletingUser?.email})? Hành động này không thể khôi phục.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
