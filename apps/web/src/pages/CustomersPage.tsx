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
  FileText,
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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Danh Sách Khách Hàng & Đại Lý</h1>
          <p className="text-sm text-slate-500">
            Quản lý thông tin doanh nghiệp, đại lý cấp 1/2 và các xưởng sản xuất tủ bếp đối tác
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={openCreateModal}
        >
          Thêm khách hàng mới
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="w-full md:w-96">
          <Input
            placeholder="Tìm theo tên công ty, người liên hệ, SĐT, MST..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftElement={<Search className="w-4 h-4" />}
          />
        </div>
      </Card>

      {/* Customers Table */}
      <Card>
        {isLoading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : customers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Tên Khách Hàng / Công Ty</th>
                  <th className="py-3 px-4">Người liên hệ</th>
                  <th className="py-3 px-4">Thông tin liên lạc</th>
                  <th className="py-3 px-4 text-center">Số báo giá</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((cust: any) => (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <Building className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span>{cust.companyName}</span>
                      </div>
                      {cust.taxCode && (
                        <div className="text-xs text-slate-400 mt-0.5 font-mono">
                          MST: {cust.taxCode}
                        </div>
                      )}
                      {cust.address && (
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-sm">
                          {cust.address}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {cust.contactName || '---'}
                    </td>

                    <td className="py-3.5 px-4 space-y-1">
                      {cust.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cust.phone}</span>
                        </div>
                      )}
                      {cust.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono">{cust.email}</span>
                        </div>
                      )}
                      {!cust.phone && !cust.email && <span className="text-slate-400 text-xs">---</span>}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{cust._count?.quotations || 0}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(cust)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingCustomerId(cust.id)}
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
            title="Không tìm thấy khách hàng nào"
            description="Hãy tạo khách hàng mới để quản lý thông tin và gửi báo giá."
            actionText="Tạo khách hàng đầu tiên"
            onAction={openCreateModal}
            icon={<Users className="w-10 h-10" />}
          />
        )}
      </Card>

      {/* Modal Create/Edit Customer */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Chỉnh Sửa Khách Hàng / Đại Lý' : 'Thêm Khách Hàng / Đại Lý Mới'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tên Khách Hàng / Công Ty / Đại Lý"
            placeholder="VD: Xưởng Tủ Bếp & Nội Thất Mộc Gia"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Người liên hệ đại diện"
              placeholder="VD: Anh Vũ Đình Thắng"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
            <Input
              label="Mã số thuế"
              placeholder="VD: 0108668899"
              value={taxCode}
              onChange={(e) => setTaxCode(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Số điện thoại"
              placeholder="VD: 0988 567 890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Email nhận báo giá"
              type="email"
              placeholder="VD: noithatmocgia@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Input
            label="Địa chỉ giao hàng / công trình"
            placeholder="VD: Thôn 1, xã Thạch Thất, Hà Nội"
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
        onConfirm={handleDelete}
        title="Xác nhận xóa khách hàng"
        message="Bạn có chắc chắn muốn xóa khách hàng này? Nếu khách hàng đã có báo giá, hệ thống sẽ bảo vệ dữ liệu lịch sử."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
