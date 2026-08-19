import React, { useState } from 'react';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '../hooks';
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
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const { error } = useToast();

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

  // Hooks
  const { data: customers = [], isLoading } = useCustomers(search) as any;
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      error('Vui lòng nhập tên công ty / khách hàng');
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
      updateMutation.mutate(
        { id: editingCustomer.id, data: payload },
        { onSuccess: () => setIsModalOpen(false) }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => setIsModalOpen(false),
      });
    }
  };

  const handleDelete = () => {
    if (deletingCustomerId) {
      deleteMutation.mutate(deletingCustomerId, {
        onSuccess: () => setDeletingCustomerId(null),
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Danh Bạ Khách Hàng & Đại Lý</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Quản lý thông tin công ty, liên hệ đại lý và công trình tủ bếp
          </p>
        </div>
        <Button
          variant="primary"
          className="self-stretch sm:self-auto justify-center"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={openCreateModal}
        >
          Thêm khách hàng
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3 sm:p-4">
        <div className="w-full sm:w-96">
          <Input
            placeholder="Tìm theo tên công ty, số điện thoại, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftElement={<Search className="w-4 h-4" />}
          />
        </div>
      </Card>

      {/* Customers Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : customers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[650px] sm:min-w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 sm:px-4">Khách hàng / Công ty</th>
                  <th className="py-3 px-3 sm:px-4">Người đại diện</th>
                  <th className="py-3 px-3 sm:px-4">Liên hệ</th>
                  <th className="py-3 px-3 sm:px-4">Địa chỉ</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c: Customer) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3 sm:px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <Building className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span>{c.companyName}</span>
                      </div>
                      {c.taxCode && (
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          MST: {c.taxCode}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 font-medium text-slate-800">
                      {c.contactName || '---'}
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 text-xs space-y-0.5">
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[150px]">{c.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 text-xs text-slate-600 max-w-xs truncate">
                      {c.address || '---'}
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors active:scale-95"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingCustomerId(c.id)}
                        className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors active:scale-95"
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
            title="Không tìm thấy khách hàng nào"
            description="Hãy thêm khách hàng hoặc đại lý đầu tiên vào hệ thống."
            actionText="Thêm khách hàng mới"
            onAction={openCreateModal}
            icon={<Users className="w-10 h-10" />}
          />
        )}
      </Card>

      {/* Modal Create/Edit Customer */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Chỉnh Sửa Khách Hàng' : 'Thêm Khách Hàng / Đại Lý Mới'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <Input
            label="Tên công ty / Tên khách hàng *"
            placeholder="VD: Cty TNHH Nội Thất Minh Quân"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Người liên hệ đại diện"
              placeholder="VD: Anh Tuấn Anh"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
            <Input
              label="Mã số thuế"
              placeholder="VD: 0108992345"
              value={taxCode}
              onChange={(e) => setTaxCode(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Số điện thoại"
              placeholder="VD: 0988 567 890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="VD: tuananh@homedecor.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Input
            label="Địa chỉ công trình / văn phòng"
            placeholder="VD: Biệt thự BT2-16, KĐT Ngoại Giao Đoàn, Hà Nội"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="mt-6 flex justify-end gap-2.5 pt-4 border-t border-slate-100">
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
        onConfirm={handleDelete}
        title="Xác nhận xóa khách hàng"
        message="Bạn có chắc chắn muốn xóa khách hàng này khỏi hệ thống?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
