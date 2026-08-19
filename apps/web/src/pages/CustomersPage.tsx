import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Customer } from '@taohoadon/shared';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Building,
  Phone,
  Mail,
  FileText,
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxCode, setTaxCode] = useState('');

  // Fetch Customers
  const { data: customers = [], isLoading } = useQuery<(Customer & { _count?: { quotations: number } })[]>({
    queryKey: ['customers', search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      return apiClient(`/customers?${params.toString()}`);
    },
  });

  const openCreateModal = () => {
    setEditingCustomer(null);
    setCompanyName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setTaxCode('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setCompanyName(c.companyName);
    setContactName(c.contactName || '');
    setEmail(c.email || '');
    setPhone(c.phone || '');
    setAddress(c.address || '');
    setTaxCode(c.taxCode || '');
    setIsModalOpen(true);
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient('/customers', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      success('Thêm mới khách hàng thành công');
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể tạo khách hàng');
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient(`/customers/${id}`, { method: 'PATCH', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      success('Cập nhật thông tin khách hàng thành công');
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể cập nhật khách hàng');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      success('Đã xóa khách hàng');
      setDeletingCustomerId(null);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể xóa khách hàng');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      error('Vui lòng nhập tên công ty hoặc tên khách hàng');
      return;
    }

    const payload = {
      companyName: companyName.trim(),
      contactName: contactName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      taxCode: taxCode.trim() || null,
    };

    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Quản Lý Danh Bạ Khách Hàng</h1>
          <p className="text-sm text-slate-500">Thông tin đối tác, doanh nghiệp và người đại diện nhận báo giá</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={openCreateModal}
        >
          Thêm khách hàng mới
        </Button>
      </div>

      {/* Search Toolbar */}
      <Card className="p-4">
        <div className="max-w-md">
          <Input
            placeholder="Tìm theo tên công ty, MST, người liên hệ, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftElement={<Search className="w-4 h-4" />}
          />
        </div>
      </Card>

      {/* Customers Table */}
      <Card>
        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : customers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Tên công ty / Khách hàng</th>
                  <th className="py-3 px-4">Người liên hệ</th>
                  <th className="py-3 px-4">Liên hệ (SĐT & Email)</th>
                  <th className="py-3 px-4">Mã số thuế</th>
                  <th className="py-3 px-4 text-center">Báo giá</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <Building className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{c.companyName}</span>
                      </div>
                      {c.address && (
                        <div className="text-xs text-slate-500 mt-0.5 max-w-sm truncate">
                          {c.address}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {c.contactName || '---'}
                    </td>
                    <td className="py-3.5 px-4 text-xs space-y-1">
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                      {c.taxCode || '---'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                        <FileText className="w-3 h-3" />
                        {c._count?.quotations ?? 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingCustomerId(c.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Chưa có thông tin khách hàng"
            description="Hãy thêm khách hàng mới để bắt đầu tạo báo giá và gửi cho đối tác."
            actionText="Thêm khách hàng đầu tiên"
            onAction={openCreateModal}
            icon={<Users className="w-10 h-10" />}
          />
        )}
      </Card>

      {/* Modal Create/Edit Customer */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Chỉnh Sửa Thông Tin Khách Hàng' : 'Thêm Khách Hàng Mới'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tên Công Ty / Doanh Nghiệp"
            placeholder="VD: Công ty Cổ phần Công nghệ ABC"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Người liên hệ đại diện"
              placeholder="VD: Nguyễn Văn A"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
            <Input
              label="Mã số thuế (MST)"
              placeholder="VD: 0108999999"
              value={taxCode}
              onChange={(e) => setTaxCode(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Số điện thoại"
              placeholder="VD: 0900000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Địa chỉ Email"
              type="email"
              placeholder="VD: contact@abc.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Input
            label="Địa chỉ trụ sở / văn phòng"
            placeholder="VD: Tòa nhà Innovation, Cầu Giấy, Hà Nội"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingCustomer ? 'Lưu thay đổi' : 'Tạo khách hàng'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingCustomerId}
        onClose={() => setDeletingCustomerId(null)}
        onConfirm={() => deletingCustomerId && deleteMutation.mutate(deletingCustomerId)}
        title="Xác nhận xóa khách hàng"
        message="Bạn có chắc chắn muốn xóa khách hàng này? Nếu khách hàng đang có báo giá trong hệ thống, hệ thống sẽ ngăn việc xóa."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
