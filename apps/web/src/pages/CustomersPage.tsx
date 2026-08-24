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
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Building,
  Phone,
  Mail,
  MoreVertical,
  MapPin,
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
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-600" />
            Danh Bạ Khách Hàng & Đại Lý ({customers.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
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
            leftElement={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </Card>

      {/* Customers Table with Radix Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ) : customers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Khách hàng / Công ty</TableHead>
                <TableHead>Người đại diện</TableHead>
                <TableHead>Liên hệ</TableHead>
                <TableHead>Địa chỉ</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c: Customer) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span>{c.companyName}</span>
                    </div>
                    {c.taxCode && (
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        MST: {c.taxCode}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-slate-800">
                    {c.contactName || '---'}
                  </TableCell>
                  <TableCell className="text-xs space-y-0.5">
                    {c.phone && (
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
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
                    {!c.phone && !c.email && <span className="text-slate-400">---</span>}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                    {c.address ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{c.address}</span>
                      </div>
                    ) : (
                      '---'
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors active:scale-95"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Chỉnh sửa</TooltipContent>
                      </Tooltip>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors active:scale-95">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(c)}>
                            <Edit2 className="w-4 h-4 text-blue-500 mr-2" />
                            <span>Sửa thông tin</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeletingCustomerId(c.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            <span>Xóa khách hàng</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
