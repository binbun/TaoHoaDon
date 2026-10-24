import React, { useMemo, useState } from 'react';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '../hooks';
import { Customer, formatCurrency, formatThousands, getCanChiYear, parseThousands, solarToLunar } from '@taohoadon/shared';
import { useToast } from '../context/ToastContext';
import { useIsManager } from '../context/AuthContext';
import { todayDay } from '../lib/utils';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { CustomerDebtModal } from '../components/CustomerDebtModal';
import { DebtReportExportModal } from '../components/DebtReportExportModal';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Building,
  Phone,
  MoreVertical,
  MapPin,
  Wallet,
  ArrowUpDown,
  FileSpreadsheet,
  CalendarDays,
} from 'lucide-react';

type CustomerSort = 'newest' | 'name-asc' | 'name-desc' | 'debt-desc' | 'debt-asc';

const SORT_OPTIONS: { value: CustomerSort; label: string }[] = [
  { value: 'newest', label: 'Mới thêm gần đây' },
  { value: 'name-asc', label: 'Tên A → Z' },
  { value: 'name-desc', label: 'Tên Z → A' },
  { value: 'debt-desc', label: 'Dư nợ cao → thấp' },
  { value: 'debt-asc', label: 'Dư nợ thấp → cao' },
];

export const CustomersPage: React.FC = () => {
  const { error } = useToast();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<CustomerSort>('newest');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  const [debtCustomer, setDebtCustomer] = useState<Customer | null>(null);
  const [isDebtExportOpen, setIsDebtExportOpen] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [openingDebt, setOpeningDebt] = useState<number | string>(0);

  // Hooks
  const { data: customers = [], isLoading } = useCustomers(search) as any;
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();
  const isManager = useIsManager();

  // Today's date in the lunar calendar, shown next to the search box
  const todayLunar = useMemo(() => {
    const day = todayDay();
    return { solar: day.split('-').reverse().join('/'), lunar: solarToLunar(day) };
  }, []);

  // API returns newest first; other orders are applied client-side
  const sortedCustomers = useMemo(() => {
    const list = [...(customers as Customer[])];
    const debt = (c: Customer) => c.currentDebt ?? 0;
    const byName = (a: Customer, b: Customer) => a.companyName.localeCompare(b.companyName, 'vi', { sensitivity: 'base' });
    switch (sortBy) {
      case 'name-asc':
        return list.sort(byName);
      case 'name-desc':
        return list.sort((a, b) => byName(b, a));
      case 'debt-desc':
        return list.sort((a, b) => debt(b) - debt(a) || byName(a, b));
      case 'debt-asc':
        return list.sort((a, b) => debt(a) - debt(b) || byName(a, b));
      default:
        return list;
    }
  }, [customers, sortBy]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setCompanyName('');
    setPhone('');
    setAddress('');
    setTaxCode('');
    setOpeningDebt(0);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setCompanyName(c.companyName);
    setPhone(c.phone || '');
    setAddress(c.address || '');
    setTaxCode(c.taxCode || '');
    setOpeningDebt(c.openingDebt ?? 0);
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
      phone: phone.trim() || null,
      address: address.trim() || null,
      taxCode: taxCode.trim() || null,
      ...(isManager ? { openingDebt: Number(openingDebt) || 0 } : {}),
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

  const deletingCustomer = (customers as Customer[]).find((c) => c.id === deletingCustomerId);

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
            <Users className="w-6 h-6 text-emerald-600" />
            Danh Bạ Khách Hàng & Đại Lý ({customers.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý thông tin công ty, liên hệ đại lý
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {isManager && (
            <Button
              variant="outline"
              className="justify-center"
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              onClick={() => setIsDebtExportOpen(true)}
            >
              Xuất công nợ
            </Button>
          )}
          <Button
            variant="primary"
            className="justify-center"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openCreateModal}
          >
            Thêm khách hàng
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card bodyClassName="p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Left: search + sort */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-96">
              <Input
                placeholder="Tìm theo tên công ty, số điện thoại, mã số thuế..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftElement={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
            <div className="w-full sm:w-56">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as CustomerSort)}>
                <SelectTrigger aria-label="Sắp xếp khách hàng">
                  <div className="flex items-center gap-2 truncate">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <SelectValue placeholder="Sắp xếp" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right: today in the lunar calendar */}
          <div className="self-start lg:self-auto flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs text-amber-900">
            <CalendarDays className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="leading-tight">
              <div className="font-bold">
                {todayLunar.lunar.day}/{todayLunar.lunar.month}
                {todayLunar.lunar.leap ? ' nhuận' : ''} âm lịch · năm {getCanChiYear(todayLunar.lunar.year)}
              </div>
              <div className="text-[11px] text-amber-700">Hôm nay {todayLunar.solar}</div>
            </div>
          </div>
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
                <TableHead>Số điện thoại</TableHead>
                <TableHead>Địa chỉ</TableHead>
                <TableHead className="text-right">Dư nợ hiện tại</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCustomers.map((c: Customer) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      <Building className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{c.companyName}</span>
                    </div>
                    {c.taxCode && (
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        MST: {c.taxCode}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {c.phone ? (
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{c.phone}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">---</span>
                    )}
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
                    <button
                      type="button"
                      onClick={() => setDebtCustomer(c)}
                      className="text-xs font-bold hover:underline"
                      title="Xem công nợ & thanh toán"
                    >
                      {(c.currentDebt ?? 0) > 0 ? (
                        <span className="text-amber-700">{formatCurrency(c.currentDebt!)}</span>
                      ) : (c.currentDebt ?? 0) < 0 ? (
                        <span className="text-emerald-700">Dư {formatCurrency(-c.currentDebt!)}</span>
                      ) : (
                        <span className="text-slate-400 font-medium">0 ₫</span>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            aria-label="Chỉnh sửa"
                            onClick={() => openEditModal(c)}
                            className="p-2 text-slate-500 hover:text-[#1B9550] hover:bg-emerald-50 rounded-lg transition-colors active:scale-95"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Chỉnh sửa</TooltipContent>
                      </Tooltip>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button aria-label="Thao tác khác" className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors active:scale-95">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDebtCustomer(c)}>
                            <Wallet className="w-4 h-4 text-amber-600 mr-2" />
                            <span>Công nợ & thanh toán</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditModal(c)}>
                            <Edit2 className="w-4 h-4 text-[#1B9550] mr-2" />
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
            label="Tên công ty / Tên khách hàng"
            placeholder="VD: Cty TNHH Nội Thất Minh Quân"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Số điện thoại"
              placeholder="VD: 0988 567 890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Mã số thuế"
              placeholder="VD: 0108992345"
              value={taxCode}
              onChange={(e) => setTaxCode(e.target.value)}
            />
          </div>

          <Input
            label="Địa chỉ giao hàng / văn phòng"
            placeholder="VD: Biệt thự BT2-16, KĐT Ngoại Giao Đoàn, Hà Nội"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          {isManager && (
            <Input
              label="Nợ đầu kỳ (đ)"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formatThousands(openingDebt)}
              onChange={(e) => setOpeningDebt(parseThousands(e.target.value))}
              helperText="Số tiền khách còn nợ từ trước khi dùng phần mềm. Nợ của các đơn hàng và các khoản thanh toán được tự động cộng/trừ, và đơn mới sẽ tự lấy dư nợ hiện tại làm Dư nợ cũ."
            />
          )}

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

      <CustomerDebtModal customer={debtCustomer} onClose={() => setDebtCustomer(null)} />

      <DebtReportExportModal isOpen={isDebtExportOpen} onClose={() => setIsDebtExportOpen(false)} />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingCustomerId}
        onClose={() => setDeletingCustomerId(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa khách hàng"
        message={
          <>
            Bạn có chắc chắn muốn xóa khách hàng{' '}
            <strong className="font-bold text-slate-900">{deletingCustomer?.companyName}</strong> khỏi hệ thống? Thao
            tác này không thể hoàn tác.
          </>
        }
        confirmPhrase={deletingCustomer?.companyName}
        confirmText="Xóa khách hàng"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
